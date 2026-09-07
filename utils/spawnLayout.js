import {spatialHuntConfig} from '~/experiences/spatial-hunt/config'

export const TARGET_COUNT = spatialHuntConfig.targetCount
export const MIN_RADIUS = spatialHuntConfig.spawn.minRadiusMeters
export const MAX_RADIUS = spatialHuntConfig.spawn.maxRadiusMeters
export const MIN_HEIGHT = spatialHuntConfig.spawn.minHeightMeters
export const MAX_HEIGHT = spatialHuntConfig.spawn.maxHeightMeters
export const MIN_RADIUS_METERS = MIN_RADIUS
export const MAX_RADIUS_METERS = MAX_RADIUS
export const MIN_HEIGHT_METERS = MIN_HEIGHT
export const MAX_HEIGHT_METERS = MAX_HEIGHT

const toRadians = (degrees) => degrees * (Math.PI / 180)

const createRandom = (seed) => {
  // 可重現的 pseudo-random generator：測試可使用固定 seed，重玩則使用時間作 seed。
  let value = Number(seed) || 1

  return () => {
    value |= 0
    value = value + 0x6d2b79f5 | 0
    let result = Math.imul(value ^ value >>> 15, 1 | value)
    result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Creates five safe, non-overlapping slots in a 240 degree arc in front of the player.
 * Positions are relative to the placed rover anchor.
 */
export const generateSpawnLayout = (seed = Date.now()) => {
  const random = createRandom(seed)
  // 五個安全槽位均勻鋪在玩家前方 240°，再加入少量角度 jitter 避免每局完全相同。
  const angleStep = spatialHuntConfig.spawn.arcDegrees / Math.max(1, TARGET_COUNT - 1)
  const angles = Array.from(
    {length: TARGET_COUNT},
    (_, index) => -spatialHuntConfig.spawn.arcDegrees / 2 + angleStep * index,
  )

  return angles.map((angle, index) => {
    const angleWithJitter = angle + (random() - 0.5) * 10
    const radius = MIN_RADIUS + random() * (MAX_RADIUS - MIN_RADIUS)
    const height = MIN_HEIGHT + random() * (MAX_HEIGHT - MIN_HEIGHT)
    const radians = toRadians(angleWithJitter)

    return {
      id: `crystal-${index + 1}`,
      position: {
        x: Math.sin(radians) * radius,
        y: height,
        z: -Math.cos(radians) * radius,
      },
      rotationSpeed: 0.65 + random() * 0.55,
      floatOffset: random() * Math.PI * 2,
    }
  })
}

export const createSpawnLayout = generateSpawnLayout

export const distanceBetweenTargets = (first, second) => {
  const deltaX = first.position.x - second.position.x
  const deltaY = first.position.y - second.position.y
  const deltaZ = first.position.z - second.position.z
  return Math.hypot(deltaX, deltaY, deltaZ)
}
