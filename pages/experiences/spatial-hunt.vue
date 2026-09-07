<script setup>
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Crosshair,
  LoaderCircle,
  LocateFixed,
  Radar,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trophy,
  WifiOff,
} from '@lucide/vue'
import {storeToRefs} from 'pinia'
import * as THREE from 'three'
import {spatialHuntConfig} from '~/experiences/spatial-hunt/config'
import {create8thWallWorldAdapter} from '~/services/ar/8thWallWorldAdapter.client'
import {createSpatialHuntPipeline} from '~/experiences/spatial-hunt/createScene.client'
import {GAME_PHASES, useSpatialHuntStore} from '~/experiences/spatial-hunt/store'
import {createSpawnLayout} from '~/experiences/spatial-hunt/spawnLayout'
import {formatElapsed} from '~/experiences/spatial-hunt/time'

definePageMeta({layout: false})

useHead({
  title: '空間尋寶 · WebAR Lab',
  meta: [
    {name: 'theme-color', content: '#06110c'},
    {name: 'apple-mobile-web-app-capable', content: 'yes'},
  ],
})

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const store = useSpatialHuntStore()
const {
  phase,
  collectedCount,
  targetCount,
  elapsedMs,
  bestTimeMs,
  trackingStatus,
  trackingReason,
  errorCode,
  errorMessage,
} = storeToRefs(store)

const canvas = ref(null)
const fps = ref(0)
const modelLoadMs = ref(null)
const modelStatus = ref('idle')
const engineStatus = ref('idle')
const isCleaningUp = ref(false)
const roverScale = ref(1)
const debugEnabled = computed(() => route.query.debug === '1')
const trackingIsLimited = computed(() => trackingStatus.value === 'LIMITED')

// adapter 管 8th Wall，相機場景則由 pipeline 管；頁面只協調兩者與 Pinia 流程。
// 這個分層讓未來換成 WebXR 或 MindAR 時，不必重寫遊戲 UI。
let adapter = null
let pipeline = null
let unsubscribeTracking = null
let animationFrame = null
let cleanupPromise = null
const activePointers = new Map()
let pinchStartDistance = null
let pinchStartScale = 1
let suppressTap = false

const permissionErrorCodes = new Set(['NotAllowedError', 'PermissionDeniedError', 'CAMERA_FAILED'])

const createRuntime = () => {
  adapter = create8thWallWorldAdapter()
  pipeline = createSpatialHuntPipeline({
    assetUrl: `${runtimeConfig.app.baseURL}${spatialHuntConfig.modelPath}`,
    onCollect: (targetId) => store.collect(targetId, performance.now(), window.localStorage),
    onSceneReady: () => {
      engineStatus.value = 'ready'
    },
    onModelLoad: ({status, durationMs}) => {
      modelStatus.value = status
      modelLoadMs.value = Math.round(durationMs)
    },
    onFps: (value) => {
      fps.value = value
    },
  })
}

const handleTracking = ({status, reason}) => {
  // Tracking lost 不重置遊戲，只暫停計時與點擊；NORMAL 後從原進度繼續。
  store.setTrackingStatus(status, reason)
  if (status === 'LIMITED') store.pause('tracking', performance.now())
  if (status === 'NORMAL') store.resume('tracking', performance.now())
}

const startExperience = async () => {
  if (!canvas.value || phase.value === GAME_PHASES.LOADING) return

  store.startLoading()
  engineStatus.value = 'loading'
  window.THREE = THREE

  try {
    // 啟動順序：建立模組 → 載入 vendor scripts → 相容性檢查 → 開啟相機。
    createRuntime()
    await adapter.load()
    const compatibility = adapter.checkCompatibility()
    if (!compatibility.compatible) {
      store.fail(compatibility.code, compatibility.message)
      return
    }

    unsubscribeTracking = adapter.subscribeTracking(handleTracking)
    await adapter.start(canvas.value, [pipeline.module])
    store.startCoaching()
  } catch (error) {
    const code = error?.code || error?.name || 'START_FAILED'
    const denied = permissionErrorCodes.has(code)
    store.fail(
      denied ? 'CAMERA_DENIED' : code,
      denied
        ? '相機權限被拒絕。請在瀏覽器網站設定中允許相機，再重新載入體驗。'
        : error?.message || 'WebAR 啟動失敗，請檢查網路後再試一次。',
    )
    await cleanupRuntime()
  }
}

