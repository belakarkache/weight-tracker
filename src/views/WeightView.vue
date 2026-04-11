<script setup>
import { computed, onActivated, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  IconScale,
  IconTarget,
  IconPencil,
  IconTrash,
  IconChartLine,
} from "@tabler/icons-vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import AppHeader from "../components/AppHeader.vue";
import AppHeaderStatLink from "../components/AppHeaderStatLink.vue";
import { useOnboarding } from "../composables/useOnboarding";
import {
  useDailyLog,
  dateKeyFromDate,
  latestWeightKgGlobally,
} from "../composables/useDailyLog";
import { hasStatsOverviewData } from "../utils/statsAggregates";

const toast = useToast();
const { getStored: getProfile, save: saveProfile } = useOnboarding();
const profileTick = ref(0);
const dailyLog = useDailyLog();

const hasStatsOverview = computed(() =>
  hasStatsOverviewData(dailyLog.entries.value),
);

const profile = computed(() => {
  profileTick.value;
  return getProfile() ?? {};
});

const todayDate = ref(new Date());

function refreshToday() {
  todayDate.value = new Date();
  dailyLog.refresh();
}

onMounted(refreshToday);
onActivated(refreshToday);

const dayKeyToday = computed(() => dateKeyFromDate(todayDate.value) ?? "");

const weightsToday = computed(() => {
  const dk = dayKeyToday.value;
  if (!dk) return [];
  return dailyLog.getDay(dk).weights ?? [];
});

const lastWeightOnDay = computed(() => {
  const arr = [...weightsToday.value].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  return arr.length ? arr[arr.length - 1] : null;
});

const displayWeight = computed(() => {
  if (lastWeightOnDay.value) {
    return { kg: lastWeightOnDay.value.kg };
  }
  const hist = dailyLog.latestWeightKgBeforeOrOn(todayDate.value);
  if (hist != null) {
    return { kg: hist };
  }
  const pw = Number(profile.value.weight);
  if (pw > 0) {
    return { kg: pw };
  }
  return null;
});

const weightGap = computed(() => {
  const goal = Number(profile.value.goalWeight);
  const cur = displayWeight.value?.kg;
  if (!goal || cur == null) return null;
  const diff = goal - cur;
  const abs = Math.round(Math.abs(diff) * 10) / 10;
  const met = abs < 0.05;
  return {
    met,
    needGain: diff > 0.05,
    needLose: diff < -0.05,
    abs,
    goal,
  };
});

const recentWeights = computed(() => {
  const out = [];
  for (const [dk, day] of Object.entries(dailyLog.entries.value ?? {})) {
    for (const w of day?.weights ?? []) {
      out.push({ ...w, dayKey: dk });
    }
  }
  out.sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  return out.slice(0, 25);
});

const weightGoalDialogOpen = ref(false);
const weightGoalForm = ref(null);

function openWeightGoalDialog() {
  weightGoalForm.value =
    profile.value.goalWeight != null ? Number(profile.value.goalWeight) : null;
  weightGoalDialogOpen.value = true;
}

function saveWeightGoalDialog() {
  const v = Number(weightGoalForm.value);
  if (!v || v <= 0 || v > 400) {
    toast.add({
      group: "pwa",
      severity: "warn",
      summary: "Valor inválido",
      detail: "Informe uma meta de peso válida (kg).",
      life: 3200,
    });
    return;
  }
  saveProfile({ goalWeight: Math.round(v * 10) / 10 });
  profileTick.value++;
  weightGoalDialogOpen.value = false;
  toast.add({
    group: "pwa",
    severity: "success",
    summary: "Meta de peso atualizada",
    detail: "Sincronizado com o perfil.",
    life: 2500,
    closable: false,
  });
}

const removeWeightTarget = ref(null);
const removeWeightDialogOpen = ref(false);

function openRemoveWeight(entry) {
  removeWeightTarget.value = entry;
  removeWeightDialogOpen.value = true;
}

function closeRemoveWeightDialog() {
  removeWeightDialogOpen.value = false;
  removeWeightTarget.value = null;
}

function confirmRemoveWeight() {
  const w = removeWeightTarget.value;
  if (!w?.id || !w?.dayKey) return;
  dailyLog.removeWeight(w.dayKey, w.id);
  const latest = latestWeightKgGlobally(dailyLog.entries.value);
  if (latest != null && Number(latest) > 0) {
    saveProfile({ weight: Number(latest) });
  }
  profileTick.value++;
  closeRemoveWeightDialog();
}

const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
};

function fmt1(n) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtDayLabel(dk) {
  if (typeof dk !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dk)) return dk;
  const [y, m, d] = dk.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

