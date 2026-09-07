<script setup>
import {ArrowUpRight, Box, ScanLine, ShieldCheck, Smartphone} from '@lucide/vue'
import {experiences} from '~/data/experiences'

const experience = experiences[0]
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="grid-field pointer-events-none absolute inset-0" aria-hidden="true" />

    <header class="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <NuxtLink to="/" class="flex items-center gap-3 text-white transition-colors hover:text-energy">
        <span class="grid h-10 w-10 place-items-center rounded-xl border border-energy/40 bg-energy/10">
          <ScanLine :size="21" aria-hidden="true" />
        </span>
        <span>
          <span class="block text-base font-semibold tracking-tight">WebAR Lab</span>
          <span class="technical-label block text-muted">Experimental build 01</span>
        </span>
      </NuxtLink>
      <span class="technical-label rounded-full border border-line bg-panel/70 px-3 py-2 text-energy">1 ready</span>
    </header>

    <main class="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-16">
      <section class="grid items-end gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_auto]">
        <div class="max-w-3xl">
          <p class="technical-label mb-5 text-energy">WebAR interaction library</p>
          <h1 class="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
            每次測試，都留下可重用的空間互動。
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            從一個可掃描、可量測的體驗開始，逐步累積追蹤、手勢、素材與發佈流程。
          </p>
        </div>
        <div class="glass-panel hidden items-center gap-4 rounded-2xl p-4 sm:flex">
          <ShieldCheck :size="24" class="text-energy" aria-hidden="true" />
          <div>
            <div class="text-sm font-semibold text-white">Mobile web ready</div>
            <div class="mt-1 text-sm text-muted">iOS 16.4+ · Android Chrome</div>
          </div>
        </div>
      </section>

      <section class="pt-8" aria-labelledby="experience-heading">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="technical-label text-muted">Available experience</p>
            <h2 id="experience-heading" class="mt-2 text-2xl font-semibold tracking-tight">目前可測試</h2>
          </div>
          <span class="hidden text-sm text-muted sm:block">請使用手機開啟以啟用相機與空間追蹤</span>
        </div>

        <article class="group overflow-hidden rounded-[2rem] border border-line bg-panel/80 shadow-energy">
          <div class="grid lg:grid-cols-[1.08fr_.92fr]">
            <div class="relative min-h-[300px] overflow-hidden border-b border-line p-6 sm:min-h-[390px] sm:p-8 lg:border-b-0 lg:border-r">
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(132,247,178,.17),transparent_34%)]" aria-hidden="true" />
              <div class="absolute inset-0 opacity-50" aria-hidden="true">
                <div class="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-energy/30" />
                <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan/25" />
              </div>
              <div class="relative flex h-full flex-col justify-between">
                <div class="flex items-center justify-between">
                  <span class="technical-label rounded-full border border-energy/30 bg-energy/10 px-3 py-2 text-energy">Live prototype</span>
                  <span class="technical-label text-muted">World / 001</span>
                </div>
                <div class="mx-auto grid h-28 w-28 place-items-center rounded-[2rem] border border-energy/40 bg-ink/80 shadow-[0_0_60px_rgba(132,247,178,.2)]">
                  <Box :size="48" :stroke-width="1.4" class="text-energy" aria-hidden="true" />
                </div>
                <div class="grid grid-cols-5 gap-2" aria-label="五個能量晶體">
                  <span v-for="index in 5" :key="index" class="h-1.5 rounded-full bg-energy/70" />
                </div>
              </div>
            </div>

            <div class="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
              <div>
                <p class="technical-label text-cyan">{{ experience.category }}</p>
                <h3 class="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{{ experience.title }}</h3>
                <p class="mt-4 text-base leading-7 text-muted">
                  在室內放置科技探測車，移動手機尋找散落在空間中的五顆能量晶體。
                </p>
                <ul class="mt-7 grid gap-3 sm:grid-cols-2" aria-label="體驗能力">
                  <li v-for="capability in experience.capabilities" :key="capability" class="flex items-center gap-2 text-sm text-white/90">
                    <span class="h-1.5 w-1.5 rounded-full bg-energy" aria-hidden="true" />
                    {{ capability }}
                  </li>
                </ul>
              </div>

              <div class="mt-10 flex items-end justify-between gap-6">
                <NuxtLink
                  :to="experience.route"
                  class="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-energy px-5 py-3 text-base font-semibold text-ink transition-colors duration-200 hover:bg-white"
                >
                  <Smartphone :size="19" aria-hidden="true" />
                  開啟體驗
                  <ArrowUpRight :size="18" aria-hidden="true" />
                </NuxtLink>
                <ClientOnly>
                  <ExperienceQrCode :path="experience.route" :label="experience.title" class="hidden sm:block" />
                </ClientOnly>
              </div>
            </div>
          </div>
        </article>
      </section>

      <footer class="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Prototype 01 · Internal WebAR Lab</p>
        <NuxtLink to="/legal" class="underline decoration-line underline-offset-4 transition-colors hover:text-white">
          8th Wall binary 使用前需遵循其授權與標示要求。
        </NuxtLink>
      </footer>
    </main>
  </div>
</template>
