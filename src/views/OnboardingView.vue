<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import Stepper from "primevue/stepper";
import StepList from "primevue/steplist";
import StepItem from "primevue/stepitem";
import StepPanels from "primevue/steppanels";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import Listbox from "primevue/listbox";
import RadioButtonGroup from "primevue/radiobuttongroup";
import RadioButton from "primevue/radiobutton";
import InfoNotice from "../components/InfoNotice.vue";
import HighlightNotice from "../components/HighlightNotice.vue";
import { useOnboarding } from "../composables/useOnboarding";
import {
  IconRuler,
  IconScale,
  IconCalendar,
  IconGenderMale,
  IconActivity,
  IconFlame,
  IconTarget,
  IconChevronRight,
  IconChevronLeft,
  IconCheck,
  IconShield,
  IconArmchair,
  IconWalk,
  IconBike,
  IconRun,
  IconBarbell,
  IconAlertHexagon,
  IconHelpHexagon,
} from "@tabler/icons-vue";

const router = useRouter();
const { data, save, complete } = useOnboarding();

const showIntro = ref(true);
const currentStep = ref(0);

function startOnboarding() {
  showIntro.value = false;
}
const totalSteps = 7;

const form = ref({
  height: data.height ?? null,
  weight: data.weight ?? null,
  age: data.age ?? null,
  sex: data.sex ?? null,
  activityLevel: data.activityLevel ?? null,
  calorieDeficit: data.calorieDeficit ?? null,
  goalWeight: data.goalWeight ?? null,
});

const sexOptions = [
  { label: "Masculino", value: "male" },
  { label: "Feminino", value: "female" },
  { label: "Prefiro não informar", value: "unspecified" },
];

const activityOptions = [
  { label: "Sedentário (pouco ou nenhum)", value: "sedentary" },
  { label: "Leve (1–3 dias/semana)", value: "light" },
  { label: "Moderado (3–5 dias/semana)", value: "moderate" },
  { label: "Ativo (6–7 dias/semana)", value: "active" },
  { label: "Muito ativo (atleta, trabalho físico)", value: "very_active" },
];

const deficitOptions = [
  { label: "Leve (cerca de 250 kcal/dia)", value: "low" },
  { label: "Moderado (cerca de 500 kcal/dia)", value: "moderate" },
  { label: "Agressivo (cerca de 750 kcal/dia)", value: "aggressive" },
];

function getActivityIcon(option) {
  const icons = {
    sedentary: IconArmchair,
    light: IconWalk,
    moderate: IconBike,
    active: IconRun,
    very_active: IconBarbell,
  };
  return icons[option?.value] ?? IconActivity;
}

watch(
  currentStep,
  (step) => {
    if (step === 5 && form.value.calorieDeficit == null) {
      form.value.calorieDeficit = deficitOptions[0].value;
    }
  },
  { immediate: true },
);

const stepLabels = [
  "Altura",
  "Peso",
  "Idade",
  "Sexo",
  "Atividade",
  "Déficit",
  "Meta",
];

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return form.value.height != null && form.value.height > 0;
    case 1:
      return form.value.weight != null && form.value.weight > 0;
    case 2:
      return (
        form.value.age != null && form.value.age >= 10 && form.value.age <= 120
      );
    case 3:
      return form.value.sex != null;
    case 4:
      return form.value.activityLevel != null;
    case 5:
      return form.value.calorieDeficit != null;
    case 6:
      return form.value.goalWeight != null && form.value.goalWeight > 0;
    default:
      return false;
  }
});

function persistStep() {
  save({
    height: form.value.height,
    weight: form.value.weight,
    age: form.value.age,
    sex: form.value.sex,
    activityLevel: form.value.activityLevel,
    calorieDeficit: form.value.calorieDeficit,
    goalWeight: form.value.goalWeight,
  });
}

