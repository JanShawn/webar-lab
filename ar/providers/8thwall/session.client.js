/**
 * [8th Wall 邊界｜換 provider 才改]
 * 這個檔案負責載入 XR8、啟動/停止相機、安裝 pipeline 與處理裝置相容性。
 * 一般素材與互動客製不需要修改這裡。
 */
import {createARError} from '../../core/errors'
import {createTrackingPose} from '../../core/trackingTypes'
import {createXrControllerConfiguration} from './configuration'
import {create8thWallImageTrackingModule, load8thWallImageTargetData} from './imageTracking.client'
import {load8thWallScript} from './scriptLoader.client'

const CAMERA_TIMEOUT_MS = 30000

const createEventChannel = () => {
  const subscribers = new Set()
  return {
    emit: (payload) => subscribers.forEach((subscriber) => subscriber(payload)),
    subscribe: (subscriber) => {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
  }
}

const explainIncompatibility = (reasons = []) => {
  const reasonText = reasons.join(' ').toUpperCase()
  if (reasonText.includes('DEVICE')) return '目前裝置不支援 WebAR，請改用手機開啟。'
  if (reasonText.includes('BROWSER')) return '目前瀏覽器不支援 WebAR，請改用 Safari 或 Chrome。'
  if (reasonText.includes('CAMERA')) return '找不到可用的相機，請確認裝置與瀏覽器權限。'
  return '目前裝置或瀏覽器不支援這個 WebAR 體驗。'
}

/**
 * 這是唯一可以直接操作 XR8 session 的檔案。
 * Vue、體驗邏輯與 Three.js content layer 只能使用回傳的共用介面。
 */
export const create8thWallSession = ({
  mode,
  three,
  scriptUrls = {},
  imageTargetData = [],
  imageTargets = [],
}) => {
  const scripts = scriptUrls
  const channels = {
    ready: createEventChannel(),
    error: createEventChannel(),
    tracking: createEventChannel(),
    imageFound: createEventChannel(),
    imageUpdated: createEventChannel(),
    imageLost: createEventChannel(),
    surfaceFound: createEventChannel(),
    placementUpdated: createEventChannel(),
    frame: createEventChannel(),
  }

  let running = false
  let installedModules = []
  let mediaStream = null
  let renderContext = null
  let cameraPose = null
  let startResolve = null
  let startReject = null
  let cameraReady = false
  let startTimeout = null
  let previousFrameAt = null
  let resolvedImageTargetData = imageTargetData

  const settleStart = (error = null) => {
    if (error) {
      if (startTimeout) window.clearTimeout(startTimeout)
      startTimeout = null
      startReject?.(error)
      startResolve = null
      startReject = null
      return
    }

    if (!cameraReady || !renderContext || !startResolve) return
    if (startTimeout) window.clearTimeout(startTimeout)
    startTimeout = null
    const resolve = startResolve
    startResolve = null
    startReject = null
    const payload = {renderContext}
    channels.ready.emit(payload)
    resolve(payload)
  }

  const emitRuntimeError = (error) => {
    const arError = error?.name === 'ARError'
      ? error
      : createARError(error?.code || 'AR_INITIALIZATION_FAILED', error)
    channels.error.emit(arError)
    settleStart(arError)
  }

  const lifecycleModule = {
    name: 'webar-lab-core-lifecycle',
    listeners: [
      {
        event: 'reality.trackingstatus',
        process: ({detail}) => channels.tracking.emit({
          status: detail?.status || 'UNAVAILABLE',
          reason: detail?.reason || '',
        }),
      },
    ],
    onCameraStatusChange: ({status}) => {
      if (status === 'hasVideo') {
        cameraReady = true
        settleStart()
      }
      if (status === 'failed') emitRuntimeError(createARError('CAMERA_FAILED'))
    },
    onAttach: ({stream}) => {
      mediaStream = stream || null
    },
    onStart: () => {
      const xrScene = window.XR8?.Threejs?.xrScene?.()
      if (!xrScene?.scene || !xrScene?.camera || !xrScene?.renderer) {
        emitRuntimeError(createARError('AR_INITIALIZATION_FAILED'))
        return
      }
      renderContext = xrScene
      settleStart()
    },
    onUpdate: ({processCpuResult}) => {
      const now = performance.now()
      const reality = processCpuResult?.reality
      if (reality?.position && reality?.rotation) {
        cameraPose = createTrackingPose({
          position: reality.position,
          rotation: reality.rotation,
          raw: reality,
        })
      }
      channels.frame.emit({
        deltaSeconds: previousFrameAt ? Math.min((now - previousFrameAt) / 1000, 0.1) : 0,
        cameraPose,
      })
      previousFrameAt = now
    },
    onException: emitRuntimeError,
  }

  return {
    async load() {
      if (!three) throw createARError('WEBGL_UNAVAILABLE')

      // Provider 核心 1：先載入圖片特徵資料，再載入固定版本的 8th Wall scripts。
      if (mode === 'image' && !resolvedImageTargetData.length && imageTargets.length) {
        resolvedImageTargetData = await Promise.all(imageTargets.map(load8thWallImageTargetData))
      }

      // XR8 Three.js integration 需要同一份 Three runtime；global 僅在 provider 內設定。
      window.THREE = three
      await load8thWallScript({
        id: 'webar-lab-xr8',
        src: scripts.engine,
        globalName: 'XR8',
        eventName: 'xrloaded',
        attributes: {'data-preload-chunks': 'slam'},
      })
      await Promise.all([
        load8thWallScript({
          id: 'webar-lab-xrextras',
          src: scripts.extras,
          globalName: 'XRExtras',
          eventName: 'xrextrasloaded',
        }),
        load8thWallScript({
          id: 'webar-lab-landing-page',
          src: scripts.landingPage,
          globalName: 'LandingPage',
          eventName: 'landingpageloaded',
        }),
      ])
    },

    isSupported() {
      if (!window.isSecureContext) {
        return {supported: false, code: 'HTTPS_REQUIRED', message: 'WebAR 需要 HTTPS 安全連線才能開啟相機。'}
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        return {supported: false, code: 'CAMERA_API_MISSING', message: '這個瀏覽器無法存取相機。'}
      }

      const {XR8} = window
      if (!XR8?.XrDevice) {
        return {supported: false, code: 'ENGINE_UNAVAILABLE', message: 'AR 引擎尚未完成載入。'}
      }

      const allowedDevices = XR8.XrConfig.device().MOBILE
      const supported = XR8.XrDevice.isDeviceBrowserCompatible({allowedDevices})
      const reasons = supported ? [] : XR8.XrDevice.incompatibleReasons({allowedDevices}) || []
      return {
        supported,
        code: supported ? 'OK' : 'UNSUPPORTED_DEVICE',
        message: supported ? '' : explainIncompatibility(reasons),
        reasons,
      }
    },

    async start(canvas, {pipelineModules = []} = {}) {
      if (running) return {renderContext}
      if (!canvas) throw createARError('AR_INITIALIZATION_FAILED', null, '找不到 AR canvas。')

      const {XR8, XRExtras, LandingPage} = window
      if (!XR8 || !XRExtras || !LandingPage) throw createARError('ENGINE_UNAVAILABLE')

      // Provider 核心 2：只有這個資料夾可以知道 XR8 的 configure 格式。
      const xrConfiguration = createXrControllerConfiguration(mode)
      if (mode === 'image') xrConfiguration.imageTargetData = resolvedImageTargetData
      XR8.XrController.configure(xrConfiguration)

      const imageTrackingModule = mode === 'image'
        ? create8thWallImageTrackingModule({
            onFound: channels.imageFound.emit,
            onUpdated: channels.imageUpdated.emit,
            onLost: channels.imageLost.emit,
          })
        : null

      // Provider 核心 3：pipeline 安裝順序屬於 8th Wall 細節，上層不應複製。
      installedModules = [
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        XR8.XrController.pipelineModule(),
        LandingPage.pipelineModule(),
        XRExtras.FullWindowCanvas.pipelineModule(),
        XRExtras.RuntimeError.pipelineModule(),
        lifecycleModule,
        ...(imageTrackingModule ? [imageTrackingModule] : []),
        ...pipelineModules,
      ]
      XR8.addCameraPipelineModules(installedModules)
      running = true

      const ready = new Promise((resolve, reject) => {
        startResolve = resolve
        startReject = reject
        startTimeout = window.setTimeout(() => settleStart(createARError('CAMERA_TIMEOUT')), CAMERA_TIMEOUT_MS)
      })

      try {
        XR8.run({canvas, allowedDevices: XR8.XrConfig.device().MOBILE})
        return await ready
      } catch (error) {
        running = false
        throw error
      }
    },

    pause() {
      if (running) window.XR8?.pause?.()
    },

    resume() {
      if (running) window.XR8?.resume?.()
    },

    getCameraPose: () => cameraPose,
    getWorldPose: () => cameraPose,
    getRenderContext: () => renderContext,

    hitTest(x, y, includedTypes = []) {
      const hits = window.XR8?.XrController?.hitTest?.(x, y, includedTypes) || []
      return hits.map((hit) => ({
        type: hit.type,
        distance: hit.distance,
        ...createTrackingPose({position: hit.position, rotation: hit.rotation, raw: hit}),
      }))
    },

    recenter() {
      window.XR8?.XrController?.recenter?.()
    },

    onReady: channels.ready.subscribe,
    onError: channels.error.subscribe,
    onTrackingChanged: channels.tracking.subscribe,
    onImageFound: channels.imageFound.subscribe,
    onImageUpdated: channels.imageUpdated.subscribe,
    onImageLost: channels.imageLost.subscribe,
    onSurfaceFound: channels.surfaceFound.subscribe,
    onPlacementUpdated: channels.placementUpdated.subscribe,
    onFrame: channels.frame.subscribe,

    async stop() {
      if (startTimeout) window.clearTimeout(startTimeout)
      startTimeout = null
      startResolve = null
      startReject = null

      try {
        if (running) await window.XR8?.stop?.()
      } finally {
        // Provider 核心 4：XR8.stop 之外仍主動停止 MediaStream，避免離頁後相機繼續亮。
        mediaStream?.getTracks?.().forEach((track) => track.stop())
        mediaStream = null
        if (installedModules.length) window.XR8?.removeCameraPipelineModules?.(installedModules)
        installedModules = []
        renderContext = null
        cameraPose = null
        cameraReady = false
        previousFrameAt = null
        running = false
      }
    },
  }
}
