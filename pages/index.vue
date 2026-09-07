<script setup>
import {ArrowUpRight, Box, ScanLine, ShieldCheck, Smartphone} from '@lucide/vue'
import {experiences} from '~/data/experiences'

const readyCount = computed(() => experiences.filter(({status}) => status === 'ready').length)
const statusLabels = {ready: '可測試', next: '下一個 POC', planned: '規劃中'}
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
      <span class="technical-label rounded-full border border-line bg-panel/70 px-3 py-2 text-energy">{{ readyCount }} ready</span>
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
            <p class="technical-label text-muted">POC learning path</p>
            <h2 id="experience-heading" class="mt-2 text-2xl font-semibold tracking-tight">一次完成一個 WebAR 核心能力</h2>
          </div>
          <span class="hidden text-sm text-muted sm:block">完成後才開放入口，避免同時維護過多實驗</span>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <article
            v-for="(experience, index) in experiences"
            :key="experience.id"
            class="glass-panel flex min-h-[27rem] flex-col rounded-[1.6rem] p-6 sm:p-8"
            :class="experience.status === 'ready' ? 'border-energy/35 shadow-energy' : 'border-line'"
          >
            <div class="flex items-center justify-between gap-4">
              <span class="technical-label text-muted">POC {{ String(index + 1).padStart(2, '0') }}</span>
              <span
                class="technical-label rounded-full border px-3 py-2"
                :class="experience.status === 'ready' ? 'border-energy/30 bg-energy/10 text-energy' : experience.status === 'next' ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-line bg-white/5 text-muted'"
              >
                {{ statusLabels[experience.status] }}
              </span>
            </div>

            <div class="mt-8 grid h-16 w-16 place-items-center rounded-2xl border border-energy/25 bg-energy/10 text-energy">
              <Box :size="30" :stroke-width="1.5" aria-hidden="true" />
            </div>

            <div class="mt-6 flex-1">
              <p class="technical-label text-cyan">{{ experience.category }}</p>
              <h3 class="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{{ experience.title }}</h3>
              <p class="mt-4 leading-7 text-muted">{{ experience.description }}</p>
              <ul class="mt-6 grid gap-2 sm:grid-cols-2" :aria-label="`${experience.title}學習能力`">
                <li v-for="capability in experience.capabilities" :key="capability" class="flex items-center gap-2 text-sm text-white/90">
                  <span class="h-1.5 w-1.5 rounded-full bg-energy" aria-hidden="true" />
                  {{ capability }}
                </li>
              </ul>
            </div>

            <div class="mt-8 flex items-end justify-between gap-5 border-t border-line pt-6">
              <NuxtLink
                v-if="experience.status === 'ready'"
                :to="experience.route"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-energy px-5 py-3 font-semibold text-ink transition-colors hover:bg-white"
              >
                <Smartphone :size="19" aria-hidden="true" />
                開啟 POC
                <ArrowUpRight :size="18" aria-hidden="true" />
              </NuxtLink>
              <span v-else class="inline-flex min-h-12 items-center rounded-xl border border-line px-5 text-sm font-semibold text-muted">
                {{ experience.status === 'next' ? '準備下一步實作' : '尚未開始' }}
              </span>
              <ClientOnly v-if="experience.status === 'ready'">
                <ExperienceQrCode :path="experience.route" :label="experience.title" class="hidden sm:block" />
              </ClientOnly>
            </div>
          </article>
        </div>
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
