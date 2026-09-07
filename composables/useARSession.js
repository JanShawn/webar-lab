/**
 * [共用核心｜通常不改]
 * Vue 的 AR session 管理器：統一 loading/error 狀態，並負責 start、pause、resume、stop。
 * 不論未來使用 8th Wall、MindAR 或 WebXR，頁面都應先透過這一層。
 */
import {computed, getCurrentScope, onScopeDispose, readonly, ref, shallowRef} from 'vue'
import {getARUserMessage, toARError} from '~/ar/core/errors'
import {AR_MODES, AR_SESSION_STATUS} from '~/ar/core/trackingTypes'

/**
 * Vue 頁面只透過這個 composable 管理 AR lifecycle，不直接接觸 XR8。
 */
export const useARSession = ({providerFactory, sceneFactory} = {}) => {
  const runtimeConfig = useRuntimeConfig()
  const status = ref(AR_SESSION_STATUS.IDLE)
  const error = shallowRef(null)
  const trackingStatus = ref('UNAVAILABLE')
  const trackingReason = ref('')
  const sceneRuntime = shallowRef(null)
  const errorMessage = computed(() => getARUserMessage(error.value))

  let provider = null
  let cleanupPromise = null
  let unsubscribeProviderEvents = []

  const pause = () => provider?.pause()
  const resume = () => provider?.resume()

  const handleVisibilityChange = () => {
    if (document.hidden) pause()
    else resume()
  }

  const removeVisibilityListener = () => {
    if (import.meta.client) document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  const stop = async () => {
    if (cleanupPromise) return cleanupPromise

    cleanupPromise = (async () => {
      removeVisibilityListener()
      unsubscribeProviderEvents.forEach((unsubscribe) => unsubscribe())
      unsubscribeProviderEvents = []

      // 先清掉我們建立的模型與材質，再停止擁有 renderer / camera 的 provider。
      sceneRuntime.value?.dispose?.()
      sceneRuntime.value = null

      try {
        await provider?.stop?.()
      } finally {
        provider = null
        trackingStatus.value = 'UNAVAILABLE'
        trackingReason.value = ''
        status.value = AR_SESSION_STATUS.IDLE
        cleanupPromise = null
      }
    })()

    return cleanupPromise
  }

  const start = async ({
    canvas,
    mode = AR_MODES.WORLD,
    providerOptions = {},
    sceneOptions = {},
    configureProvider,
  } = {}) => {
    await stop()
    error.value = null

    if (!import.meta.client) {
      error.value = toARError({code: 'UNSUPPORTED_DEVICE'})
      status.value = AR_SESSION_STATUS.UNSUPPORTED
      return null
    }

    try {
      // 共用核心 1：動態 import，確保首頁與 SSR 不會提早載入 Three.js / XR8。
      status.value = AR_SESSION_STATUS.LOADING
      const THREE = await import('three')
      const resolvedProviderFactory = providerFactory
        || (await import('~/ar/providers/8thwall/index.client')).create8thWallProvider
      const defaultScriptUrls = providerFactory ? {} : {
        engine: runtimeConfig.public.ar.engineUrl,
        extras: runtimeConfig.public.ar.extrasUrl,
        landingPage: runtimeConfig.public.ar.landingPageUrl,
      }
      provider = resolvedProviderFactory({
        mode,
        three: THREE,
        ...providerOptions,
        scriptUrls: {...defaultScriptUrls, ...providerOptions.scriptUrls},
      })
      configureProvider?.(provider)

      // 共用核心 2：Vue 只訂閱標準事件，不碰 XR8 原始 event。
      unsubscribeProviderEvents = [
        provider.onError((providerError) => {
          console.error('[WebAR provider]', providerError)
          error.value = toARError(providerError)
          status.value = AR_SESSION_STATUS.ERROR
        }),
        provider.onTrackingChanged?.(({status: nextStatus, reason}) => {
          trackingStatus.value = nextStatus
          trackingReason.value = reason
          if (nextStatus === 'NORMAL' && status.value === AR_SESSION_STATUS.READY) {
            status.value = AR_SESSION_STATUS.TRACKING
          }
        }),
      ].filter(Boolean)

      await provider.load()
      const compatibility = provider.isSupported()
      if (!compatibility.supported) {
        error.value = toARError({code: compatibility.code, message: compatibility.message})
        status.value = AR_SESSION_STATUS.UNSUPPORTED
        await provider.stop()
        provider = null
        return null
      }

      status.value = AR_SESSION_STATUS.REQUESTING_PERMISSION
      // 共用核心 3：真正的相機權限與 XR 啟動由 provider 處理。
      const {renderContext} = await provider.start(canvas)
      status.value = AR_SESSION_STATUS.INITIALIZING

      const resolvedSceneFactory = sceneFactory || (await import('~/3d/createScene.client')).createScene
      // 共用核心 4：provider 交出 scene/camera/renderer，3D layer 再建立自己的內容。
      sceneRuntime.value = resolvedSceneFactory({renderContext, ...sceneOptions})
      status.value = trackingStatus.value === 'NORMAL'
        ? AR_SESSION_STATUS.TRACKING
        : AR_SESSION_STATUS.READY

      document.addEventListener('visibilitychange', handleVisibilityChange)
      return {provider, scene: sceneRuntime.value}
    } catch (sourceError) {
      console.error('[WebAR session]', sourceError)
      error.value = toARError(sourceError)
      status.value = AR_SESSION_STATUS.ERROR
      try {
        await provider?.stop?.()
      } catch {
        // 保留原始初始化錯誤；停止失敗不應蓋掉它。
      }
      provider = null
      unsubscribeProviderEvents.forEach((unsubscribe) => unsubscribe())
      unsubscribeProviderEvents = []
      return null
    }
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return {
    status: readonly(status),
    error: readonly(error),
    errorMessage,
    trackingStatus: readonly(trackingStatus),
    trackingReason: readonly(trackingReason),
    sceneRuntime: readonly(sceneRuntime),
    start,
    stop,
    pause,
    resume,
    getProvider: () => provider,
  }
}
