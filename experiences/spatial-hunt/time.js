export const BEST_TIME_KEY = 'webar-lab:spatial-hunt:best-time'

export const formatElapsed = (milliseconds = 0) => {
  if (milliseconds === null || milliseconds === undefined || !Number.isFinite(Number(milliseconds))) {
    return '--:--.-'
  }

  const safeValue = Math.max(0, Number(milliseconds))
  const totalTenths = Math.floor(safeValue / 100)
  const minutes = Math.floor(totalTenths / 600)
  const seconds = Math.floor(totalTenths / 10) % 60
  const tenths = totalTenths % 10
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

export const readBestTime = (storage) => {
  if (!storage) return null

  const value = Number(storage.getItem(BEST_TIME_KEY))
  return Number.isFinite(value) && value > 0 ? value : null
}

export const writeBestTime = (storage, milliseconds) => {
  if (!storage || !Number.isFinite(milliseconds) || milliseconds <= 0) return
  storage.setItem(BEST_TIME_KEY, String(Math.round(milliseconds)))
}
