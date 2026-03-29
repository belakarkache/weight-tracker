<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useOnboarding } from "../composables/useOnboarding";
import { wipeAllAppLocalStorage } from "../utils/wipeAppStorage";
import { hapticLight, hapticMedium } from "../composables/useHaptics";
import AppHeader from "../components/AppHeader.vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import RadioButtonGroup from "primevue/radiobuttongroup";
import RadioButton from "primevue/radiobutton";
import Listbox from "primevue/listbox";
import HighlightNotice from "../components/HighlightNotice.vue";
import {
  IconActivity,
  IconTrash,
  IconDeviceFloppy,
  IconArmchair,
  IconWalk,
  IconBike,
  IconRun,
  IconBarbell,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const { getStored, save } = useOnboarding();

const form = ref({
  height: null,
  weight: null,
  age: null,
  sex: null,
  activityLevel: null,
  calorieDeficit: null,
  goalWeight: null,
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

function idealWeightRange(heightCm) {
  if (!heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const minKg = Math.round(18.5 * heightM * heightM);
  const maxKg = Math.round(24.9 * heightM * heightM);
  return { minKg, maxKg };
}

const idealWeight = computed(() => idealWeightRange(form.value.height));

const isFormComplete = computed(() => {
  const profileData = form.value;
  return (
    profileData.height !== null &&
    profileData.weight !== null &&
    profileData.age !== null &&
    !!profileData.sex &&
    !!profileData.activityLevel &&
    !!profileData.calorieDeficit &&
    profileData.goalWeight !== null
  );
});

const isClearDialogOpen = ref(false);
const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
};

function loadStored() {
  const storedProfile = getStored();
  if (storedProfile) {
    form.value = {
      height: storedProfile.height ?? null,
      weight: storedProfile.weight ?? null,
      age: storedProfile.age ?? null,
      sex: storedProfile.sex ?? null,
      activityLevel: storedProfile.activityLevel ?? null,
      calorieDeficit: storedProfile.calorieDeficit ?? null,
      goalWeight: storedProfile.goalWeight ?? null,
    };
  }
}

function submit() {
  if (!isFormComplete.value) {
    toast.add({
      group: "pwa",
      severity: "warn",
      summary: "Formulário incompleto",
      detail: "Preencha todos os campos antes de salvar.",
      life: 3500,
    });
    return;
  }
  save({
    height: form.value.height,
    weight: form.value.weight,
    age: form.value.age,
    sex: form.value.sex,
    activityLevel: form.value.activityLevel,
    calorieDeficit: form.value.calorieDeficit,
    goalWeight: form.value.goalWeight,
  });
  hapticLight();
  toast.add({
    group: "pwa",
    severity: "success",
    summary: "Perfil atualizado",
    detail: "Seus dados foram salvos.",
    life: 3000,
    closable: false,
  });
}

function openClearConfirm() {
  isClearDialogOpen.value = true;
}

function closeClearConfirm() {
  isClearDialogOpen.value = false;
}

function confirmClear() {
  isClearDialogOpen.value = false;
  hapticMedium();
  wipeAllAppLocalStorage();
  router.replace({ name: "onboarding" });
}

onMounted(loadStored);
</script>

<template>
  <div class="app-page min-h-full flex flex-col">
    <AppHeader
      title="Perfil"
      subtitle="Ajuste seu perfil para melhorar os cálculos"
    />
    <div class="flex flex-1 flex-col gap-5 px-4 pb-8 pt-4 w-full mx-auto">
      <form
        class="flex flex-col gap-6"
        @submit.prevent="submit"
      >
        <section
          class="bg-app-surface border border-app-border rounded-app-lg px-4 py-5"
        >
          <h2 class="m-0 mb-4 text-[0.9375rem] font-semibold text-app-text">
            Dados físicos
          </h2>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label
                for="profile-height"
                class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Altura (cm)</label
              >
              <InputNumber
                id="profile-height"
                v-model="form.height"
                :min="100"
                :max="250"
                suffix=" cm"
                placeholder="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label
                for="profile-weight"
                class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Peso atual (kg)</label
              >
              <InputNumber
                id="profile-weight"
                v-model="form.weight"
                :min="30"
                :max="300"
                suffix=" kg"
                placeholder="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label
                for="profile-age"
                class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Idade (anos)</label
              >
              <InputNumber
                id="profile-age"
                v-model="form.age"
                :min="10"
                :max="120"
                placeholder="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <span class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Sexo biológico</span
              >
              <RadioButtonGroup
                v-model="form.sex"
                name="profile-sex"
              >
                <div class="flex flex-col gap-3">
                  <div
                    v-for="opt in sexOptions"
                    :key="opt.value"
                    class="radio-option-row flex items-center gap-3"
                  >
                    <RadioButton
                      :inputId="'profile-sex-' + opt.value"
                      :value="opt.value"
                    />
                    <label
                      :for="'profile-sex-' + opt.value"
                      class="text-sm text-app-text cursor-pointer select-none"
                    >
                      {{ opt.label }}
                    </label>
                  </div>
                </div>
              </RadioButtonGroup>
            </div>
          </div>
        </section>

        <section
          class="bg-app-surface border border-app-border rounded-app-lg px-4 py-5"
        >
          <h2 class="m-0 mb-4 text-[0.9375rem] font-semibold text-app-text">
            Atividade e meta
          </h2>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <span class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Nível de atividade física</span
              >
              <Listbox
                v-model="form.activityLevel"
                :options="activityOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                list-style="max-height: 220px"
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
            <div class="flex flex-col gap-2">
              <span class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Déficit calórico desejado</span
              >
              <Listbox
                v-model="form.calorieDeficit"
                :options="deficitOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                list-style="max-height: 180px"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label
                for="profile-goalWeight"
                class="text-[0.8125rem] font-medium text-app-text-muted-2"
                >Meta de peso (kg)</label
              >
              <HighlightNotice
                v-if="idealWeight"
                class="mb-1"
              >
                <p class="text-sm">
                  Faixa de peso ideal para sua altura:
                  <strong class="text-emerald-300">
                    {{ idealWeight.minKg }} kg a {{ idealWeight.maxKg }} kg
                  </strong>
                </p>
              </HighlightNotice>
              <InputNumber
                id="profile-goalWeight"
                v-model="form.goalWeight"
                :min="30"
                :max="300"
                suffix=" kg"
                placeholder="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
          </div>
        </section>

        <div class="flex justify-stretch mt-6">
          <Button
            type="submit"
            label="Salvar alterações"
            class="flex-1"
            :disabled="!isFormComplete"
          >
            <template #icon>
              <IconDeviceFloppy
                class="size-5"
                stroke-width="1.5"
              />
            </template>
          </Button>
        </div>
      </form>

      <div class="flex justify-stretch">
        <Button
          label="Apagar todos os dados"
          outlined
          severity="danger"
          class="flex-1"
          @click="openClearConfirm"
        >
          <template #icon>
            <IconTrash
              class="size-5"
              stroke-width="1.5"
            />
          </template>
        </Button>
      </div>
    </div>

    <Dialog
      v-model:visible="isClearDialogOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      header="Remover todos os dados"
      :style="appDialogStyle"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-sm leading-relaxed text-app-text">
          Serão apagados o perfil, ingredientes, refeições, pesagens e qualquer
          outro registro guardado neste aparelho. Esta ação não pode ser
          desfeita. Você voltará à configuração inicial. Deseja continuar?
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <Button
            severity="secondary"
            outlined
            @click="closeClearConfirm"
            >Cancelar</Button
          >
          <Button
            severity="danger"
            @click="confirmClear"
            >Remover</Button
          >
        </div>
      </div>
    </Dialog>
  </div>
</template>