const enterPlacement = () => {
  adapter?.recenter()
  pipeline?.clearPlacement()
  store.preparePlacement()
}

const beginPlayableRound = () => {
  store.beginRound(performance.now())
  if (trackingStatus.value === 'LIMITED') store.pause('tracking', performance.now())
  if (document.hidden) store.pause('visibility', performance.now())
}

const handleCanvasPointer = (event) => {
  // 同一個 canvas 在 placing 階段代表「放置」，playing 階段則代表「收集」。
  if (phase.value === GAME_PHASES.PLACING) {
    const placed = pipeline?.placeAtScreen(event.clientX, event.clientY)
    if (!placed) return
    pipeline.beginRound(createSpawnLayout(Date.now()))
    beginPlayableRound()
    return
  }

  if (store.canCollect) pipeline?.collectAtScreen(event.clientX, event.clientY)
}

const pointerDistance = () => {
  const [first, second] = [...activePointers.values()]
  return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 0
}

const handlePointerDown = (event) => {
  // Map 以 pointerId 同時追蹤兩根手指；滑鼠與單指仍會走一般點擊流程。
  activePointers.set(event.pointerId, {x: event.clientX, y: event.clientY})
  canvas.value?.setPointerCapture?.(event.pointerId)
  if (activePointers.size === 2 && phase.value === GAME_PHASES.PLAYING) {
    pinchStartDistance = pointerDistance()
    pinchStartScale = pipeline?.getRoverScale() || 1
    suppressTap = true
  }
}

const handlePointerMove = (event) => {
  if (!activePointers.has(event.pointerId)) return
  activePointers.set(event.pointerId, {x: event.clientX, y: event.clientY})
  if (activePointers.size !== 2 || !pinchStartDistance) return

  // 手指距離的比例就是新的模型比例，最後由 pipeline 限制在 55%～180%。
  const nextScale = pinchStartScale * (pointerDistance() / pinchStartDistance)
  roverScale.value = pipeline?.setRoverScale(nextScale) || roverScale.value
}

const handlePointerUp = (event) => {
  // pinch 結束通常會連續產生兩次 pointerup；suppressTap 避免誤收集晶體。
  const isSingleTap = activePointers.size === 1 && !suppressTap
  activePointers.delete(event.pointerId)
  if (activePointers.size < 2) pinchStartDistance = null
  if (isSingleTap) handleCanvasPointer(event)
  if (activePointers.size === 0) suppressTap = false
}

const replay = () => {
  pipeline?.beginRound(createSpawnLayout(Date.now() + Math.random() * 10000))
  beginPlayableRound()
}

const relocate = () => {
  adapter?.recenter()
  pipeline?.clearPlacement()
  store.relocate()
}

const retry = async () => {
  await cleanupRuntime()
  store.resetExperience()
  if (import.meta.client) store.hydrateBestTime(window.localStorage)
}

const leaveExperience = async () => {
  await cleanupRuntime()
  await router.push('/')
}

const handleVisibilityChange = () => {
  // visibilitychange 同時處理切 App 與鎖定螢幕，並通知 XR8 暫停相機 pipeline。
  if (document.hidden) {
    store.pause('visibility', performance.now())
    adapter?.pause()
  } else {
    adapter?.resume()
    store.resume('visibility', performance.now())
  }
}

const runClock = (now) => {
  store.tick(now)
  animationFrame = window.requestAnimationFrame(runClock)
}

