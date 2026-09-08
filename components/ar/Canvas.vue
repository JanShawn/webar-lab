<script setup>
/**
 * [共用核心｜通常不改]
 *
 * 這個元件只建立一張真正的 HTML <canvas>，不會自己開相機。
 * 8th Wall 負責把相機畫面畫進 canvas，Three.js 則在同一張 canvas 畫模型。
 * mounted 之後 DOM 才存在，因此這時才把 canvas element 傳給體驗頁。
 *
 * 注意：這裡不能使用 .client.vue。
 * Nuxt 會替 .client.vue 加上 ClientOnly wrapper，可能讓自訂 ready event
 * 無法可靠地傳到父頁面；AR route 本身已在 nuxt.config.js 設為 client-only。
 */
const emit = defineEmits(['ready'])
const canvas = ref(null)

// 核心：canvas 只能在瀏覽器 mounted 後交給 XR engine，SSR 時尚不存在。
onMounted(() => {
  if (canvas.value) emit('ready', canvas.value)
})
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 h-full w-full touch-none" aria-label="圖片辨識 AR 相機畫面" />
</template>
