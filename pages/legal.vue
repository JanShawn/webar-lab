<script setup>
import {ArrowLeft, ExternalLink, FileText, ShieldCheck} from '@lucide/vue'

useHead({title: '授權與使用說明 · WebAR Lab'})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="grid-field pointer-events-none absolute inset-0" aria-hidden="true" />
    <main class="relative z-10 mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-14">
      <NuxtLink to="/" class="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-white">
        <ArrowLeft :size="18" aria-hidden="true" />
        返回 WebAR Lab
      </NuxtLink>
      <header class="mt-8 border-b border-line pb-8">
        <p class="technical-label text-energy">Legal & attribution</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">授權與使用說明</h1>
        <p class="mt-4 max-w-2xl leading-7 text-muted">這個 prototype 將開源框架、受限制的空間追蹤 binary 與 CC0 素材分開記錄，避免未來平台化時混淆授權範圍。</p>
      </header>
      <div class="mt-8 grid gap-5">
        <section class="glass-panel rounded-2xl p-6 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy"><ShieldCheck :size="22" aria-hidden="true" /></span>
            <div>
              <h2 class="text-xl font-semibold">8th Wall XR Engine Binary</h2>
              <p class="mt-3 leading-7 text-muted">本 Demo 透過 CDN 載入固定版本的 Distributed Engine Binary。SLAM binary 不屬於 8th Wall MIT 開源框架的同一授權範圍；目前僅定位為內部實驗與作品展示，不應直接視為可供第三方自助使用的 SaaS 核心。</p>
              <div class="mt-5 flex flex-wrap gap-3 text-sm">
                <a class="inline-flex items-center gap-2 text-energy hover:text-white" href="https://8thwall.org/docs/open-source" target="_blank" rel="noreferrer">官方開源說明 <ExternalLink :size="15" aria-hidden="true" /></a>
                <a class="inline-flex items-center gap-2 text-energy hover:text-white" href="https://github.com/8thwall/engine/blob/main/LICENSE" target="_blank" rel="noreferrer">XR Engine License <ExternalLink :size="15" aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </section>
        <section class="glass-panel rounded-2xl p-6 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan/10 text-cyan"><FileText :size="22" aria-hidden="true" /></span>
            <div>
              <h2 class="text-xl font-semibold">Khronos ToyCar</h2>
              <p class="mt-3 leading-7 text-muted">中央探測車取自 Khronos Group glTF Sample Assets 的 ToyCar，採 CC0 1.0 Universal。專案內版本僅做行動裝置傳輸最佳化。</p>
              <a class="mt-5 inline-flex items-center gap-2 text-sm text-energy hover:text-white" href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ToyCar" target="_blank" rel="noreferrer">查看原始素材與作者資訊 <ExternalLink :size="15" aria-hidden="true" /></a>
            </div>
          </div>
        </section>
        <p class="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/80">若產品方向改為接案管理平台、白牌服務或收費 SaaS，上線前必須重新取得法律意見或 8th Wall 的書面授權確認。</p>
      </div>
    </main>
  </div>
</template>
