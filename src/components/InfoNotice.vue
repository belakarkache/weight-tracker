<script setup>

defineProps({
  type: {
    type: String,
    default: "info",
  },
});
</script>

<template>
  <div
    :class="[
      'flex items-start gap-2 text-left rounded-xl px-4 py-3 border',
      type === 'warning' && 'text-amber-400',
      type === 'error' && 'text-rose-400',
    ]"
    :style="
      type === 'warning'
        ? {
            background: 'rgba(251, 191, 36, 0.08)',
            borderColor: 'rgba(251, 191, 36, 0.3)',
          }
        : type === 'error'
          ? {
              background: 'rgba(248, 113, 113, 0.08)',
              borderColor: 'rgba(248, 113, 113, 0.35)',
            }
          : {
              background: 'var(--app-bg-elevated)',
              borderColor: 'var(--app-border)',
              color: '#94a3b8',
            }
    "
  >
    <div class="shrink-0 flex items-center justify-center [&_svg]:w-[18px] [&_svg]:h-[18px]">
      <slot name="icon" />
    </div>
    <div class="min-w-0 text-xs">
      <slot />
    </div>
  </div>
</template>