const cleanupRuntime = async () => {
  // 多個 Vue lifecycle 可能同時要求清理；共用 Promise 確保 teardown 只執行一次。
  if (cleanupPromise) return cleanupPromise

  cleanupPromise = (async () => {
    isCleaningUp.value = true
    unsubscribeTracking?.()
    unsubscribeTracking = null
    pipeline?.dispose()
    try {
      await adapter?.stop()
    } catch {
      // Teardown must continue even when the vendor runtime has already stopped.
    }
    pipeline = null
    adapter = null
    engineStatus.value = 'idle'
    isCleaningUp.value = false
    cleanupPromise = null
  })()

  return cleanupPromise
}

onMounted(() => {
  store.resetExperience()
  store.hydrateBestTime(window.localStorage)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  animationFrame = window.requestAnimationFrame(runClock)
})

onBeforeRouteLeave(async () => {
  await cleanupRuntime()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
  cleanupRuntime()
})
</script>

<template>
  <main class="experience-shell">
    <canvas
      ref="canvas"
      class="ar-canvas"
      aria-label="WebAR 空間尋寶相機畫面"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    />

    <div class="interface-layer">
      <header class="top-bar">
        <button class="icon-button" type="button" aria-label="返回實驗室首頁" @click.stop="leaveExperience">
          <ArrowLeft :size="20" aria-hidden="true" />
        </button>
        <div class="brand-lockup">
          <span>WEBAR LAB</span>
          <small>SPATIAL HUNT / 01</small>
        </div>
        <div class="tracking-chip" :class="{'is-limited': trackingIsLimited}">
          <span class="tracking-dot" />
          {{ trackingStatus === 'NORMAL' ? 'TRACKING' : 'SEARCHING' }}
        </div>
      </header>

      <section v-if="phase === GAME_PHASES.INTRO" class="center-panel intro-panel">
        <div class="signal-mark" aria-hidden="true">
          <Radar :size="42" />
        </div>
        <p class="eyebrow">室內空間任務</p>
        <h1>啟動探測車，<br>找回 5 顆能量晶體。</h1>
        <p class="panel-copy">移動手機觀察四周，點擊漂浮晶體完成回收。請在明亮、紋理清楚且安全的室內空間進行。</p>
        <div class="intro-facts" aria-label="體驗資訊">
          <span>約 2 分鐘</span>
          <span>需要相機</span>
          <span>建議直式</span>
        </div>
        <button class="primary-button" type="button" @click.stop="startExperience">
          <Camera :size="19" aria-hidden="true" />
          開啟相機並開始
        </button>
        <NuxtLink class="text-link" to="/legal">使用條款與素材授權</NuxtLink>
      </section>

      <section v-else-if="phase === GAME_PHASES.LOADING" class="center-panel compact-panel" aria-live="polite">
        <LoaderCircle class="spin" :size="36" aria-hidden="true" />
        <p class="eyebrow">系統啟動中</p>
        <h2>正在準備空間追蹤</h2>
        <p class="panel-copy">第一次載入需要下載 AR 引擎，請保持網路連線。</p>
      </section>

      <section v-else-if="phase === GAME_PHASES.COACHING" class="bottom-sheet">
        <div class="sheet-icon"><LocateFixed :size="24" aria-hidden="true" /></div>
        <div>
          <p class="eyebrow">步驟 1 / 2</p>
          <h2>慢慢掃描周圍環境</h2>
          <p>左右移動手機，讓系統辨識桌面、地面與牆角。避免對著單色牆面。</p>
        </div>
        <button class="primary-button" type="button" @click.stop="enterPlacement">
          環境已掃描
          <CheckCircle2 :size="19" aria-hidden="true" />
        </button>
      </section>

      <section v-else-if="phase === GAME_PHASES.PLACING" class="placement-guide" aria-live="polite">
        <div class="instruction-pill">
          <Crosshair :size="19" aria-hidden="true" />
          <span><b>步驟 2 / 2</b> 對準地面並點一下</span>
        </div>
        <div class="reticle" aria-hidden="true"><span /></div>
      </section>

      <template v-else-if="[GAME_PHASES.PLAYING, GAME_PHASES.PAUSED, GAME_PHASES.COMPLETED].includes(phase)">
        <div class="game-hud">
          <div class="hud-stat">
            <small>已回收</small>
            <strong>{{ collectedCount }}<span>/{{ targetCount }}</span></strong>
          </div>
          <div class="progress-track" aria-label="收集進度">
            <span :style="{width: `${(collectedCount / targetCount) * 100}%`}" />
          </div>
          <div class="hud-stat align-right">
            <small>任務時間</small>
            <strong>{{ formatElapsed(elapsedMs) }}</strong>
          </div>
        </div>

        <button class="relocate-button" type="button" @click.stop="relocate">
          <LocateFixed :size="17" aria-hidden="true" />
          重新定位
        </button>
        <div v-if="phase === GAME_PHASES.PLAYING" class="gesture-hint">
          雙指縮放車子 · {{ Math.round(roverScale * 100) }}%
        </div>
      </template>

      <section v-if="phase === GAME_PHASES.PAUSED" class="status-overlay" aria-live="assertive">
        <div class="status-card">
          <WifiOff :size="32" aria-hidden="true" />
          <h2>暫時失去定位</h2>
          <p>請回到剛才的位置，慢慢移動手機。追蹤恢復後計時會自動繼續。</p>
        </div>
      </section>

      <section v-if="phase === GAME_PHASES.COMPLETED" class="status-overlay completion-overlay">
        <div class="status-card completion-card">
          <div class="trophy-mark"><Trophy :size="31" aria-hidden="true" /></div>
          <p class="eyebrow">MISSION COMPLETE</p>
          <h2>能量回收完成</h2>
          <div class="result-grid">
            <div><small>本次時間</small><strong>{{ formatElapsed(elapsedMs) }}</strong></div>
            <div><small>最佳紀錄</small><strong>{{ formatElapsed(bestTimeMs) }}</strong></div>
          </div>
          <button class="primary-button" type="button" @click.stop="replay">
            <RotateCcw :size="18" aria-hidden="true" />
            再玩一次
          </button>
          <button class="secondary-button" type="button" @click.stop="relocate">
            <LocateFixed :size="18" aria-hidden="true" />
            重新定位
          </button>
        </div>
      </section>

      <section v-if="phase === GAME_PHASES.ERROR" class="status-overlay error-overlay">
        <div class="status-card">
          <ShieldAlert :size="34" aria-hidden="true" />
          <p class="eyebrow">無法啟動體驗</p>
          <h2>{{ errorCode === 'CAMERA_DENIED' ? '需要相機權限' : '這台裝置暫時不支援' }}</h2>
          <p>{{ errorMessage }}</p>
          <button class="primary-button" type="button" @click.stop="retry">
            <RefreshCw :size="18" aria-hidden="true" />
            重新檢查
          </button>
          <NuxtLink class="text-link" to="/">返回首頁</NuxtLink>
        </div>
      </section>

      <aside v-if="debugEnabled" class="debug-panel" aria-label="開發除錯資訊">
        <b>DEBUG</b>
        <span>phase: {{ phase }}</span>
        <span>tracking: {{ trackingStatus }} {{ trackingReason }}</span>
        <span>fps: {{ fps }}</span>
        <span>model: {{ modelStatus }} / {{ modelLoadMs ?? '-' }} ms</span>
        <span>engine: {{ engineStatus }}</span>
        <span>cleanup: {{ isCleaningUp }}</span>
      </aside>

      <div class="landscape-warning">
        <RotateCcw :size="26" aria-hidden="true" />
        <span>請將手機轉回直式以繼續體驗</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.experience-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: #f4fff8;
  background: radial-gradient(circle at 50% 24%, #153f2d 0%, #07130e 44%, #020705 100%);
}

