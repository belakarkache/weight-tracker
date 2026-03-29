<script setup>
import AppNavBar from "../components/AppNavBar.vue";
</script>

<template>
  <div
    class="app-layout flex flex-col min-h-screen"
    style="
      background: var(--app-bg);
      background-image: radial-gradient(
          ellipse 80% 50% at 50% -20%,
          rgba(45, 212, 191, 0.06),
          transparent
        ),
        radial-gradient(
          ellipse 60% 40% at 100% 50%,
          rgba(52, 211, 153, 0.04),
          transparent
        );
    "
  >
    <main
      class="flex-1"
      style="padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));"
    >
      <router-view />
    </main>
    <AppNavBar />
  </div>
</template>
