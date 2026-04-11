<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { IconScale } from "@tabler/icons-vue";

const route = useRoute();
const isActive = computed(() => route.name === "weight");
</script>

<template>
  <RouterLink
    :to="{ name: 'weight' }"
    class="flex size-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-focus-border)] focus-visible:outline-offset-2"
    :class="
      isActive
        ? [
            'border-[rgba(167,139,250,0.45)]',
            'bg-gradient-to-b from-[rgba(167,139,250,0.2)] to-[rgba(139,92,246,0.06)]',
            'text-violet-300',
            'shadow-[0_0_20px_rgba(167,139,250,0.12)]',
          ]
        : [
            'border-transparent',
            'text-app-text-muted-2',
            'hover:border-app-border hover:bg-app-elevated/80 hover:text-violet-300',
          ]
    "
    aria-label="Peso"
    :aria-current="isActive ? 'page' : undefined"
  >
    <IconScale
      class="size-[1.375rem] shrink-0"
      stroke-width="1.5"
      aria-hidden="true"
    />
  </RouterLink>
</template>
