import { createRouter, createWebHistory } from "vue-router";
import { useOnboarding } from "../composables/useOnboarding";
import { applyRouteSeo } from "./seo";

const routes = [
  {
    path: "/onboarding",
    name: "onboarding",
    component: () => import("../views/OnboardingView.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    component: () => import("../views/AppLayout.vue"),
    meta: { requiresOnboarding: true },
    children: [
      {
        path: "",
        name: "today",
        component: () => import("../views/AppView.vue"),
      },
      {
        path: "statistics",
        name: "statistics",
        component: () => import("../views/StatisticsView.vue"),
      },
      {
        path: "ingredients",
        name: "ingredients",
        component: () => import("../views/IngredientsView.vue"),
      },
      {
        path: "design-system",
        name: "design-system",
        component: () => import("../views/DesignSystemView.vue"),
      },
      {
        path: "profile",
        name: "profile",
        component: () => import("../views/ProfileView.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: () =>
      useOnboarding().isComplete() ? { name: "today" } : { name: "onboarding" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const { isComplete } = useOnboarding();
  const requiresOnboarding = to.matched.some((r) => r.meta.requiresOnboarding);
  const isPublic = to.meta.public === true;

  if (requiresOnboarding && !isComplete()) {
    return { name: "onboarding", query: to.query, replace: true };
  }
  if (to.name === "onboarding" && isComplete()) {
    return { name: "today", replace: true };
  }
  return true;
});

router.afterEach((to) => {
  applyRouteSeo(to);
});

export default router;