.ar-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.interface-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

button,
a { pointer-events: auto; }

.top-bar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: .75rem;
  padding: calc(env(safe-area-inset-top) + .75rem) 1rem .75rem;
  background: linear-gradient(#020a07cc, transparent);
}

.icon-button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #ffffff1f;
  border-radius: .8rem;
  background: #07140eb8;
  backdrop-filter: blur(12px);
}

.brand-lockup { display: flex; min-width: 0; flex-direction: column; font-weight: 800; letter-spacing: .08em; }
.brand-lockup small { overflow: hidden; color: #a5b7ad; font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }

.tracking-chip {
  display: flex;
  align-items: center;
  gap: .4rem;
  padding: .55rem .65rem;
  border: 1px solid #6eef9a40;
  border-radius: 999px;
  color: #b7ffce;
  background: #07140ed9;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .08em;
}

.tracking-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #6eef9a; box-shadow: 0 0 12px #6eef9a; }
.tracking-chip.is-limited { color: #ffd48a; border-color: #f5ae4f66; }
.tracking-chip.is-limited .tracking-dot { background: #f5ae4f; box-shadow: 0 0 12px #f5ae4f; }

.center-panel,
.status-card,
.bottom-sheet {
  border: 1px solid #ffffff1f;
  background: linear-gradient(150deg, #10261cfa, #06100bf2);
  box-shadow: 0 24px 80px #00000080;
  backdrop-filter: blur(22px);
}

.center-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 31rem);
  max-height: calc(100dvh - 8rem);
  padding: 1.5rem;
  overflow-y: auto;
  transform: translate(-50%, -48%);
  border-radius: 1.5rem;
  pointer-events: auto;
}

.intro-panel h1 { margin: .5rem 0 .8rem; font-size: clamp(1.75rem, 8vw, 2.75rem); line-height: 1.08; letter-spacing: -.045em; }
.compact-panel { display: grid; justify-items: center; text-align: center; }
.compact-panel h2 { margin: .35rem 0; }
.signal-mark { display: grid; width: 4.5rem; height: 4.5rem; place-items: center; border: 1px solid #6eef9a66; border-radius: 1.25rem; color: #86faaa; background: #183d2b; box-shadow: inset 0 0 25px #6eef9a1a; }
.eyebrow { margin: 1rem 0 0; color: #7ef5a3; font-size: .7rem; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.panel-copy, .bottom-sheet p, .status-card p { color: #b8c9bf; line-height: 1.62; }
.intro-facts { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.1rem 0; }
.intro-facts span { padding: .45rem .65rem; border: 1px solid #ffffff14; border-radius: .55rem; color: #c7d8ce; background: #ffffff08; font-size: .73rem; }

.primary-button,
.secondary-button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  border-radius: .8rem;
  font-weight: 850;
  transition: transform .16s ease, filter .16s ease;
}

.primary-button { color: #031109; background: #79f59f; }
.secondary-button { margin-top: .65rem; border: 1px solid #ffffff29; color: #eafff0; background: #ffffff0a; }
.primary-button:active, .secondary-button:active { transform: scale(.98); }
.text-link { display: block; margin-top: .9rem; color: #a9b9af; font-size: .78rem; text-align: center; text-decoration: underline; text-underline-offset: 3px; }
.spin { margin-bottom: .7rem; color: #79f59f; animation: spin 1s linear infinite; }

.bottom-sheet {
  position: absolute;
  right: 1rem;
  bottom: calc(env(safe-area-inset-bottom) + 1rem);
  left: 1rem;
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: .35rem 1rem;
  padding: 1.1rem;
  border-radius: 1.25rem;
  pointer-events: auto;
}

.bottom-sheet h2 { margin: .15rem 0; font-size: 1.2rem; }
.bottom-sheet p { margin: .25rem 0 .9rem; font-size: .86rem; }
.bottom-sheet .eyebrow { margin-top: 0; }
.bottom-sheet .primary-button { grid-column: 1 / -1; }
.sheet-icon { display: grid; width: 3rem; height: 3rem; place-items: center; border-radius: .9rem; color: #79f59f; background: #79f59f17; }

.placement-guide { position: absolute; inset: 0; }
.instruction-pill { position: absolute; top: calc(env(safe-area-inset-top) + 5.5rem); left: 50%; display: flex; align-items: center; gap: .55rem; padding: .72rem .9rem; transform: translateX(-50%); border: 1px solid #ffffff24; border-radius: 999px; background: #06100bd9; box-shadow: 0 10px 35px #0008; white-space: nowrap; }
.instruction-pill b { color: #79f59f; }
.reticle { position: absolute; top: 55%; left: 50%; display: grid; width: 5rem; height: 5rem; place-items: center; transform: translate(-50%, -50%); border: 1px solid #c5ffda80; border-radius: 50%; box-shadow: 0 0 35px #79f59f2b; }
.reticle::before, .reticle::after { position: absolute; content: ''; background: #e2ffeb; }
.reticle::before { width: 1.5rem; height: 1px; }
.reticle::after { width: 1px; height: 1.5rem; }
.reticle span { width: .48rem; height: .48rem; border-radius: 50%; background: #79f59f; box-shadow: 0 0 15px #79f59f; }

.game-hud { position: absolute; top: calc(env(safe-area-inset-top) + 5.3rem); right: 1rem; left: 1rem; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .8rem; padding: .72rem .85rem; border: 1px solid #ffffff1a; border-radius: 1rem; background: #05110cd6; backdrop-filter: blur(15px); }
.hud-stat { display: flex; flex-direction: column; }
.hud-stat small { color: #93a89c; font-size: .62rem; }
.hud-stat strong { color: #79f59f; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
.hud-stat strong span { color: #789087; font-size: .7rem; }
.align-right { text-align: right; }
.progress-track { height: .25rem; overflow: hidden; border-radius: 99px; background: #ffffff14; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: #79f59f; box-shadow: 0 0 12px #79f59f; transition: width .25s ease; }
.relocate-button { position: absolute; right: 1rem; bottom: calc(env(safe-area-inset-bottom) + 1rem); display: flex; min-height: 44px; align-items: center; gap: .45rem; padding: 0 .85rem; border: 1px solid #ffffff24; border-radius: .7rem; color: #d8e7de; background: #06100bd9; font-size: .78rem; font-weight: 750; backdrop-filter: blur(12px); }
.gesture-hint { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 1.15rem); left: 1rem; padding: .55rem .7rem; border: 1px solid #ffffff1a; border-radius: .65rem; color: #b8c9bf; background: #06100bd9; font-size: .68rem; backdrop-filter: blur(12px); }

.status-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 1rem; background: #010604a6; pointer-events: auto; }
.status-card { width: min(100%, 27rem); padding: 1.5rem; border-radius: 1.4rem; text-align: center; }
.status-card > svg { color: #f5bd68; }
.status-card h2 { margin: .45rem 0; font-size: 1.6rem; }
.completion-card .eyebrow { margin-top: .7rem; }
.trophy-mark { display: grid; width: 4.25rem; height: 4.25rem; margin: 0 auto; place-items: center; border-radius: 50%; color: #04130b; background: #79f59f; box-shadow: 0 0 38px #79f59f61; }
.result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin: 1.2rem 0; }
.result-grid div { display: flex; flex-direction: column; padding: .8rem; border: 1px solid #ffffff14; border-radius: .8rem; background: #ffffff08; }
.result-grid small { color: #94a89c; }
.result-grid strong { margin-top: .25rem; font-size: 1.25rem; font-variant-numeric: tabular-nums; }

.debug-panel { position: absolute; right: .75rem; bottom: calc(env(safe-area-inset-bottom) + 4.8rem); display: grid; max-width: calc(100% - 1.5rem); gap: .2rem; padding: .65rem; border: 1px solid #79f59f4d; border-radius: .55rem; color: #b9ffd0; background: #020704e8; font: .64rem/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; pointer-events: auto; }
.debug-panel b { color: #79f59f; letter-spacing: .12em; }
.landscape-warning { display: none; position: absolute; inset: 0; z-index: 5; place-items: center; align-content: center; gap: .8rem; color: #eafff0; background: #04100b; text-align: center; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (orientation: landscape) and (max-height: 520px) {
  .landscape-warning { display: grid; pointer-events: auto; }
}

@media (min-width: 640px) {
  .bottom-sheet { right: auto; width: 28rem; }
  .game-hud { right: auto; width: 25rem; }
}

@media (prefers-reduced-motion: reduce) {
  .spin { animation-duration: 2s; }
  .primary-button, .secondary-button, .progress-track span { transition: none; }
}
</style>
