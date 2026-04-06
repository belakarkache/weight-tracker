<script setup>
import { computed, onActivated, onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";
import AppHeader from "../components/AppHeader.vue";
import InfoNotice from "../components/InfoNotice.vue";
import Button from "primevue/button";
import { IconChartLine, IconInfoCircle, IconScale, IconSoup } from "@tabler/icons-vue";
import { useDailyLog } from "../composables/useDailyLog";
import {
  collectWeightsChronological,
  computeNutritionAverages,
  computeWeightStats,
  hasStatsOverviewData,
  weightSeriesToChartPoints,
} from "../utils/statsAggregates";

const router = useRouter();
const dailyLog = useDailyLog();

onMounted(() => dailyLog.refresh());
onActivated(() => dailyLog.refresh());

const hasData = computed(() =>
  hasStatsOverviewData(dailyLog.entries.value),
);

const weightSeries = computed(() =>
  collectWeightsChronological(dailyLog.entries.value),
);

const weightStats = computed(() =>
  weightSeries.value.length ? computeWeightStats(weightSeries.value) : null,
);

const nutrition = computed(() =>
  computeNutritionAverages(dailyLog.entries.value),
);

const journeyLabel = computed(() => {
  const w = weightStats.value;
  if (!w) return "";
  const d = w.journeyDays === 1 ? "dia" : "dias";
  const m = w.journeyMonths === 1 ? "mês" : "meses";
  return `${w.journeyDays} ${d}; ${w.journeyMonths} ${m}`;
});

const chartPoints = computed(() =>
  weightSeriesToChartPoints(weightSeries.value),
);

const chartPolyline = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return "";
  const w = 288;
  const h = 96;
  const padX = 20;
  const padY = 14;
  return pts
    .map(
      (p) =>
        `${padX + p.x * w},${padY + p.y * h}`,
    )
    .join(" ");
});

const chartAreaPath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return "";
  const w = 288;
  const h = 96;
  const padX = 20;
  const padY = 14;
  const baseY = padY + h;
  const line = pts
    .map(
      (p) =>
        `${padX + p.x * w},${padY + p.y * h}`,
    )
    .join(" L ");
  const firstX = padX + pts[0].x * w;
  const lastX = padX + pts[pts.length - 1].x * w;
  return `M ${firstX},${baseY} L ${line} L ${lastX},${baseY} Z`;
});

function fmtInt(n) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmt1(n) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtSignedKg(delta) {
  const abs = Math.abs(delta);
  const s = fmt1(abs);
  if (delta > 0.001) return `+${s} kg`;
  if (delta < -0.001) return `−${s} kg`;
  return `${s} kg`;
}

function fmtSignedKgPerWeek(delta) {
  const abs = Math.abs(delta);
  const s = fmt1(abs);
  if (delta > 0.001) return `+${s} kg/semana`;
  if (delta < -0.001) return `−${s} kg/semana`;
  return `${s} kg/semana`;
}
</script>

