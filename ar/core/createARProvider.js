const REQUIRED_METHODS = [
  'load',
  'start',
  'stop',
  'pause',
  'resume',
  'isSupported',
  'getCameraPose',
  'onReady',
  'onError',
  'onImageFound',
  'onImageUpdated',
  'onImageLost',
  'onSurfaceFound',
  'onPlacementUpdated',
]

/**
 * JavaScript 沒有 interface，因此在 provider 建立時立即驗證 contract。
 * 未來新增 MindAR / WebXR provider 時，也必須通過同一個檢查。
 */
export const createARProvider = (provider) => {
  if (!provider || typeof provider !== 'object') {
    throw new TypeError('AR provider 必須是一個 object')
  }

  const missingMethods = REQUIRED_METHODS.filter((method) => typeof provider[method] !== 'function')
  if (missingMethods.length) {
    throw new TypeError(`AR provider 缺少方法：${missingMethods.join(', ')}`)
  }

  return provider
}

