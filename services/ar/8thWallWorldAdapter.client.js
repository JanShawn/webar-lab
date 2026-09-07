const SCRIPT_TIMEOUT_MS = 20000
const CAMERA_TIMEOUT_MS = 30000

const vendorScripts = [
  {
    id: 'webar-lab-xr8',
    src: 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1.0.0/dist/xr.js',
    globalName: 'XR8',
    eventName: 'xrloaded',
    attributes: {'data-preload-chunks': 'slam'},
  },
  {
    id: 'webar-lab-xrextras',
    src: 'https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1.0.0/dist/xrextras.js',
    globalName: 'XRExtras',
    eventName: 'xrextrasloaded',
  },
  {
    id: 'webar-lab-landing-page',
    src: 'https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1.0.0/dist/landing-page.js',
    globalName: 'LandingPage',
    eventName: 'landingpageloaded',
  },
]

// 8th Wall 以瀏覽器 global 和自訂 ready event 提供 API。
// 同時監聽 event 與輪詢 global，可處理 script 已快取、事件較早觸發等載入順序差異。
const waitForGlobal = ({globalName, eventName, timeoutMs = SCRIPT_TIMEOUT_MS}) => new Promise((resolve, reject) => {
  if (window[globalName]) {
    resolve(window[globalName])
    return
  }

  const timeout = window.setTimeout(() => {
    cleanup()
    reject(new Error(`載入 ${globalName} 逾時`))
  }, timeoutMs)

  const handleReady = () => {
    if (!window[globalName]) return
    cleanup()
    resolve(window[globalName])
  }

  const cleanup = () => {
    window.clearTimeout(timeout)
    if (eventName) window.removeEventListener(eventName, handleReady)
  }

  if (eventName) window.addEventListener(eventName, handleReady)
  const poll = window.setInterval(() => {
    if (!window[globalName]) return
    window.clearInterval(poll)
    handleReady()
  }, 50)

  window.setTimeout(() => window.clearInterval(poll), timeoutMs)
})

const loadScript = async (definition) => {
  if (window[definition.globalName]) return window[definition.globalName]

  const ready = waitForGlobal(definition)
  let script = document.getElementById(definition.id)

  if (!script) {
    script = document.createElement('script')
    script.id = definition.id
    script.src = definition.src
    script.async = definition.globalName === 'XR8'
    script.crossOrigin = 'anonymous'
    Object.entries(definition.attributes || {}).forEach(([name, value]) => script.setAttribute(name, value))
    script.addEventListener('error', () => {
      script.dataset.failed = 'true'
    }, {once: true})
    document.head.appendChild(script)
  }

  if (script.dataset.failed === 'true') {
    throw new Error(`無法下載 ${definition.globalName}`)
  }

  return ready
}

const explainIncompatibility = (reasons = []) => {
  const reasonText = reasons.join(' ').toUpperCase()
  if (reasonText.includes('DEVICE')) return '目前裝置不支援此空間追蹤體驗，請改用手機開啟。'
  if (reasonText.includes('BROWSER')) return '目前瀏覽器不支援 WebAR，請改用 Safari 或 Chrome。'
  if (reasonText.includes('CAMERA')) return '找不到可用的相機，請確認裝置與瀏覽器權限。'
  return '目前裝置或瀏覽器不支援此 WebAR 體驗。'
}

/**
 * @typedef {Object} WorldArAdapter
 * @property {() => Promise<void>} load
 * @property {() => {compatible: boolean, code: string, message: string, reasons: string[]}} checkCompatibility
 * @property {(canvas: HTMLCanvasElement, pipelineModules?: Object[]) => Promise<void>} start
 * @property {() => void} recenter
 * @property {(handler: Function) => Function} subscribeTracking
 * @property {() => void} pause
 * @property {() => void} resume
 * @property {() => Promise<void>} stop
 */

