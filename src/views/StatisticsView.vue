<script setup>
import { computed, onActivated, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppHeader from "../components/AppHeader.vue";
import InfoNotice from "../components/InfoNotice.vue";
import Button from "primevue/button";
import Divider from "primevue/divider";
import ProgressBar from "primevue/progressbar";
import Tag from "primevue/tag";
import {
  IconScale,
  IconTrendingDown,
  IconTrendingUp,
  IconMinus,
  IconCalendarStats,
  IconClock,
  IconChartLine,
  IconSoup,
  IconFlame,
  IconTarget,
} from "@tabler/icons-vue";
import { useOnboarding } from "../composables/useOnboarding";
import { useDailyLog, dayTotals } from "../composables/useDailyLog";

const router = useRouter();
const { getStored: getProfile } = useOnboarding();
const dailyLog = useDailyLog();

onMounted(() => dailyLog.refresh());
onActivated(() => dailyLog.refresh());

const profile = computed(() => getProfile() ?? {});

function collectWeights(entries) {
  const out = [];
  for (const day of Object.values(entries ?? {})) {
    for (const w of day?.weights ?? []) {
      const t = new Date(w.recordedAt);
      if (Number.isNaN(t.getTime())) continue;
      out.push({ t: t.getTime(), kg: w.kg, recordedAt: w.recordedAt });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

const weightSeries = computed(() => collectWeights(dailyLog.entries.value));

const mealAgg = computed(() => {
  let totalMeals = 0;
  let daysWithMeals = 0;
  let totalKcal = 0;
  const keys = Object.keys(dailyLog.entries.value ?? {});
  for (const dk of keys) {
    const day = dailyLog.getDay(dk);
    const n = day.meals?.length ?? 0;
    if (n > 0) {
      daysWithMeals += 1;
      totalMeals += n;
      totalKcal += dayTotals(day.meals).kcal;
    }
  }
  return {
    totalMeals,
    daysWithMeals,
    totalKcal,
    avgKcalPerActiveDay:
      daysWithMeals > 0 ? totalKcal / daysWithMeals : 0,
  };
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

function formatJourneyDays(days) {
  const d = Math.max(1, Math.round(days));
  if (d < 7) return `${d} ${d === 1 ? "dia" : "dias"}`;
  const w = Math.floor(d / 7);
  const r = d % 7;
  if (r === 0) return `${w} ${w === 1 ? "semana" : "semanas"}`;
  return `${w} sem. · ${r} dia(s)`;
}

const weightStats = computed(() => {
  const ws = weightSeries.value;
  if (ws.length < 2) return null;
  const first = ws[0];
  const last = ws[ws.length - 1];
  const delta = last.kg - first.kg;
  const durationMs = Math.max(0, last.t - first.t);
  const durationDays = Math.max(1, durationMs / 86400000);
  const weeksElapsed = durationMs / (7 * 86400000);
  const avgPerWeek =
    weeksElapsed >= 0.99
      ? delta / weeksElapsed
      : delta / (durationDays / 7);
  const minKg = Math.min(...ws.map((w) => w.kg));
  const maxKg = Math.max(...ws.map((w) => w.kg));
  return {
    first,
    last,
    delta,
    durationMs,
    durationDays,
    avgPerWeek,
    count: ws.length,
    minKg,
    maxKg,
    projectedWeekly: durationDays < 7,
  };
});

const chartGeo = computed(() => {
  const ws = weightSeries.value;
  if (!ws.length) return null;
  const W = 380;
  const H = 168;
  const padL = 40;
  const padR = 10;
  const padT = 14;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const kgs = ws.map((w) => w.kg);
  let min = Math.min(...kgs);
  let max = Math.max(...kgs);
  if (min === max) {
    min -= 0.6;
    max += 0.6;
  }
  const span = max - min || 1;
  const padKg = span * 0.08;
  min -= padKg;
  max += padKg;
  const n = ws.length;
  const toX = (i) =>
    padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const toY = (kg) =>
    padT + innerH * (1 - (kg - min) / (max - min || 1));
  const points = ws.map((w, i) => ({
    x: toX(i),
    y: toY(w.kg),
    kg: w.kg,
    recordedAt: w.recordedAt,
  }));
  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const areaD =
    points.length > 1
      ? `M ${first.x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points
          .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" L ")} L ${last.x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : "";
  const yTicks = [max, min + (max - min) * 0.5, min];
  return {
    W,
    H,
    padL,
    padT,
    innerH,
    lineD,
    areaD,
    points,
    yTicks,
    min,
    max,
    single: n === 1,
  };
});

const goalWeight = computed(() => {
  const g = Number(profile.value.goalWeight);
  return g > 0 ? g : null;
});

const goalProgress = computed(() => {
  const goal = goalWeight.value;
  const ws = weightSeries.value;
  if (!goal || ws.length === 0) return null;
  const last = ws[ws.length - 1].kg;
  const first = ws[0].kg;
  const diffToGoal = last - goal;
  const startDist = Math.abs(first - goal);
  if (startDist < 0.05) return { pct: 100, diffToGoal, last, first, goal };
  const endDist = Math.abs(last - goal);
  const improved = startDist - endDist;
  const pct = Math.min(100, Math.max(0, (improved / startDist) * 100));
  return {
    pct,
    diffToGoal,
    last,
    first,
    goal,
  };
});
</script>

<template>
  <div class="app-page flex min-h-full flex-col overflow-x-hidden text-slate-100">
    <AppHeader
      title="Estatísticas"
      subtitle="Acompanhe sua evolução ao longo do tempo"
    />
    <div
      class="mx-auto flex w-full min-w-0 flex-1 flex-col gap-4 px-4 pb-24 pt-4"
    >
      <section
        v-if="weightSeries.length"
        class="overflow-hidden rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-violet)_50%,transparent)] bg-app-surface/90 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.55)]"
      >
        <div
          class="flex items-center justify-between gap-2 border-b border-app-border px-3.5 py-3"
        >
          <div class="flex min-w-0 items-center gap-2">
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-app-sm border border-violet-500/25 bg-violet-500/10 text-violet-300"
            >
              <IconChartLine
                class="size-5"
                stroke-width="1.75"
              />
            </div>
            <div class="min-w-0">
              <h2
                class="m-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
              >
                Peso ao longo do tempo
              </h2>
              <p class="m-0 mt-0.5 text-xs text-app-text-muted">
                {{ weightSeries.length }} pesagem(ns) registrada(s)
              </p>
            </div>
          </div>
        </div>
        <div class="px-2 pb-1 pt-2">
          <svg
            class="w-full max-w-full"
            :viewBox="`0 0 ${chartGeo.W} ${chartGeo.H}`"
            role="img"
            aria-label="Gráfico de evolução do peso"
          >
            <defs>
              <linearGradient
                id="stats-weight-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stop-color="var(--accent-violet)"
                  stop-opacity="0.35"
                />
                <stop
                  offset="100%"
                  stop-color="var(--accent-teal)"
                  stop-opacity="0.05"
                />
              </linearGradient>
              <linearGradient
                id="stats-weight-stroke"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  stop-color="var(--accent-teal)"
                />
                <stop
                  offset="100%"
                  stop-color="var(--accent-violet)"
                />
              </linearGradient>
            </defs>
            <g
              v-for="(yt, idx) in chartGeo.yTicks"
              :key="'yt-' + idx"
            >
              <line
                :x1="chartGeo.padL - 4"
                :y1="chartGeo.padT + chartGeo.innerH * (1 - (yt - chartGeo.min) / (chartGeo.max - chartGeo.min || 1))"
                :x2="chartGeo.W - 8"
                :y2="chartGeo.padT + chartGeo.innerH * (1 - (yt - chartGeo.min) / (chartGeo.max - chartGeo.min || 1))"
                stroke="rgb(148 163 184 / 0.12)"
                stroke-width="1"
              />
              <text
                :x="4"
                :y="chartGeo.padT + chartGeo.innerH * (1 - (yt - chartGeo.min) / (chartGeo.max - chartGeo.min || 1)) + 4"
                fill="var(--app-text-muted-2)"
                class="text-[9px]"
                font-size="10"
              >
                {{ fmt1(yt) }}
              </text>
            </g>
            <path
              v-if="chartGeo.areaD"
              :d="chartGeo.areaD"
              fill="url(#stats-weight-fill)"
            />
            <path
              v-if="!chartGeo.single"
              :d="chartGeo.lineD"
              fill="none"
              stroke="url(#stats-weight-stroke)"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(p, i) in chartGeo.points"
              :key="'pt-' + i"
              :cx="p.x"
              :cy="p.y"
              :r="chartGeo.single ? 5 : 4"
              :fill="chartGeo.single ? 'var(--accent-teal)' : 'var(--app-bg-surface)'"
              :stroke="chartGeo.single ? 'none' : 'var(--accent-teal)'"
              stroke-width="2"
            />
          </svg>
        </div>
      </section>

      <InfoNotice
        v-else
        class="border-dashed border-app-border bg-app-elevated/40"
      >
        <template #icon>
          <IconScale
            class="text-app-text-muted-2"
            stroke-width="1.5"
          />
        </template>
        <p class="m-0 text-[0.8125rem] leading-relaxed text-app-text">
          Ainda não há pesagens suficientes para montar o gráfico. Registre seu
          peso na aba
          <button
            type="button"
            class="font-semibold text-teal-400 underline-offset-2 hover:underline"
            @click="router.push({ name: 'today' })"
          >
            Hoje
          </button>
          .
        </p>
      </InfoNotice>

      <div
        v-if="weightStats"
        class="grid grid-cols-2 gap-2.5"
      >
        <article
          class="rounded-app-lg border border-app-border bg-app-elevated/50 p-3.5"
        >
          <div class="flex items-start gap-2">
            <IconScale
              class="mt-0.5 size-4 shrink-0 text-teal-400"
              stroke-width="2"
            />
            <div class="min-w-0">
              <p
                class="m-0 text-[0.625rem] font-medium uppercase tracking-wide text-app-text-muted-2"
              >
                Variação total
              </p>
              <p
                class="m-0 mt-1 text-lg font-bold tabular-nums leading-tight"
                :class="
                  weightStats.delta < -0.05
                    ? 'text-teal-300'
                    : weightStats.delta > 0.05
                      ? 'text-amber-300'
                      : 'text-app-text'
                "
              >
                {{ fmtSignedKg(weightStats.delta) }}
              </p>
              <p class="m-0 mt-1 text-[0.6875rem] text-app-text-muted">
                Do primeiro ao último registro
              </p>
            </div>
          </div>
        </article>
        <article
          class="rounded-app-lg border border-app-border bg-app-elevated/50 p-3.5"
        >
          <div class="flex items-start gap-2">
            <IconClock
              class="mt-0.5 size-4 shrink-0 text-violet-300"
              stroke-width="2"
            />
            <div class="min-w-0">
              <p
                class="m-0 text-[0.625rem] font-medium uppercase tracking-wide text-app-text-muted-2"
              >
                Jornada
              </p>
              <p
                class="m-0 mt-1 text-lg font-bold leading-tight text-app-text"
              >
                {{ formatJourneyDays(weightStats.durationDays) }}
              </p>
              <p class="m-0 mt-1 text-[0.6875rem] text-app-text-muted">
                Entre a 1ª e a última pesagem
              </p>
            </div>
          </div>
        </article>
        <article
          class="col-span-2 rounded-app-lg border border-app-border bg-app-elevated/50 p-3.5"
        >
          <div class="flex flex-wrap items-start gap-2">
            <IconTrendingDown
              v-if="weightStats.avgPerWeek < -0.02"
              class="mt-0.5 size-4 shrink-0 text-teal-400"
              stroke-width="2"
            />
            <IconTrendingUp
              v-else-if="weightStats.avgPerWeek > 0.02"
              class="mt-0.5 size-4 shrink-0 text-amber-300"
              stroke-width="2"
            />
            <IconMinus
              v-else
              class="mt-0.5 size-4 shrink-0 text-app-text-muted-2"
              stroke-width="2"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p
                  class="m-0 text-[0.625rem] font-medium uppercase tracking-wide text-app-text-muted-2"
                >
                  Média por semana
                </p>
                <Tag
                  v-if="weightStats.projectedWeekly"
                  severity="secondary"
                  class="!bg-app-surface/80 !text-[0.625rem] !font-medium"
                  value="Projetada"
                />
              </div>
              <p
                class="m-0 mt-1 text-lg font-bold tabular-nums leading-tight"
                :class="
                  weightStats.avgPerWeek < -0.02
                    ? 'text-teal-300'
                    : weightStats.avgPerWeek > 0.02
                      ? 'text-amber-300'
                      : 'text-app-text'
                "
              >
                {{ fmtSignedKg(weightStats.avgPerWeek) }}
              </p>
              <p class="m-0 mt-1 text-[0.6875rem] text-app-text-muted">
                Tendência estimada com base no período entre pesagens
              </p>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else-if="weightSeries.length === 1"
        class="rounded-app-lg border border-app-border bg-app-elevated/40 px-3.5 py-3"
      >
        <p class="m-0 text-sm text-app-text-muted">
          Com apenas uma pesagem, o gráfico já aparece acima. Registre outra
          pesagem em dias diferentes para ver variação total, jornada e média
          semanal.
        </p>
      </div>

      <Divider
        align="left"
        type="solid"
        class="!my-1"
      >
        <span
          class="text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
        >Resumo do período</span>
      </Divider>

      <div class="grid grid-cols-2 gap-2.5">
        <article
          class="rounded-app-lg border border-app-border bg-app-surface/80 p-3"
        >
          <div class="flex items-center gap-1.5 text-app-text-muted-2">
            <IconScale
              class="size-3.5"
              stroke-width="2"
            />
            <span class="text-[0.625rem] font-medium">Peso mín. / máx.</span>
          </div>
          <p
            v-if="weightSeries.length"
            class="m-0 mt-1.5 text-sm font-semibold tabular-nums text-app-text"
          >
            {{ fmt1(Math.min(...weightSeries.map((w) => w.kg))) }} ·
            {{ fmt1(Math.max(...weightSeries.map((w) => w.kg))) }}
            <span class="text-xs font-medium text-app-text-muted-2">kg</span>
          </p>
          <p
            v-else
            class="m-0 mt-1.5 text-sm text-app-text-muted"
          >
            —
          </p>
        </article>
        <article
          class="rounded-app-lg border border-app-border bg-app-surface/80 p-3"
        >
          <div class="flex items-center gap-1.5 text-app-text-muted-2">
            <IconCalendarStats
              class="size-3.5"
              stroke-width="2"
            />
            <span class="text-[0.625rem] font-medium">Dias com refeições</span>
          </div>
          <p class="m-0 mt-1.5 text-sm font-semibold tabular-nums text-app-text">
            {{ fmtInt(mealAgg.daysWithMeals) }}
          </p>
        </article>
        <article
          class="rounded-app-lg border border-app-border bg-app-surface/80 p-3"
        >
          <div class="flex items-center gap-1.5 text-app-text-muted-2">
            <IconSoup
              class="size-3.5"
              stroke-width="2"
            />
            <span class="text-[0.625rem] font-medium">Refeições no app</span>
          </div>
          <p class="m-0 mt-1.5 text-sm font-semibold tabular-nums text-app-text">
            {{ fmtInt(mealAgg.totalMeals) }}
          </p>
        </article>
        <article
          class="rounded-app-lg border border-app-border bg-app-surface/80 p-3"
        >
          <div class="flex items-center gap-1.5 text-app-text-muted-2">
            <IconFlame
              class="size-3.5 text-teal-400"
              stroke-width="2"
            />
            <span class="text-[0.625rem] font-medium">Média kcal / dia ativo</span>
          </div>
          <p class="m-0 mt-1.5 text-sm font-semibold tabular-nums text-teal-300">
            {{
              mealAgg.daysWithMeals
                ? fmtInt(mealAgg.avgKcalPerActiveDay)
                : "—"
            }}
            <span
              v-if="mealAgg.daysWithMeals"
              class="text-xs font-medium text-app-text-muted-2"
            >kcal</span>
          </p>
        </article>
      </div>

      <section
        v-if="goalWeight && weightSeries.length"
        class="rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-teal)_45%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-bg-surface)_100%,transparent)_0%,color-mix(in_srgb,var(--app-bg-elevated)_88%,var(--accent-teal)_5%)_100%)] p-3.5"
      >
        <div class="flex items-start gap-2.5">
          <IconTarget
            class="size-5 shrink-0 text-teal-300"
            stroke-width="1.75"
          />
          <div class="min-w-0 flex-1">
            <h3
              class="m-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
            >
              Meta de peso (perfil)
            </h3>
            <p class="m-0 mt-1 text-sm text-app-text-muted">
              Peso atual (última pesagem):
              <strong class="tabular-nums text-app-text">{{
                fmt1(weightSeries[weightSeries.length - 1].kg)
              }}
                kg</strong>
              · Meta:
              <strong class="tabular-nums text-app-text">{{ fmt1(goalWeight) }} kg</strong>
            </p>
            <p
              v-if="goalProgress"
              class="m-0 mt-2 text-[0.8125rem] text-app-text-muted"
            >
              <template v-if="Math.abs(goalProgress.diffToGoal) < 0.05">
                Você está na meta de peso.
              </template>
              <template v-else-if="goalProgress.diffToGoal > 0">
                Faltam
                <strong class="tabular-nums text-teal-300">{{
                  fmt1(goalProgress.diffToGoal)
                }}
                  kg</strong>
                para atingir a meta.
              </template>
              <template v-else>
                Abaixo da meta em
                <strong class="tabular-nums text-amber-300">{{
                  fmt1(Math.abs(goalProgress.diffToGoal))
                }}
                  kg</strong>
                .
              </template>
            </p>
            <ProgressBar
              v-if="goalProgress"
              :value="goalProgress.pct"
              :show-value="false"
              class="mt-3 h-1.5 overflow-hidden rounded-full !bg-app-border [&_.p-progressbar-value]:rounded-full [&_.p-progressbar-value]:bg-gradient-to-r [&_.p-progressbar-value]:from-teal-500 [&_.p-progressbar-value]:to-emerald-400"
            />
          </div>
        </div>
      </section>

      <div class="flex justify-center pb-2 pt-1">
        <Button
          severity="secondary"
          outlined
          size="small"
          class="border-app-border"
          label="Registrar peso e refeições"
          @click="router.push({ name: 'today' })"
        />
      </div>
    </div>
  </div>
</template>
