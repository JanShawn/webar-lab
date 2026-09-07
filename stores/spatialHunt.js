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

// Store 是遊戲流程的唯一真相來源；Vue 頁面只根據 phase 決定顯示哪一層 UI。
export const useSpatialHuntStore = defineStore('spatialHunt', {
  state: () => ({
    phase: GAME_PHASES.INTRO,
    collectedIds: [],
    targetCount: 5,
    elapsedMs: 0,
    bestTimeMs: null,
    lastTickAt: null,
    // tracking lost 和切到背景可能同時發生，所以用陣列而不是單一布林值。
    // 必須等所有原因都解除後，遊戲才可以繼續。
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
      // now 由呼叫端傳入，讓計時邏輯不依賴真實時鐘，也更容易寫單元測試。
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
      // includes() 讓同一顆晶體即使收到多次 pointer event，也只會計算一次。
      if (!this.canCollect || this.collectedIds.includes(targetId)) return false

      this.tick(now)
      this.collectedIds.push(targetId)

      if (this.collectedIds.length === this.targetCount) {
        this.phase = GAME_PHASES.COMPLETED
        this.lastTickAt = null
        if (this.bestTimeMs === null || this.elapsedMs < this.bestTimeMs) {
          this.bestTimeMs = this.elapsedMs
          // 第一版不需要後端，最佳時間只保存在這台裝置的 localStorage。
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
      this.phase = GAME_PHASES.PLACING
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
