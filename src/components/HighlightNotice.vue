<script setup>
</script>

<template>
  <div
    class="rounded-xl px-4 py-3 border-l-4"
    style="
      background: linear-gradient(
        135deg,
        rgba(52, 211, 153, 0.12) 0%,
        rgba(45, 212, 191, 0.08) 100%
      );
      border-color: rgba(52, 211, 153, 0.35);
      border-left-color: #34d399;
      color: #d1fae5;
    "
  >
    <slot />
  </div>
</template>
