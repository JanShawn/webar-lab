<script setup>
/**
 * [POC 入口｜會改]
 * 這個頁面負責 UI 與流程協調：開始 AR、接收 tracking、載入模型、處理點擊、離頁清理。
 * 它不直接呼叫 XR8；新案件的文案、畫面與點擊後行為主要在這裡調整。
 */
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Hand,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from '@lucide/vue'
import {imageScanConfig} from '~/experiences/image-scan/config'
import {loadCharacter} from '~/3d/modelLoader/loadCharacter.client'
import {createAnimationController} from '~/3d/animation/createAnimationController'
import {createCharacterInteraction} from '~/3d/interaction/createCharacterInteraction.client'
import {createImageModelController} from '~/experiences/image-scan/createImageModelController.client'

definePageMeta({layout: false})

useHead({
  title: `${imageScanConfig.title} · WebAR Lab`,
  meta: [{name: 'theme-color', content: '#06110c'}],
})

const router = useRouter()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const canvas = ref(null)
const modelStatus = ref('idle')
const modelError = ref('')
const displayMode = ref('hidden')
const interactionCount = ref(0)
const availableAnimations = ref([])
const debugEnabled = computed(() => route.query.debug === '1')

const session = useARSession()
const imageTracking = useImageTracking({targetName: imageScanConfig.target.name})

let characterAsset = null
let character = null
let animationController = null
let interactionController = null
let unsubscribeFrame = null
let foundOnce = false

