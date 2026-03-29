<script setup>
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, required: true },
  subtitleClass: { type: String, default: "" },
});
</script>

<template>
  <header
    class="border-b px-6 pb-4 pt-5"
    style="border-color: var(--app-border); background: var(--app-bg)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1 flex flex-col gap-0.5">
        <slot name="title">
          <h1
            v-if="title"
            class="m-0 text-2xl font-bold leading-tight tracking-[-0.02em]"
            style="color: var(--app-text)"
          >
            {{ title }}
          </h1>
        </slot>
        <p
          class="m-0 text-[0.8125rem] leading-snug"
          :class="subtitleClass"
          style="color: var(--app-text-muted)"
        >
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex shrink-0 items-center gap-1 self-start"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
