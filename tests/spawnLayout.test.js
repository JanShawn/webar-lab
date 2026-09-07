import {describe, expect, it} from 'vitest'
import {
  MAX_HEIGHT_METERS, MAX_RADIUS_METERS, MIN_HEIGHT_METERS, MIN_RADIUS_METERS,
  TARGET_COUNT, createSpawnLayout, distanceBetweenTargets,
} from '~/utils/spawnLayout'

describe('createSpawnLayout', () => {
  it('creates five repeatable and unique targets', () => {
    const first = createSpawnLayout(20260907)
    expect(first).toEqual(createSpawnLayout(20260907))
    expect(first).toHaveLength(TARGET_COUNT)
    expect(new Set(first.map((target) => target.id)).size).toBe(TARGET_COUNT)
  })

  it('keeps every target inside the safe radial and height range', () => {
    for (const target of createSpawnLayout(42)) {
      const radius = Math.hypot(target.position.x, target.position.z)
      expect(radius).toBeGreaterThanOrEqual(MIN_RADIUS_METERS)
      expect(radius).toBeLessThanOrEqual(MAX_RADIUS_METERS)
      expect(target.position.y).toBeGreaterThanOrEqual(MIN_HEIGHT_METERS)
      expect(target.position.y).toBeLessThanOrEqual(MAX_HEIGHT_METERS)
    }
  })

  it('does not overlap target slots', () => {
    const layout = createSpawnLayout(100)
    for (let left = 0; left < layout.length; left += 1) {
      for (let right = left + 1; right < layout.length; right += 1) {
        expect(distanceBetweenTargets(layout[left], layout[right])).toBeGreaterThan(0.45)
      }
    }
  })
})
