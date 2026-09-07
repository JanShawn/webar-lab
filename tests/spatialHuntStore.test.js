import {createPinia, setActivePinia} from 'pinia'
import {beforeEach, describe, expect, it} from 'vitest'
import {GAME_PHASES, useSpatialHuntStore} from '~/stores/spatialHunt'
import {BEST_TIME_KEY} from '~/utils/time'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('spatial hunt store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('follows the introduction, loading, coaching, placement and play phases', () => {
    const store = useSpatialHuntStore()
    expect(store.phase).toBe(GAME_PHASES.INTRO)
    store.startLoading()
    store.startCoaching()
    store.preparePlacement()
    store.beginRound(100)
    expect(store.phase).toBe(GAME_PHASES.PLAYING)
    expect(store.collectedCount).toBe(0)
  })

  it('pauses elapsed time until every pause reason recovers', () => {
    const store = useSpatialHuntStore()
    store.beginRound(100)
    store.tick(600)
    store.pause('tracking', 700)
    store.pause('visibility', 900)
    store.resume('tracking', 1_200)
    store.tick(1_500)
    expect(store.phase).toBe(GAME_PHASES.PAUSED)
    expect(store.elapsedMs).toBe(600)
    store.resume('visibility', 2_000)
    store.tick(2_250)
    expect(store.phase).toBe(GAME_PHASES.PLAYING)
    expect(store.elapsedMs).toBe(850)
  })

  it('deduplicates collection and persists the best completed time', () => {
    const store = useSpatialHuntStore()
    const storage = createStorage()
    store.beginRound(0)
    expect(store.collect('crystal-1', 100, storage)).toBe(true)
    expect(store.collect('crystal-1', 200, storage)).toBe(false)
    for (let index = 2; index <= 5; index += 1) store.collect(`crystal-${index}`, index * 100, storage)
    expect(store.collectedCount).toBe(5)
    expect(store.phase).toBe(GAME_PHASES.COMPLETED)
    expect(store.elapsedMs).toBe(500)
    expect(store.bestTimeMs).toBe(500)
    expect(storage.getItem(BEST_TIME_KEY)).toBe('500')
  })
})
