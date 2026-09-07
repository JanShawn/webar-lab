export const AR_MODES = Object.freeze({
  IMAGE: 'image',
  WORLD: 'world',
})

export const AR_SESSION_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  REQUESTING_PERMISSION: 'requesting-permission',
  INITIALIZING: 'initializing',
  READY: 'ready',
  TRACKING: 'tracking',
  PLACING: 'placing',
  PLACED: 'placed',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
})

export const createVector3 = (value = {}) => ({
  x: Number(value.x) || 0,
  y: Number(value.y) || 0,
  z: Number(value.z) || 0,
})

export const createQuaternion = (value = {}) => ({
  x: Number(value.x) || 0,
  y: Number(value.y) || 0,
  z: Number(value.z) || 0,
  w: Number.isFinite(Number(value.w)) ? Number(value.w) : 1,
})

/**
 * Provider 對外統一使用這個 pose；上層不可依賴 raw 的 vendor 格式。
 */
export const createTrackingPose = ({position, rotation, scale = 1, raw = null} = {}) => ({
  position: createVector3(position),
  rotation: createQuaternion(rotation),
  scale: Number.isFinite(Number(scale)) ? Number(scale) : 1,
  raw,
})

