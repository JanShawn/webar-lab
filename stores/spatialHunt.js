import {defineStore} from 'pinia'
import {readBestTime, writeBestTime} from '~/utils/time'

export const GAME_PHASES = Object.freeze({
  INTRO: 'intro',
  LOADING: 'loading',
  COACHING: 'coaching',
  PLACING: 'placing',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
})

export const useSpatialHuntStore = defineStore('spatialHunt', {
  state: () => ({
    phase: GAME_PHASES.INTRO,
    collectedIds: [],
    targetCount: 5,
    elapsedMs: 0,
    bestTimeMs: null,
    lastTickAt: null,
    pauseReasons: [],
    trackingStatus: 'UNAVAILABLE',
    trackingReason: '',
    errorCode: '',
    errorMessage: '',
  }),

  getters: {
    collectedCount: (state) => state.collectedIds.length,
    progress: (state) => state.collectedIds.length / state.targetCount,
    canCollect: (state) => state.phase === GAME_PHASES.PLAYING && state.pauseReasons.length === 0,
  },

  actions: {
    hydrateBestTime(storage) {
      this.bestTimeMs = readBestTime(storage)
    },

    startLoading() {
      this.phase = GAME_PHASES.LOADING
      this.errorCode = ''
      this.errorMessage = ''
    },

    startCoaching() {
      this.phase = GAME_PHASES.COACHING
      this.pauseReasons = []
    },

    preparePlacement() {
      this.phase = GAME_PHASES.PLACING
    },

    beginRound(now = performance.now()) {
      this.collectedIds = []
      this.elapsedMs = 0
      this.pauseReasons = []
      this.lastTickAt = now
      this.phase = GAME_PHASES.PLAYING
    },

    tick(now = performance.now()) {
      if (this.phase !== GAME_PHASES.PLAYING || this.pauseReasons.length > 0) {
        this.lastTickAt = now
        return
      }

      if (this.lastTickAt !== null) {
        this.elapsedMs += Math.max(0, now - this.lastTickAt)
      }
      this.lastTickAt = now
    },

    collect(targetId, now = performance.now(), storage) {
      if (!this.canCollect || this.collectedIds.includes(targetId)) return false

      this.tick(now)
      this.collectedIds.push(targetId)

      if (this.collectedIds.length === this.targetCount) {
        this.phase = GAME_PHASES.COMPLETED
        this.lastTickAt = null
        if (this.bestTimeMs === null || this.elapsedMs < this.bestTimeMs) {
          this.bestTimeMs = this.elapsedMs
          writeBestTime(storage, this.elapsedMs)
        }
      }

      return true
    },

    pause(reason, now = performance.now()) {
      if (![GAME_PHASES.PLAYING, GAME_PHASES.PAUSED].includes(this.phase)) return
      if (!this.pauseReasons.includes(reason)) {
        this.tick(now)
        this.pauseReasons.push(reason)
      }
      this.lastTickAt = now
      this.phase = GAME_PHASES.PAUSED
    },

    resume(reason, now = performance.now()) {
      this.pauseReasons = this.pauseReasons.filter((item) => item !== reason)
      this.lastTickAt = now
      if (this.phase === GAME_PHASES.PAUSED && this.pauseReasons.length === 0) {
        this.phase = GAME_PHASES.PLAYING
      }
    },

    setTrackingStatus(status, reason = '') {
      this.trackingStatus = status || 'UNAVAILABLE'
      this.trackingReason = reason
    },

    relocate() {
      this.collectedIds = []
      this.elapsedMs = 0
      this.lastTickAt = null
      this.pauseReasons = []
      this.phase = GAME_PHASES.COACHING
    },

    fail(code, message) {
      this.errorCode = code
      this.errorMessage = message
      this.phase = GAME_PHASES.ERROR
    },

    resetExperience() {
      this.$reset()
    },
  },
})