const withBaseURL = (path) => {
  // 核心：GitHub Pages 部署在 /webar-lab/，所有 public 素材都必須補上 baseURL。
  const baseURL = runtimeConfig.app.baseURL || '/'
  return `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

// POC 行為：辨識到圖片時，把模型掛回 image target 的座標。
const applyTrackedTarget = (target) => {
  if (!character || !target) return
  foundOnce = true
  character.attachToTarget(target)
  displayMode.value = character.getDisplayMode()
}

// POC 行為：失去圖片時要隱藏或切到相機前方，由 config 決定。
const handleTargetLost = () => {
  if (!character || !foundOnce) return
  if (imageScanConfig.tracking.lostBehavior === 'camera-lock') character.attachToCamera()
  else character.hide()
  displayMode.value = character.getDisplayMode()
}

const trackingSubscriptions = [
  imageTracking.onTargetFound(applyTrackedTarget),
  imageTracking.onTargetUpdated(applyTrackedTarget),
  imageTracking.onTargetLost(handleTargetLost),
]

const handleCharacterClick = () => {
  // 客製區：未來可在這裡換動畫、開啟 Vue UI、呼叫 API 或切換模型狀態。
  animationController?.play(imageScanConfig.animation.onClick, {restart: true})
  interactionCount.value += 1
}

const disposeCharacterRuntime = () => {
  unsubscribeFrame?.()
  unsubscribeFrame = null
  interactionController?.dispose()
  interactionController = null
  animationController?.dispose()
  animationController = null
  character?.dispose()
  character = null
  characterAsset = null
  displayMode.value = 'hidden'
}

const stopExperience = async () => {
  // 核心：離開頁面一定要解除點擊/動畫、釋放模型，再停止 XR8 與相機。
  disposeCharacterRuntime()
  imageTracking.disconnect()
  imageTracking.reset()
  await session.stop()
  modelStatus.value = 'idle'
  foundOnce = false
}

const startExperience = async () => {
  // 核心啟動順序：AR session → Three.js scene → GLB → anchor/動畫/點擊。
  modelError.value = ''
  modelStatus.value = 'idle'
  interactionCount.value = 0
  foundOnce = false

  const result = await session.start({
    canvas: canvas.value,
    mode: 'image',
    providerOptions: {
      imageTargets: [{
        metadataUrl: withBaseURL(imageScanConfig.target.metadataPath),
        imageUrl: withBaseURL(imageScanConfig.target.imagePath),
      }],
    },
    configureProvider: imageTracking.connect,
  })
  if (!result) return

  modelStatus.value = 'loading'
  try {
    characterAsset = await loadCharacter({
      modelUrl: withBaseURL(imageScanConfig.model.path),
      maxSize: imageScanConfig.model.maxSize,
    })
    character = createImageModelController({
      scene: result.scene.scene,
      camera: result.scene.camera,
      contentRoot: result.scene.contentRoot,
      modelRoot: characterAsset.root,
      config: imageScanConfig.model,
    })
    animationController = createAnimationController({
      root: characterAsset.root,
      animations: characterAsset.animations,
      idleAnimation: imageScanConfig.animation.idle,
    })
    availableAnimations.value = animationController.animationNames
    interactionController = createCharacterInteraction({
      canvas: canvas.value,
      camera: result.scene.camera,
      characterRoot: character.root,
      onClick: handleCharacterClick,
    })
    unsubscribeFrame = result.provider.onFrame(({deltaSeconds}) => animationController?.update(deltaSeconds))

    if (['found', 'tracking'].includes(imageTracking.status.value)) {
      applyTrackedTarget(imageTracking.target.value)
    } else if (imageTracking.status.value === 'lost') {
      foundOnce = true
      handleTargetLost()
    }
    modelStatus.value = 'ready'
  } catch (error) {
    console.error('[Image AR model]', error)
    modelError.value = '3D 模型載入失敗，請確認網路後重新嘗試。'
    modelStatus.value = 'error'
  }
}

const retry = async () => {
  await stopExperience()
  await startExperience()
}

const leaveExperience = async () => {
  await stopExperience()
  await router.push('/')
}

onBeforeRouteLeave(stopExperience)
onBeforeUnmount(() => {
  trackingSubscriptions.forEach((unsubscribe) => unsubscribe())
  stopExperience()
})
</script>

<template>
  <main class="image-ar-shell">
    <ArCanvas @ready="canvas = $event" />

    <div class="ui-layer">
      <header class="top-bar">
        <button class="icon-button" type="button" aria-label="返回首頁" @click.stop="leaveExperience">
          <ArrowLeft :size="20" />
        </button>
        <div>
          <b>IMAGE AR / POC 02</b>
          <small>{{ imageScanConfig.title }}</small>
        </div>
        <span class="tracking-chip" :class="`is-${imageTracking.status}`">
          {{ imageTracking.status === 'found' || imageTracking.status === 'tracking' ? 'TARGET' : 'SCANNING' }}
        </span>
      </header>

      <section v-if="session.status === 'idle'" class="center-card intro-card">
        <div class="intro-icon"><ImageIcon :size="34" /></div>
        <p class="eyebrow">8th Wall Image Target</p>
        <h1>掃描明信片，<br>喚醒小山靈場景。</h1>
        <p>請用手機開啟本頁，再對準印出的明信片或另一個螢幕。辨識成功後模型會出現在圖片上。</p>
        <img :src="withBaseURL(imageScanConfig.target.previewPath)" alt="要掃描的小山靈明信片" class="target-preview">
        <button class="primary-button" type="button" :disabled="!canvas" @click.stop="startExperience">
          <Camera :size="19" />
          開啟相機
        </button>
      </section>

      <section
        v-else-if="['loading', 'requesting-permission', 'initializing'].includes(session.status)"
        class="center-card compact-card"
        aria-live="polite"
      >
        <LoaderCircle class="spin" :size="36" />
        <p class="eyebrow">準備 WebAR</p>
        <h2>{{ session.status === 'requesting-permission' ? '請允許相機權限' : '正在載入辨識引擎' }}</h2>
        <p>第一次開啟需要下載 8th Wall Engine 與圖片特徵資料。</p>
      </section>

      <section v-else-if="['error', 'unsupported'].includes(session.status) || modelStatus === 'error'" class="center-card compact-card">
        <ShieldAlert :size="38" class="text-amber-300" />
        <p class="eyebrow">無法啟動</p>
        <h2>Image AR 暫時無法使用</h2>
        <p>{{ modelError || session.errorMessage }}</p>
        <button class="primary-button" type="button" @click.stop="retry">
          <RefreshCw :size="18" />重新嘗試
        </button>
      </section>

      <section v-else-if="modelStatus === 'loading'" class="bottom-card" aria-live="polite">
        <LoaderCircle class="spin" :size="25" />
        <div><b>正在載入小山靈</b><small>模型已最佳化為約 1.9 MB</small></div>
      </section>

      <section v-else-if="modelStatus === 'ready'" class="bottom-card" aria-live="polite">
        <ScanLine v-if="displayMode === 'hidden'" :size="26" />
        <CheckCircle2 v-else-if="displayMode === 'image-target'" :size="26" />
        <Sparkles v-else :size="26" />
        <div>
          <b v-if="displayMode === 'hidden'">請對準小山靈明信片</b>
          <b v-else-if="displayMode === 'image-target'">辨識成功，模型位於圖片上</b>
          <b v-else>圖片已離開，切換成相機展示</b>
          <small v-if="displayMode === 'hidden'">讓完整圖案出現在畫面中並保持穩定</small>
          <small v-else-if="displayMode === 'image-target'">移動明信片，模型會持續跟著圖片</small>
          <small v-else>模型固定在相機前上方；重新掃到圖片會自動切回</small>
        </div>
      </section>

      <div v-if="modelStatus === 'ready' && displayMode !== 'hidden'" class="interaction-hint">
        <Hand :size="16" /> 點擊模型播放動畫
        <span v-if="interactionCount">已互動 {{ interactionCount }} 次</span>
      </div>

      <aside v-if="debugEnabled" class="debug-panel">
        <b>DEBUG</b>
        <span>session: {{ session.status }}</span>
        <span>image: {{ imageTracking.status }}</span>
        <span>display: {{ displayMode }}</span>
        <span>model: {{ modelStatus }}</span>
        <span>animations: {{ availableAnimations.length }}</span>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.image-ar-shell { position: fixed; inset: 0; overflow: hidden; color: #f4fff8; background: radial-gradient(circle at 50% 25%, #173b2c, #04100b 55%, #010403); }
.ui-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
button, a { pointer-events: auto; }
.top-bar { position: absolute; top: 0; right: 0; left: 0; display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: .75rem; padding: calc(env(safe-area-inset-top) + .75rem) 1rem .75rem; background: linear-gradient(#020a07e8, transparent); }
.top-bar > div { display: flex; min-width: 0; flex-direction: column; font-size: .72rem; letter-spacing: .08em; }
.top-bar small { overflow: hidden; color: #a5b7ad; text-overflow: ellipsis; white-space: nowrap; }
.icon-button { display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid #ffffff1f; border-radius: .8rem; background: #07140ed9; }
.tracking-chip { padding: .55rem .65rem; border: 1px solid #f5bd6844; border-radius: 999px; color: #ffd999; background: #07140ed9; font-size: .62rem; font-weight: 800; letter-spacing: .08em; }
.tracking-chip.is-found, .tracking-chip.is-tracking { border-color: #79f59f55; color: #9effbd; }
.center-card, .bottom-card { border: 1px solid #ffffff1f; background: linear-gradient(150deg, #10261cfa, #06100bf5); box-shadow: 0 24px 80px #0009; backdrop-filter: blur(22px); pointer-events: auto; }
.center-card { position: absolute; top: 50%; left: 50%; width: min(calc(100% - 2rem), 30rem); max-height: calc(100dvh - 7rem); padding: 1.4rem; overflow-y: auto; transform: translate(-50%, -48%); border-radius: 1.5rem; }
.intro-card h1 { margin: .5rem 0 .8rem; font-size: clamp(1.8rem, 8vw, 2.7rem); line-height: 1.08; letter-spacing: -.045em; }
.center-card p { color: #b8c9bf; line-height: 1.6; }
.intro-icon { display: grid; width: 4rem; height: 4rem; place-items: center; border-radius: 1rem; color: #79f59f; background: #79f59f18; }
.eyebrow { margin: 1rem 0 0; color: #79f59f !important; font-size: .68rem; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
.target-preview { width: 100%; max-height: 12rem; margin: .7rem 0 1rem; border: 1px solid #ffffff1f; border-radius: .8rem; object-fit: cover; }
.primary-button { display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; gap: .55rem; border-radius: .8rem; color: #031109; background: #79f59f; font-weight: 850; }
.primary-button:disabled { cursor: wait; opacity: .5; }
.compact-card { display: grid; justify-items: center; text-align: center; }
.compact-card h2 { margin: .4rem 0; }
.spin { color: #79f59f; animation: spin 1s linear infinite; }
.bottom-card { position: absolute; right: 1rem; bottom: calc(env(safe-area-inset-bottom) + 1rem); left: 1rem; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .8rem; padding: 1rem; border-radius: 1rem; color: #79f59f; }
.bottom-card div { display: flex; min-width: 0; flex-direction: column; }
.bottom-card b { color: #f4fff8; font-size: .9rem; }
.bottom-card small { margin-top: .2rem; color: #a7b9af; font-size: .72rem; line-height: 1.35; }
.interaction-hint { position: absolute; top: calc(env(safe-area-inset-top) + 5.3rem); left: 50%; display: flex; align-items: center; gap: .45rem; padding: .62rem .75rem; transform: translateX(-50%); border: 1px solid #ffffff26; border-radius: 999px; color: #ddffe8; background: #06100bd9; font-size: .72rem; white-space: nowrap; }
.interaction-hint span { color: #79f59f; }
.debug-panel { position: absolute; right: .75rem; bottom: calc(env(safe-area-inset-bottom) + 6rem); display: grid; gap: .2rem; padding: .6rem; border: 1px solid #79f59f55; border-radius: .55rem; color: #b9ffd0; background: #020704e8; font: .62rem/1.35 monospace; pointer-events: auto; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (min-width: 640px) { .bottom-card { right: auto; width: 29rem; } }
</style>
