const USER_MESSAGES = {
  HTTPS_REQUIRED: 'WebAR 需要 HTTPS 安全連線才能開啟相機。',
  CAMERA_API_MISSING: '這個瀏覽器無法存取相機。',
  CAMERA_DENIED: '需要相機權限才能開始，請在瀏覽器設定中允許相機。',
  CAMERA_FAILED: '相機啟動失敗，請確認沒有其他程式正在使用相機。',
  CAMERA_TIMEOUT: '等待相機回應逾時，請重新整理後再試一次。',
  ENGINE_LOAD_FAILED: 'AR 引擎載入失敗，請檢查網路後重試。',
  ENGINE_UNAVAILABLE: 'AR 引擎尚未準備完成，請稍後重試。',
  UNSUPPORTED_DEVICE: '目前裝置或瀏覽器不支援這個 WebAR 體驗。',
  WEBGL_UNAVAILABLE: '目前瀏覽器無法建立 3D 畫面。',
  IMAGE_TARGET_UNAVAILABLE: '圖片辨識資料載入失敗，請檢查網路後重試。',
  MODEL_LOAD_FAILED: '3D 模型載入失敗，請重新整理後再試一次。',
  AR_INITIALIZATION_FAILED: 'WebAR 初始化失敗，請重新整理後再試一次。',
}

export const createARError = (code, cause = null, fallbackMessage = '') => {
  const error = new Error(USER_MESSAGES[code] || fallbackMessage || USER_MESSAGES.AR_INITIALIZATION_FAILED)
  error.name = 'ARError'
  error.code = code
  error.cause = cause
  return error
}

export const toARError = (error, fallbackCode = 'AR_INITIALIZATION_FAILED') => {
  if (error?.name === 'ARError') return error

  const sourceName = error?.name || ''
  const sourceMessage = error?.message || ''
  const permissionDenied = sourceName === 'NotAllowedError' || /permission|denied/i.test(sourceMessage)
  const code = permissionDenied ? 'CAMERA_DENIED' : (error?.code || fallbackCode)
  return createARError(code, error, sourceMessage)
}

export const getARUserMessage = (error) => USER_MESSAGES[error?.code]
  || error?.message
  || USER_MESSAGES.AR_INITIALIZATION_FAILED
