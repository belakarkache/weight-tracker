<script setup>
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, required: true },
});
</script>

<template>
  <header
    class="border-b px-6 pb-4 pt-5"
    style="border-color: var(--app-border); background: var(--app-bg)"
  >
    <div class="min-w-0">
      <slot name="title">
        <h1
          v-if="title"
          class="m-0 text-2xl font-bold leading-tight tracking-[-0.02em]"
          style="color: var(--app-text)"
        >
          {{ title }}
        </h1>
      </slot>
    </div>
    <p
      class="m-0 mt-1 text-[0.8125rem] leading-snug"
      style="color: var(--app-text-muted)"
    >
      {{ subtitle }}
    </p>
  </header>
</template>