function fmtTime(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
</script>

<template>
  <div class="app-page flex h-full min-h-0 flex-col overflow-hidden text-slate-100">
    <AppHeader
      title="Peso"
      subtitle="Acompanhamento e meta"
    >
      <template
        v-if="hasStatsOverview"
        #actions
      >
        <AppHeaderStatLink />
      </template>
    </AppHeader>

    <div
      class="app-scroll relative z-[1] mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-5 overflow-y-auto px-4 pb-28 pt-4"
    >
      <article
        class="rounded-xl border border-violet-400/35 border-l-4 border-l-violet-400 px-3.5 py-3"
        style="
          background: linear-gradient(
            135deg,
            rgba(167, 139, 250, 0.12) 0%,
            rgba(139, 92, 246, 0.07) 100%
          );
        "
      >
        <div class="mb-2 flex items-center justify-between gap-2.5">
          <div
            class="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-violet-100/95"
          >
            <IconTarget
              class="size-3.5 shrink-0 opacity-95"
              stroke-width="2"
            />
            Peso & meta
          </div>
          <Button
            variant="link"
            size="small"
            class="!min-w-0 shrink-0 !p-0"
            aria-label="Editar meta de peso"
            @click="openWeightGoalDialog"
          >
            <template #icon>
              <IconPencil
                class="size-4 text-violet-100/95"
                stroke-width="2"
              />
            </template>
          </Button>
        </div>
        <div class="flex items-center gap-2.5">
          <IconScale
            class="size-8 shrink-0 text-violet-200/90"
            stroke-width="1.35"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1 space-y-1">
            <p
              v-if="displayWeight"
              class="m-0 text-lg font-bold tabular-nums leading-tight text-violet-50"
            >
              {{ fmt1(displayWeight.kg) }}
              <span class="text-xs font-semibold text-violet-200/80">kg</span>
            </p>
            <p
              v-else
              class="m-0 text-xs text-violet-200/75"
            >
              Sem peso no perfil.
            </p>
            <p
              v-if="weightGap && displayWeight"
              class="m-0 pt-0.5 text-[0.6875rem] leading-snug text-violet-100/85"
            >
              <span class="tabular-nums">Meta {{ fmt1(weightGap.goal) }} kg</span>
              <span class="mx-1 text-violet-300/60">·</span>
              <span
                v-if="weightGap.met"
                class="font-medium text-emerald-200"
                >Na meta</span
              >
              <span
                v-else
                class="font-medium"
                >Faltam {{ fmt1(weightGap.abs) }} kg</span
              >
            </p>
          </div>
        </div>
      </article>

      <RouterLink
        v-if="hasStatsOverview"
        :to="{ name: 'statistics' }"
        class="flex items-center justify-center gap-2 rounded-app-lg border border-app-border bg-app-surface/90 px-4 py-3 text-[0.8125rem] font-medium text-app-text-muted-2 transition-colors hover:border-teal-500/35 hover:text-teal-300"
      >
        <IconChartLine
          class="size-4 shrink-0 text-teal-400/90"
          stroke-width="1.5"
          aria-hidden="true"
        />
        Ver gráficos e estatísticas de peso
      </RouterLink>

      <section
        v-if="recentWeights.length"
        class="rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-violet)_50%,transparent)] bg-app-surface/90 p-3"
      >
        <h2
          class="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
        >
          Registros recentes
        </h2>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li
            v-for="w in recentWeights"
            :key="w.id + w.dayKey"
            class="flex items-center justify-between gap-2 rounded-app-sm border border-app-border bg-app-elevated/60 px-3 py-2"
          >
            <div class="min-w-0">
              <span class="text-sm font-semibold tabular-nums text-app-text"
                >{{ fmt1(w.kg) }} kg</span
              >
              <span
                class="mt-0.5 block text-[0.6875rem] text-app-text-muted-2"
              >
                {{ fmtDayLabel(w.dayKey) }} · {{ fmtTime(w.recordedAt) }}
              </span>
            </div>
            <Button
              text
              rounded
              severity="danger"
              size="small"
              class="!size-9 shrink-0"
              :aria-label="'Excluir pesagem ' + fmt1(w.kg) + ' kg'"
              @click="openRemoveWeight(w)"
            >
              <template #icon>
                <IconTrash
                  class="size-4"
                  stroke-width="1.75"
                />
              </template>
            </Button>
          </li>
        </ul>
      </section>

      <p
        v-else
        class="m-0 text-center text-[0.8125rem] text-app-text-muted-2"
      >
        Nenhuma pesagem registrada ainda. Use o botão “Peso” na tela Hoje.
      </p>
    </div>

    <Dialog
      v-model:visible="weightGoalDialogOpen"
      modal
      header="Meta de peso"
      class="app-dialog"
      :style="appDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-[0.8125rem] leading-relaxed text-slate-300">
          Este é o mesmo valor de
          <strong class="text-slate-100">meta de peso</strong> do seu perfil.
          Alterar aqui atualiza o perfil.
        </p>
        <div>
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            for="weight-view-goal-kg"
            >Meta (kg)</label
          >
          <InputNumber
            id="weight-view-goal-kg"
            v-model="weightGoalForm"
            :min="0"
            :max="400"
            locale="pt-BR"
            :min-fraction-digits="0"
            :max-fraction-digits="1"
            class="w-full"
            input-class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="weightGoalDialogOpen = false"
          />
          <Button
            label="Salvar"
            size="small"
            @click="saveWeightGoalDialog"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="removeWeightDialogOpen"
      modal
      header="Excluir pesagem?"
      class="app-dialog"
      :style="appDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p
          v-if="removeWeightTarget"
          class="m-0 text-sm text-app-text-muted"
        >
          Remover {{ fmt1(removeWeightTarget.kg) }} kg deste dia? Esta ação não
          pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="closeRemoveWeightDialog"
          />
          <Button
            label="Excluir"
            severity="danger"
            size="small"
            @click="confirmRemoveWeight"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
