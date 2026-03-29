<script setup>
import { ref, watch } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import {
  IconRefresh,
  IconLoader2,
  IconSparkles,
  IconCheck,
} from "@tabler/icons-vue";

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
});

const toast = useToast();
const isUpdating = ref(false);

watch(needRefresh, (show) => {
  if (show) {
    toast.add({
      group: "pwa",
      severity: "info",
      summary: "Nova versão disponível",
      detail: "Uma atualização do app está disponível.",
      life: 0,
      closable: false,
      data: { isPwaUpdate: true },
    });
  }
});

function onUpdate(message) {
  if (isUpdating.value) return;
  isUpdating.value = true;
  setTimeout(() => {
    isUpdating.value = false;
    toast.remove(message);
    updateServiceWorker();
  }, 1500);
}
</script>

<template>
  <div
    class="app-container mx-auto w-full max-w-[var(--app-shell-max)]"
  >
    <router-view />
    <Toast
      position="top-center"
      class="pwa-toast"
      group="pwa"
    >
      <template #message="{ message }">
        <div
          v-if="message.data?.isPwaUpdate"
          class="box-border flex w-full min-w-0 items-start gap-3.5 py-1"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-app border border-emerald-400/40 bg-emerald-400/20 text-emerald-400"
            aria-hidden="true"
          >
            <IconRefresh class="size-[1.125rem]" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <span class="text-[0.9375rem] font-semibold leading-snug text-emerald-100">{{
              message.summary
            }}</span>
            <span class="break-words text-[0.8125rem] leading-snug text-emerald-200">{{
              message.detail
            }}</span>
            <Button
              size="small"
              class="mt-3 gap-2"
              :disabled="isUpdating"
              @click="() => onUpdate(message)"
            >
              <IconLoader2
                v-if="isUpdating"
                class="size-4 shrink-0 animate-spin text-current"
                aria-hidden="true"
              />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>
        <div
          v-else
          class="box-border flex w-full min-w-0 items-start gap-3.5 py-1"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-app border border-emerald-400/40 bg-emerald-400/20 text-emerald-400"
            aria-hidden="true"
          >
            <IconCheck
              v-if="message.severity === 'success'"
              class="size-[1.125rem]"
            />
            <IconSparkles
              v-else
              class="size-[1.125rem]"
            />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <span class="text-[0.9375rem] font-semibold leading-snug text-emerald-100">{{
              message.summary
            }}</span>
            <span
              v-if="message.detail"
              class="break-words text-[0.8125rem] leading-snug text-emerald-200"
            >
              {{ message.detail }}
            </span>
          </div>
        </div>
      </template>
    </Toast>
  </div>
</template>