<template>
  <div class="app-page flex h-full min-h-0 flex-col overflow-hidden">
    <AppHeader
      title="Estatísticas"
      subtitle="Resumo do peso e da alimentação registrados"
    />

    <div
      class="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto px-4 pb-28 pt-4"
    >
      <template v-if="!hasData">
        <InfoNotice>
          <template #icon>
            <IconInfoCircle stroke-width="1.5" />
          </template>
          <div class="space-y-3">
            <p class="m-0 text-sm font-semibold text-app-text">
              Ainda não há dados para estatísticas.
            </p>
            <p class="m-0 text-[0.8125rem] text-app-text-muted">
              Registre peso ou refeições na tela Hoje para ver alteração de
              peso, médias e gráficos.
            </p>
            <Button
              label="Ir para Hoje"
              class="w-full sm:w-auto"
              @click="router.push({ name: 'today' })"
            />
          </div>
        </InfoNotice>
      </template>

      <template v-else>
        <section
          v-if="weightStats"
          class="flex flex-col gap-3 rounded-app-lg border border-app-border bg-app-surface p-4"
          aria-labelledby="stats-weight-heading"
        >
          <div class="flex items-center gap-2">
            <IconScale
              class="size-5 text-[var(--accent-teal)]"
              stroke-width="1.5"
              aria-hidden="true"
            />
            <h2
              id="stats-weight-heading"
              class="m-0 text-base font-semibold text-app-text"
            >
              Peso
            </h2>
          </div>

          <dl class="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              class="rounded-app-sm border border-app-border bg-app-elevated/40 px-3 py-2.5"
            >
              <dt class="text-[0.6875rem] font-medium uppercase tracking-wide text-app-text-muted-2">
                Alteração total
              </dt>
              <dd class="mt-1 m-0 text-lg font-bold tabular-nums text-app-text">
                {{ fmtSignedKg(weightStats.deltaKg) }}
              </dd>
              <p class="mt-1 m-0 text-[0.6875rem] text-app-text-muted-2">
                Inicial {{ fmt1(weightStats.initialKg) }} kg → atual
                {{ fmt1(weightStats.currentKg) }} kg
              </p>
            </div>
            <div
              class="rounded-app-sm border border-app-border bg-app-elevated/40 px-3 py-2.5"
            >
              <dt class="text-[0.6875rem] font-medium uppercase tracking-wide text-app-text-muted-2">
                Média por semana
              </dt>
              <dd class="mt-1 m-0 text-lg font-bold tabular-nums text-app-text">
                {{ fmtSignedKgPerWeek(weightStats.avgPerWeek) }}
              </dd>
            </div>
            <div
              class="rounded-app-sm border border-app-border bg-app-elevated/40 px-3 py-2.5 sm:col-span-2"
            >
              <dt class="text-[0.6875rem] font-medium uppercase tracking-wide text-app-text-muted-2">
                Tempo de jornada (aprox.)
              </dt>
              <dd class="mt-1 m-0 text-base font-semibold text-app-text">
                {{ journeyLabel }}
              </dd>
            </div>
          </dl>

          <div
            v-if="chartPoints.length"
            class="mt-1 rounded-app-sm border border-app-border bg-[color-mix(in_srgb,var(--app-bg-elevated)_70%,transparent)] p-3"
          >
            <div class="mb-2 flex items-center gap-2">
              <IconChartLine
                class="size-4 text-app-text-muted-2"
                stroke-width="1.5"
                aria-hidden="true"
              />
              <span class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Flutuação de peso</span
              >
            </div>
            <svg
              class="h-36 w-full max-w-full"
              viewBox="0 0 328 124"
              role="img"
              :aria-label="`Gráfico com ${weightSeries.length} registros de peso`"
            >
              <defs>
                <linearGradient
                  id="stats-weight-area"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    style="stop-color: rgb(45 212 191); stop-opacity: 0.35"
                  />
                  <stop
                    offset="100%"
                    style="stop-color: rgb(45 212 191); stop-opacity: 0.02"
                  />
                </linearGradient>
                <linearGradient
                  id="stats-weight-line"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    style="stop-color: rgb(52 211 153)"
                  />
                  <stop
                    offset="100%"
                    style="stop-color: rgb(45 212 191)"
                  />
                </linearGradient>
              </defs>
              <path
                :d="chartAreaPath"
                fill="url(#stats-weight-area)"
              />
              <polyline
                :points="chartPolyline"
                fill="none"
                stroke="url(#stats-weight-line)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <g
                v-for="(p, i) in chartPoints"
                :key="i"
              >
                <circle
                  :cx="20 + p.x * 288"
                  :cy="14 + p.y * 96"
                  r="4"
                  class="fill-[var(--app-bg-surface)] stroke-[rgb(45,212,191)]"
                  stroke-width="2"
                />
              </g>
            </svg>
          </div>
        </section>

        <section
          v-if="nutrition"
          class="flex flex-col gap-3 rounded-app-lg border border-app-border bg-app-surface p-4"
          aria-labelledby="stats-nutrition-heading"
        >
          <div class="flex items-center gap-2">
            <IconSoup
              class="size-5 text-amber-400/90"
              stroke-width="1.5"
              aria-hidden="true"
            />
            <h2
              id="stats-nutrition-heading"
              class="m-0 text-base font-semibold text-app-text"
            >
              Alimentação
            </h2>
          </div>
          <p class="m-0 text-[0.75rem] text-app-text-muted-2">
            Médias entre dias em que há pelo menos uma refeição registrada ({{
              nutrition.daysCounted
            }}
            {{ nutrition.daysCounted === 1 ? "dia" : "dias" }}).
          </p>
          <dl class="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              class="rounded-app-sm border border-app-border bg-app-elevated/40 px-3 py-2.5"
            >
              <dt class="text-[0.6875rem] font-medium uppercase tracking-wide text-app-text-muted-2">
                Calorias / dia
              </dt>
              <dd class="mt-1 m-0 text-lg font-bold tabular-nums text-app-text">
                {{ fmtInt(nutrition.avgKcalPerDay) }} kcal
              </dd>
            </div>
            <div
              class="rounded-app-sm border border-app-border bg-app-elevated/40 px-3 py-2.5"
            >
              <dt class="text-[0.6875rem] font-medium uppercase tracking-wide text-app-text-muted-2">
                Proteína / dia
              </dt>
              <dd class="mt-1 m-0 text-lg font-bold tabular-nums text-app-text">
                {{ fmt1(nutrition.avgProteinPerDay) }} g
              </dd>
            </div>
          </dl>
        </section>

        <RouterLink
          to="/"
          class="text-center text-[0.8125rem] font-medium text-[var(--accent-teal)] hover:underline"
        >
          Voltar para Hoje
        </RouterLink>
      </template>
    </div>
  </div>
</template>
