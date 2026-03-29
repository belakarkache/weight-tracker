<script setup>
import { ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import InfoNotice from "../components/InfoNotice.vue";
import HighlightNotice from "../components/HighlightNotice.vue";
import {
  IconSparkles,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-vue";

const inputText = ref("");
const inputNumber = ref(null);
const unit = ref("g");
const isOpen = ref(false);
const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
};

const unitOptions = [
  { label: "Gramas (g)", value: "g" },
  { label: "Mililitros (ml)", value: "ml" },
  { label: "Unidade (un)", value: "un" },
];

const palette = [
  { label: "Background", var: "--app-bg" },
  { label: "Surface", var: "--app-bg-surface" },
  { label: "Elevated", var: "--app-bg-elevated" },
  { label: "Border", var: "--app-border" },
  { label: "Border hover", var: "--app-border-hover" },
  { label: "Text", var: "--app-text" },
  { label: "Muted", var: "--app-text-muted" },
  { label: "Muted 2", var: "--app-text-muted-2" },
  { label: "Focus border", var: "--app-focus-border" },
  { label: "Focus ring", var: "--app-focus-ring" },
  { label: "Accent teal", var: "--accent-teal" },
  { label: "Accent emerald", var: "--accent-emerald" },
  { label: "Accent amber", var: "--accent-amber" },
  { label: "Accent rose", var: "--accent-rose" },
  { label: "Accent violet", var: "--accent-violet" },
];
</script>

<template>
  <div class="app-page flex h-full min-h-0 flex-col overflow-hidden">
    <AppHeader
      title="Design System (teste)"
      subtitle="Tela temporária para validar estilos e componentes"
    >
    </AppHeader>

    <div class="ds-page ds-stack min-h-0 flex-1 overflow-y-auto">
      <section class="ds-section">
        <h2 class="ds-section-title">Paleta do projeto</h2>
        <p class="ds-section-subtitle">
          Variáveis CSS usadas como fonte única de cores no app.
        </p>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="c in palette"
            :key="c.var"
            class="flex items-center gap-3 rounded-app-lg border border-app-border bg-[color-mix(in_srgb,var(--app-bg-elevated)_75%,transparent)] p-3"
          >
            <div
              class="h-9 w-9 shrink-0 rounded-app border border-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              :style="{ background: `var(${c.var})` }"
            />
            <div class="min-w-0">
              <div class="text-[0.8125rem] font-bold leading-tight text-app-text">
                {{ c.label }}
              </div>
              <code
                class="mt-1 inline-block rounded-app-sm border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-xs text-app-text-muted"
              >{{ c.var }}</code>
            </div>
          </div>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section-title">Tipografia e chips</h2>
        <p class="ds-section-subtitle">
          Texto padrão, muted e elementos de destaque usando a paleta do app.
        </p>

        <div class="flex flex-wrap gap-2">
          <span class="ds-chip ds-chip--teal">
            <IconSparkles class="size-4 shrink-0" stroke-width="1.5" />
            Destaque
          </span>
          <span class="ds-chip ds-chip--amber">
            <IconAlertTriangle class="size-4 shrink-0" stroke-width="1.5" />
            Atenção
          </span>
          <span class="ds-chip ds-chip--rose">
            <IconInfoCircle class="size-4 shrink-0" stroke-width="1.5" />
            Info
          </span>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section-title">Inputs (PrimeVue)</h2>
        <p class="ds-section-subtitle">
          Fundo, borda e foco devem seguir o padrão do projeto.
        </p>

        <div class="ds-grid-2">
          <div class="ds-field">
            <label for="ds-inputtext" class="ds-label">InputText</label>
            <InputText
              id="ds-inputtext"
              v-model="inputText"
              placeholder="Digite aqui..."
              class="w-full"
            />
            <div class="ds-help">
              Placeholder e foco devem ficar consistentes.
            </div>
          </div>

          <div class="ds-field">
            <label for="ds-inputnumber" class="ds-label">InputNumber</label>
            <InputNumber
              id="ds-inputnumber"
              v-model="inputNumber"
              :min="0"
              :max="9999"
              placeholder="0"
              class="w-full"
              input-class="w-full"
            />
            <div class="ds-help">Componente numérico com mesmo fundo/borda.</div>
          </div>

          <div class="ds-field">
            <label for="ds-select" class="ds-label">Select</label>
            <Select
              inputId="ds-select"
              v-model="unit"
              :options="unitOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              fluid
            />
            <div class="ds-help">Overlay e item selecionado no padrão (PrimeVue Select).</div>
          </div>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section-title">Botões (PrimeVue)</h2>
        <p class="ds-section-subtitle">
          Primary, secondary e outlined, com estados de foco.
        </p>

        <div class="flex flex-wrap gap-2">
          <Button>
            <IconCheck class="size-5" stroke-width="1.5" />
            <span class="ml-2">Primário</span>
          </Button>
          <Button severity="secondary">Secundário</Button>
          <Button severity="secondary" outlined>Outlined</Button>
          <Button severity="danger" outlined>Danger</Button>
          <Button severity="secondary" size="small" outlined @click="isOpen = true">
            Abrir Dialog
          </Button>
        </div>
      </section>

      <section class="ds-section">
        <h2 class="ds-section-title">Notices do projeto</h2>
        <p class="ds-section-subtitle">
          Componentes existentes (InfoNotice/HighlightNotice).
        </p>

        <div class="ds-stack">
          <InfoNotice>
            <template #icon>
              <IconInfoCircle stroke-width="1.5" />
            </template>
            Isso é um <strong>InfoNotice</strong> padrão.
          </InfoNotice>

          <InfoNotice type="warning">
            <template #icon>
              <IconAlertTriangle stroke-width="1.5" />
            </template>
            Isso é um <strong>InfoNotice</strong> de aviso.
          </InfoNotice>

          <HighlightNotice>
            Um <strong>HighlightNotice</strong> para destacar algo importante.
          </HighlightNotice>
        </div>
      </section>
    </div>

    <Dialog
      v-model:visible="isOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      header="Dialog (teste)"
      :style="appDialogStyle"
    >
      <div class="ds-card">
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          Conteúdo de teste para validar superfícies/bordas/sombras no Dialog.
        </p>
      </div>
    </Dialog>
  </div>
</template>