/** @returns {WorldArAdapter} */
export const create8thWallWorldAdapter = () => {
  const trackingSubscribers = new Set()
  let installedModules = []
  let mediaStream = null
  let cameraReadyResolve = null
  let cameraReadyReject = null
  let cameraTimeout = null
  let running = false
  let lastTrackingKey = ''

  const emitTracking = ({status = 'UNAVAILABLE', reason = ''}) => {
    const key = `${status}:${reason}`
    if (key === lastTrackingKey) return
    lastTrackingKey = key
    trackingSubscribers.forEach((handler) => handler({status, reason}))
  }

  const settleCamera = (type, value) => {
    if (cameraTimeout) window.clearTimeout(cameraTimeout)
    cameraTimeout = null
    if (type === 'resolve') cameraReadyResolve?.(value)
    else cameraReadyReject?.(value)
    cameraReadyResolve = null
    cameraReadyReject = null
  }

  // 將 XR8 lifecycle 轉成平台自己的 tracking 訂閱介面。
  // 因此 Vue、Pinia 和遊戲場景都不需要直接知道 XR8 event 的格式。
  const lifecycleModule = {
    name: 'webar-lab-lifecycle',
    listeners: [
      {
        event: 'reality.trackingstatus',
        process: ({detail}) => emitTracking({
          status: detail?.status,
          reason: detail?.reason,
        }),
      },
    ],
    onCameraStatusChange: ({status}) => {
      if (status === 'hasVideo') settleCamera('resolve')
      if (status === 'failed') {
        settleCamera('reject', Object.assign(new Error('相機啟動失敗'), {code: 'CAMERA_FAILED'}))
      }
    },
    onAttach: ({stream}) => {
      mediaStream = stream || null
    },
    onUpdate: ({processCpuResult}) => {
      const reality = processCpuResult?.reality
      if (reality?.trackingStatus) {
        emitTracking({status: reality.trackingStatus, reason: reality.trackingReason})
      }
    },
    onException: (error) => {
      settleCamera('reject', Object.assign(error || new Error('XR 執行錯誤'), {code: 'XR_RUNTIME_ERROR'}))
    },
  }

  return {
    async load() {
      // XR8 Three.js pipeline 會從 window.THREE 取得同一份 Three.js runtime。
      if (!window.THREE) throw Object.assign(new Error('Three.js 尚未初始化'), {code: 'THREE_MISSING'})
      await loadScript(vendorScripts[0])
      await Promise.all(vendorScripts.slice(1).map(loadScript))
    },

    checkCompatibility() {
      if (!window.isSecureContext) {
        return {
          compatible: false,
          code: 'HTTPS_REQUIRED',
          message: 'WebAR 需要 HTTPS 安全連線才能開啟相機。',
          reasons: ['HTTPS_REQUIRED'],
        }
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        return {
          compatible: false,
          code: 'CAMERA_API_MISSING',
          message: '這個瀏覽器沒有提供相機存取能力。',
          reasons: ['CAMERA_API_MISSING'],
        }
      }

      const {XR8} = window
      if (!XR8?.XrDevice) {
        return {
          compatible: false,
          code: 'ENGINE_UNAVAILABLE',
          message: 'AR 引擎尚未完成載入，請檢查網路後重試。',
          reasons: ['ENGINE_UNAVAILABLE'],
        }
      }

      const allowedDevices = XR8.XrConfig.device().MOBILE
      const compatible = XR8.XrDevice.isDeviceBrowserCompatible({allowedDevices})
      const reasons = compatible ? [] : XR8.XrDevice.incompatibleReasons({allowedDevices}) || []

      return {
        compatible,
        code: compatible ? 'OK' : 'UNSUPPORTED_DEVICE',
        message: compatible ? '' : explainIncompatibility(reasons),
        reasons,
      }
    },

    async start(canvas, pipelineModules = []) {
      if (running) return
      const {XR8, XRExtras, LandingPage} = window
      if (!XR8 || !XRExtras || !LandingPage) {
        throw Object.assign(new Error('AR 引擎尚未完成載入'), {code: 'ENGINE_UNAVAILABLE'})
      }

      XR8.XrController.configure({
        disableWorldTracking: false,
        enableLighting: true,
        scale: 'absolute',
      })

      // Pipeline 順序很重要：先把相機影像畫到 GL texture，再更新 Three.js 與 SLAM，
      // 最後才執行我們自己的場景與 lifecycle modules。
      installedModules = [
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        XR8.XrController.pipelineModule(),
        LandingPage.pipelineModule(),
        XRExtras.FullWindowCanvas.pipelineModule(),
        XRExtras.RuntimeError.pipelineModule(),
        lifecycleModule,
        ...pipelineModules,
      ]

      XR8.addCameraPipelineModules(installedModules)
      running = true

      const ready = new Promise((resolve, reject) => {
        cameraReadyResolve = resolve
        cameraReadyReject = reject
        cameraTimeout = window.setTimeout(() => {
          settleCamera('reject', Object.assign(new Error('等待相機回應逾時'), {code: 'CAMERA_TIMEOUT'}))
        }, CAMERA_TIMEOUT_MS)
      })

      try {
        XR8.run({canvas, allowedDevices: XR8.XrConfig.device().MOBILE})
        await ready
      } catch (error) {
        running = false
        throw error
      }
    },

    recenter() {
      window.XR8?.XrController?.recenter?.()
    },

    subscribeTracking(handler) {
      trackingSubscribers.add(handler)
      return () => trackingSubscribers.delete(handler)
    },

    pause() {
      if (running) window.XR8?.pause?.()
    },

    resume() {
      if (running) window.XR8?.resume?.()
    },

    async stop() {
      if (cameraTimeout) window.clearTimeout(cameraTimeout)
      cameraTimeout = null

      try {
        await window.XR8?.stop?.()
      } finally {
        // stop() 失敗時仍主動停止 MediaStream track，確保離開 route 後相機指示燈會關閉。
        mediaStream?.getTracks?.().forEach((track) => track.stop())
        mediaStream = null
        if (installedModules.length) {
          window.XR8?.removeCameraPipelineModules?.(installedModules)
        }
        installedModules = []
        running = false
        lastTrackingKey = ''
        emitTracking({status: 'UNAVAILABLE', reason: ''})
      }
    },
  }
}
