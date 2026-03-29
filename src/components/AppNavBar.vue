<script setup>
import { useRoute } from "vue-router";
import {
  IconCalendarEvent,
  IconCarrot,
  IconChefHat,
  IconUser,
} from "@tabler/icons-vue";
const route = useRoute();

const items = [
  { name: "today", path: "/", label: "Hoje", icon: IconCalendarEvent },
  {
    name: "recipes",
    path: "/recipes",
    label: "Receitas",
    icon: IconChefHat,
  },
  {
    name: "ingredients",
    path: "/ingredients",
    label: "Ingredientes",
    icon: IconCarrot,
  },
  { name: "profile", path: "/profile", label: "Perfil", icon: IconUser },
];

function isActive(item) {
  if (item.path === "/") return route.path === "/";
  return route.path.startsWith(item.path);
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-1/2 z-50 w-full max-w-[var(--app-shell-max)] -translate-x-1/2 px-3 pt-2"
    aria-label="Navegação principal"
    style="
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      padding-left: max(0.75rem, env(safe-area-inset-left));
      padding-right: max(0.75rem, env(safe-area-inset-right));
      background: color-mix(in srgb, var(--app-bg-surface) 92%, transparent);
      border-top: 1px solid var(--app-border);
      backdrop-filter: blur(12px);
    "
  >
    <div class="w-full mx-auto">
      <div class="flex items-stretch justify-around gap-1">
        <router-link
          v-for="item in items"
          :key="item.name"
          :to="item.path"
          class="group relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0 rounded-2xl px-2 py-2.5 text-[0.6875rem] font-semibold tracking-wide transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-focus-border)] focus-visible:outline-offset-2 overflow-hidden"
          :class="
            isActive(item)
              ? [
                  'text-[var(--accent-teal)] -translate-y-0.5',
                  'border border-[rgba(45,212,191,0.4)]',
                  'bg-gradient-to-b from-[rgba(45,212,191,0.22)] via-[rgba(45,212,191,0.08)] to-[rgba(52,211,153,0.05)]',
                  'shadow-[0_0_28px_rgba(45,212,191,0.14),0_8px_24px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]',
                  'hover:from-[rgba(45,212,191,0.28)] hover:via-[rgba(45,212,191,0.12)] hover:to-[rgba(52,211,153,0.08)]',
                  'hover:border-[rgba(45,212,191,0.55)] hover:shadow-[0_0_32px_rgba(45,212,191,0.2),0_10px_28px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]',
                  'active:translate-y-0 active:scale-[0.98] active:duration-150',
                ]
              : [
                  'text-[var(--app-text-muted)] border border-transparent',
                  'hover:text-[var(--accent-teal)] hover:-translate-y-0.5',
                  'active:translate-y-0 active:scale-[0.97] active:duration-150 active:shadow-[0_0_16px_rgba(45,212,191,0.08)]',
                ]
          "
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <component
            :is="item.icon"
            class="relative z-[1] w-[1.375rem] h-[1.375rem] shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95"
            :class="
              isActive(item)
                ? 'scale-105 drop-shadow-[0_0_10px_rgba(45,212,191,0.45)]'
                : ''
            "
            stroke-width="1.5"
            aria-hidden="true"
          />
          <span class="relative z-[1] leading-none">{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>