function next() {
  if (!canProceed.value && currentStep.value < 6) return;
  persistStep();
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++;
  } else {
    complete(form.value);
    router.replace({ name: "today" });
  }
}

const stepInputIds = [
  "height",
  "weight",
  "age",
  null,
  null,
  null,
  "goalWeight",
];

function onStepInputEnter(e) {
  e.preventDefault();
  if (!canProceed.value && currentStep.value < 6) return;
  const wasOnLastStep = currentStep.value === 6;
  next();
  if (wasOnLastStep) return;
  nextTick(() => {
    const id = stepInputIds[currentStep.value];
    if (id) {
      const el = document.getElementById(id);
      const input = el?.querySelector?.("input") ?? el;
      input?.focus();
    }
  });
}

function prev() {
  if (currentStep.value > 0) currentStep.value--;
}

function idealWeightRange(heightCm) {
  if (!heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const minKg = Math.round(18.5 * heightM * heightM);
  const maxKg = Math.round(24.9 * heightM * heightM);
  return { minKg, maxKg };
}

const idealWeight = computed(() => idealWeightRange(form.value.height));

const goalEstimate = ref(null);
let goalEstimateTimeout;

function computeGoalEstimate() {
  const current = Number(form.value.weight);
  const goal = Number(form.value.goalWeight);
  const deficitKey = form.value.calorieDeficit;
  const activityKey = form.value.activityLevel;

  if (!current || !goal || !deficitKey || !activityKey || current === goal) {
    return null;
  }

  const isLosing = current > goal;
  const kgDelta = Math.abs(current - goal);

  const baseDeficitMap = {
    low: 250,
    moderate: 500,
    aggressive: 750,
  };

  const activityMultiplierMap = {
    sedentary: 0.9,
    light: 1,
    moderate: 1.1,
    active: 1.2,
    very_active: 1.3,
  };

  const baseDeficit = baseDeficitMap[deficitKey] ?? 500;
  const activityMultiplier = activityMultiplierMap[activityKey] ?? 1;
  const dailyDeficit = baseDeficit * activityMultiplier;

  if (!dailyDeficit || dailyDeficit <= 0) {
    return null;
  }

  const caloriesPerKg = 7700;
  const totalCalories = kgDelta * caloriesPerKg;
  const days = totalCalories / dailyDeficit;
  const roundedDays = Math.round(days);
  const weeks = roundedDays / 7;

  let timeText;
  if (weeks < 2) {
    timeText = `${roundedDays} dias`;
  } else if (weeks < 8) {
    const roundedWeeks = Math.round(weeks * 2) / 2;
    timeText = `cerca de ${roundedWeeks.toString().replace(".", ",")} semanas`;
  } else {
    const months = weeks / 4.345;
    const roundedMonths = Math.round(months * 10) / 10;
    timeText = `aprox. ${roundedMonths.toString().replace(".", ",")} meses`;
  }

  return {
    kgDelta: Number(kgDelta.toFixed(1)),
    isLosing,
    days: roundedDays,
    timeText,
  };
}

watch(
  () => form.value.goalWeight,
  () => {
    if (goalEstimateTimeout) {
      clearTimeout(goalEstimateTimeout);
    }
    goalEstimateTimeout = setTimeout(() => {
      goalEstimate.value = computeGoalEstimate();
    }, 600);
  },
);

watch(
  () => [
    form.value.weight,
    form.value.calorieDeficit,
    form.value.activityLevel,
  ],
  () => {
    goalEstimate.value = computeGoalEstimate();
  },
);

watch(currentStep, (step) => {
  if (step === 6) {
    goalEstimate.value = computeGoalEstimate();
  }
});

const stepColors = [
  "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.35)]",
  "border-amber-400/80 bg-amber-500/20 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)]",
  "border-violet-400/80 bg-violet-500/20 text-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.3)]",
  "border-rose-400/80 bg-rose-500/20 text-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.25)]",
  "border-emerald-400/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.3)]",
  "border-orange-400/80 bg-orange-500/20 text-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.25)]",
  "border-cyan-400/80 bg-cyan-500/20 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.3)]",
];
function stepActiveClass(i) {
  return stepColors[i] ?? stepColors[0];
}
</script>

<template>
  <div
    class="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(165deg,var(--app-bg)_0%,var(--app-bg-surface)_45%,#0e1419_100%)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-slate-100"
  >
    <div class="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <div
        class="absolute -right-20 -top-[120px] h-80 w-80 rounded-full bg-teal-400/12 blur-[80px] opacity-40"
      />
      <div
        class="absolute bottom-[20%] -left-[100px] h-[280px] w-[280px] rounded-full bg-violet-400/10 blur-[80px] opacity-40"
      />
      <div
        class="absolute -bottom-10 right-[15%] h-[200px] w-[200px] rounded-full bg-emerald-400/8 blur-[80px] opacity-40"
      />
    </div>

    <main
      v-if="showIntro"
      class="relative flex-1 overflow-auto px-4 sm:px-6 py-6 pt-8 flex flex-col items-center justify-center min-h-0"
    >
      <div class="intro-content max-w-md mx-auto w-full text-center space-y-6">
        <div
          class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-teal-400/40 bg-teal-500/15 text-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.2)]"
        >
          <IconScale
            class="size-12"
            stroke-width="1.2"
          />
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-100">
          Weight Tracker
        </h1>
        <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
          Acompanhe seu peso, defina metas e acompanhe sua evolução com base no
          seu perfil e objetivos.
        </p>
        <InfoNotice>
          <template #icon>
            <IconShield stroke-width="1.5" />
          </template>
          <p class="text-xs leading-relaxed text-left">
            As informações coletadas são usadas apenas para os cálculos do app.
            Seus dados não são compartilhados com ninguém e ficam armazenados
            apenas no seu dispositivo.
          </p>
        </InfoNotice>
        <Button
          label="Começar"
          size="large"
          class="w-full sm:w-auto min-w-[200px] mt-2 font-semibold"
          @click="startOnboarding"
        />
      </div>
    </main>

    <template v-else>
      <main class="relative flex-1 overflow-auto px-4 sm:px-6 py-6 pt-8">
        <Stepper
          v-model="currentStep"
          :linear="true"
          class="mb-8"
        >
          <StepList
            class="flex flex-wrap gap-2 justify-center sm:justify-start"
          >
            <StepItem
              v-for="(label, i) in stepLabels"
              :key="i"
              :value="i"
              class="cursor-default pointer-events-none"
            >
              <span class="flex items-center gap-1.5 text-sm">
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 step-badge"
                  :class="
                    currentStep === i
                      ? stepActiveClass(i)
                      : currentStep > i
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'border-slate-600 text-slate-500'
                  "
                >
                  <IconCheck
                    v-if="currentStep > i"
                    class="size-4"
                  />
                  <span v-else>{{ i + 1 }}</span>
                </span>
                <span
                  class="hidden lg:inline"
                  :class="
                    currentStep === i
                      ? 'text-slate-100 font-medium'
                      : 'text-slate-400'
                  "
                >
                  {{ label }}
                </span>
              </span>
            </StepItem>
          </StepList>

          <div class="mt-4 h-1 overflow-hidden rounded-full bg-app-elevated">
            <div
              class="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ease-out"
              :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
            />
          </div>

          <StepPanels class="mt-6">
            <div
              v-show="currentStep === 0"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-teal-400/40 bg-teal-500/15 text-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.2)]"
              >
                <IconRuler
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Qual é a sua altura?
              </h2>
              <label
                for="height"
                class="block text-sm font-medium text-slate-400 mb-2"
                >Altura (cm)</label
              >
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
                @keydown.enter.prevent="onStepInputEnter"
              >
                <InputNumber
                  id="height"
                  v-model="form.height"
                  :min="100"
                  :max="250"
                  suffix=" cm"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                  @blur="persistStep()"
                />
              </div>
            </div>
            <div
              v-show="currentStep === 1"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15 text-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.15)]"
              >
                <IconScale
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Qual é o seu peso atual?
              </h2>
              <label
                for="weight"
                class="block text-sm font-medium text-slate-400 mb-2"
                >Peso atual (kg)</label
              >
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
                @keydown.enter.prevent="onStepInputEnter"
              >
                <InputNumber
                  id="weight"
                  v-model="form.weight"
                  :min="30"
                  :max="300"
                  suffix=" kg"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                  @blur="persistStep()"
                />
              </div>
            </div>
            <div
              v-show="currentStep === 2"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 text-violet-400 shadow-[0_0_24px_rgba(167,139,250,0.2)]"
              >
                <IconCalendar
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Qual é a sua idade?
              </h2>
              <label
                for="age"
                class="block text-sm font-medium text-slate-400 mb-2"
                >Idade (anos)</label
              >
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
                @keydown.enter.prevent="onStepInputEnter"
              >
                <InputNumber
                  id="age"
                  v-model="form.age"
                  :min="10"
                  :max="120"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                  @blur="persistStep()"
                />
              </div>
            </div>
            <div
              v-show="currentStep === 3"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/15 text-rose-400 shadow-[0_0_24px_rgba(251,113,133,0.15)]"
              >
                <IconGenderMale
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Qual é o seu sexo biológico?
              </h2>
              <InfoNotice>
                <template #icon>
                  <IconHelpHexagon stroke-width="1.5" />
                </template>
                <p class="text-xs leading-relaxed text-left">
                  Não tem relação com identidade de gênero. O sexo biológico é
                  coletado apenas para realizar os cálculos metabólicos.
                </p>
              </InfoNotice>
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
              >
                <RadioButtonGroup
                  v-model="form.sex"
                  name="sex"
                  @update:modelValue="persistStep"
                >
                  <div class="flex flex-col gap-3">
                    <div
                      v-for="opt in sexOptions"
                      :key="opt.value"
                      class="radio-option-row flex items-center gap-3"
                    >
                      <RadioButton
                        :inputId="'sex-' + opt.value"
                        :value="opt.value"
                      />
                      <label
                        :for="'sex-' + opt.value"
                        class="text-sm text-slate-200 cursor-pointer select-none"
                      >
                        {{ opt.label }}
                      </label>
                    </div>
                  </div>
                </RadioButtonGroup>
              </div>
              <InfoNotice
                v-if="form.sex === 'unspecified'"
                type="warning"
              >
                <template #icon>
                  <IconAlertHexagon stroke-width="1.5" />
                </template>
                <p class="text-xs leading-relaxed text-left">
                  Os cálculos serão realizados com estimativas médias e podem
                  não refletir o cenário real.
                </p>
              </InfoNotice>
            </div>
            <div
              v-show="currentStep === 4"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
              >
                <IconActivity
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Nível de atividade física
              </h2>
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
              >
                <Listbox
                  v-model="form.activityLevel"
                  :options="activityOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                  list-style="max-height: 280px"
                  @change="persistStep"
                >
                  <template #option="{ option }">
                    <div class="flex items-center gap-3">
                      <component
                        :is="getActivityIcon(option)"
                        class="size-5 shrink-0 text-slate-300"
                        stroke-width="1.5"
                      />
                      <span>{{ option.label }}</span>
                    </div>
                  </template>
                </Listbox>
              </div>
            </div>
            <div
              v-show="currentStep === 5"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-orange-400/40 bg-orange-500/15 text-orange-400 shadow-[0_0_24px_rgba(251,146,60,0.15)]"
              >
                <IconFlame
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Nível de déficit calórico desejado
              </h2>
              <div
                class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
              >
                <Listbox
                  v-model="form.calorieDeficit"
                  :options="deficitOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                  list-style="max-height: 220px"
                  @change="persistStep"
                />
              </div>
            </div>
            <div
              v-show="currentStep === 6"
              class="animate-step-in mx-auto max-w-md space-y-6"
            >
              <div
                class="mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
              >
                <IconTarget
                  class="size-12"
                  stroke-width="1.2"
                />
              </div>
              <h2 class="text-lg font-medium text-slate-100 text-center">
                Qual é a sua meta de peso?
              </h2>
              <HighlightNotice v-if="idealWeight">
                <p class="text-sm text-center">
                  Faixa de peso ideal para sua altura:
                  <strong class="text-emerald-300">
                    {{ idealWeight.minKg }} kg a {{ idealWeight.maxKg }} kg
                  </strong>
                  — peso saudável (IMC 18,5–24,9)
                </p>
              </HighlightNotice>
              <label
                for="goalWeight"
                class="block text-sm font-medium text-slate-400 mb-2"
                >Meta de peso (kg)</label
              >
              <div class="space-y-3">
                <div
                  class="mt-3 rounded-xl border border-app-border bg-app-elevated p-3"
                  @keydown.enter.prevent="onStepInputEnter"
                >
                  <InputNumber
                    id="goalWeight"
                    v-model="form.goalWeight"
                    :min="30"
                    :max="300"
                    suffix=" kg"
                    placeholder="0"
                    class="w-full"
                    input-class="w-full"
                    @blur="persistStep()"
                  />
                </div>
                <InfoNotice v-if="goalEstimate">
                  <template #icon>
                    <IconHelpHexagon stroke-width="1.5" />
                  </template>
                  <div class="space-y-1 text-xs leading-relaxed text-left">
                    <p>
                      Com o déficit e nível de atividade informados, você
                      levaria
                      <span class="text-emerald-300 font-semibold">
                        {{ goalEstimate.timeText }}
                      </span>
                      para chegar em
                      <span class="text-emerald-300 font-semibold">
                        {{ form.goalWeight }} kg
                      </span>
                      <span v-if="goalEstimate.isLosing">
                        perdendo cerca de
                        <span class="text-emerald-300 font-semibold">
                          {{ goalEstimate.kgDelta }} kg
                        </span>
                      </span>
                      <span v-else>
                        ganhando cerca de
                        <span class="text-emerald-300 font-semibold">
                          {{ goalEstimate.kgDelta }} kg
                        </span>
                      </span>
                    </p>
                    <p class="text-[0.7rem] text-slate-500">
                      É uma estimativa aproximada, usando ~7.700 kcal por kg de
                      gordura corporal e o seu ritmo estimado de variação de
                      peso com base nas informações de déficit/atividade. Não
                      substitui orientação profissional nem considera todas as
                      variáveis do seu dia a dia.
                    </p>
                  </div>
                </InfoNotice>
              </div>
            </div>
          </StepPanels>
        </Stepper>
      </main>

      <footer
        class="relative border-t border-app-border bg-[color-mix(in_srgb,var(--app-bg-surface)_85%,transparent)] pt-4 pb-4 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] backdrop-blur-sm sm:pt-6 sm:pb-6 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]"
      >
        <div class="flex gap-3 justify-end">
          <Button
            v-if="currentStep > 0"
            label="Voltar"
            severity="secondary"
            icon-pos="left"
            class="gap-2"
            @click="prev"
          >
            <template #icon>
              <IconChevronLeft class="size-5" />
            </template>
          </Button>
          <Button
            :label="currentStep === totalSteps - 1 ? 'Concluir' : 'Continuar'"
            icon-pos="right"
            :disabled="!canProceed"
            class="gap-2"
            @click="next"
          >
            <template #icon>
              <IconChevronRight
                v-if="currentStep < totalSteps - 1"
                class="size-5"
              />
              <IconCheck
                v-else
                class="size-5"
              />
            </template>
          </Button>
        </div>
      </footer>
    </template>
  </div>
</template>
