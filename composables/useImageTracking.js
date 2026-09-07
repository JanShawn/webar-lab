/**
 * [共用核心｜通常不改]
 * 把 provider 的圖片事件整理成 Vue 可讀的 status 與 target。
 * 這裡只懂 found/updated/lost，不知道 XR8 原始資料格式。
 */
import {getCurrentScope, onScopeDispose, readonly, ref, shallowRef} from 'vue'

const createSubscriberSet = () => {
  const subscribers = new Set()
  return {
    emit: (target) => subscribers.forEach((subscriber) => subscriber(target)),
    subscribe: (subscriber) => {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
  }
}

/**
 * 只處理共用 target 格式；這裡不認識 XR8 的 event detail。
 */
export const useImageTracking = ({targetName} = {}) => {
  const status = ref('idle')
  const target = shallowRef(null)
  const foundEvents = createSubscriberSet()
  const updatedEvents = createSubscriberSet()
  const lostEvents = createSubscriberSet()
  let providerUnsubscribers = []

  const matchesTarget = (nextTarget) => !targetName || nextTarget?.name === targetName

  const disconnect = () => {
    providerUnsubscribers.forEach((unsubscribe) => unsubscribe())
    providerUnsubscribers = []
  }

  const connect = (provider) => {
    disconnect()
    status.value = 'scanning'
    providerUnsubscribers = [
      provider.onImageFound((nextTarget) => {
        // found：target 第一次進入鏡頭並被辨識。
        if (!matchesTarget(nextTarget)) return
        target.value = nextTarget
        status.value = 'found'
        foundEvents.emit(nextTarget)
      }),
      provider.onImageUpdated((nextTarget) => {
        // updated：tracking 期間持續收到新 pose，模型才能跟著圖片移動。
        if (!matchesTarget(nextTarget)) return
        target.value = nextTarget
        status.value = 'tracking'
        updatedEvents.emit(nextTarget)
      }),
      provider.onImageLost((nextTarget) => {
        // lost：引擎暫時看不到 target；具體顯示行為由 POC 決定。
        if (!matchesTarget(nextTarget)) return
        target.value = nextTarget
        status.value = 'lost'
        lostEvents.emit(nextTarget)
      }),
    ]
  }

  const reset = () => {
    target.value = null
    status.value = 'idle'
  }

  if (getCurrentScope()) onScopeDispose(disconnect)

  return {
    status: readonly(status),
    target: readonly(target),
    connect,
    disconnect,
    reset,
    onTargetFound: foundEvents.subscribe,
    onTargetUpdated: updatedEvents.subscribe,
    onTargetLost: lostEvents.subscribe,
  }
}
