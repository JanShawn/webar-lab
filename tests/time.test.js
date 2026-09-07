import {describe, expect, it} from 'vitest'
import {BEST_TIME_KEY, formatElapsed, readBestTime, writeBestTime} from '~/experiences/spatial-hunt/time'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('time helpers', () => {
  it('formats elapsed milliseconds for the HUD', () => {
    expect(formatElapsed(0)).toBe('00:00.0')
    expect(formatElapsed(65_430)).toBe('01:05.4')
    expect(formatElapsed(null)).toBe('--:--.-')
  })

  it('stores and reads a valid best time', () => {
    const storage = createStorage()
    writeBestTime(storage, 12_345.8)
    expect(storage.getItem(BEST_TIME_KEY)).toBe('12346')
    expect(readBestTime(storage)).toBe(12_346)
  })

  it('ignores invalid stored values', () => {
    const storage = createStorage()
    storage.setItem(BEST_TIME_KEY, '-1')
    expect(readBestTime(storage)).toBeNull()
  })
})
