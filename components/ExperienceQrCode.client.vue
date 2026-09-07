<script setup>
import QRCode from 'qrcode'

const props = defineProps({
  path: {type: String, required: true},
  label: {type: String, required: true},
})

const config = useRuntimeConfig()
const qrDataUrl = ref('')

onMounted(async () => {
  const origin = config.public.siteUrl || window.location.origin
  const url = new URL(props.path, origin).toString()
  qrDataUrl.value = await QRCode.toDataURL(url, {
    width: 184,
    margin: 1,
    color: {dark: '#07110d', light: '#f5fbf7'},
    errorCorrectionLevel: 'M',
  })
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-white p-2 shadow-energy">
    <div v-if="!qrDataUrl" class="h-[116px] w-[116px] animate-pulse rounded-xl bg-slate-200" aria-hidden="true" />
    <img
      v-else
      class="h-[116px] w-[116px] rounded-xl"
      :src="qrDataUrl"
      :alt="`${label} QR Code`"
      width="116"
      height="116"
    >
  </div>
</template>
