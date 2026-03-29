<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { IconChartBar } from "@tabler/icons-vue";

const route = useRoute();
const isActive = computed(() => route.name === "statistics");
</script>

<template>
  <RouterLink
    :to="{ name: 'statistics' }"
    class="flex size-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-focus-border)] focus-visible:outline-offset-2"
    :class="
      isActive
        ? [
            'border-[rgba(45,212,191,0.45)]',
            'bg-gradient-to-b from-[rgba(45,212,191,0.2)] to-[rgba(52,211,153,0.06)]',
            'text-[var(--accent-teal)]',
            'shadow-[0_0_20px_rgba(45,212,191,0.12)]',
          ]
        : [
            'border-transparent',
            'text-app-text-muted-2',
            'hover:border-app-border hover:bg-app-elevated/80 hover:text-[var(--accent-teal)]',
          ]
    "
    aria-label="Estatísticas"
    :aria-current="isActive ? 'page' : undefined"
  >
    <IconChartBar
      class="size-[1.375rem] shrink-0"
      stroke-width="1.5"
      aria-hidden="true"
    />
  </RouterLink>
</template>
