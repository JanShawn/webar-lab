<script setup>
// [共用核心｜通常不改] AR engine 與 Three.js 共用這一張 canvas。
const emit = defineEmits(['ready'])
const canvas = ref(null)

// 核心：canvas 只能在瀏覽器 mounted 後交給 XR engine，SSR 時尚不存在。
onMounted(() => emit('ready', canvas.value))
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 h-full w-full touch-none" aria-label="圖片辨識 AR 相機畫面" />
</template>
