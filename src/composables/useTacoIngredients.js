import { ref, shallowRef } from "vue";
import { mapTacoJsonRows } from "../utils/tacoReferenceFoods";

const tacoList = shallowRef([]);
const loaded = ref(false);
const loading = ref(false);
let inflight = null;

export function useTacoIngredients() {
  async function ensureLoaded() {
    if (loaded.value) return;
    if (inflight) {
      await inflight;
      return;
    }
    loading.value = true;
    inflight = (async () => {
      try {
        const mod = await import("../data/tabela_alimentos.json");
        const raw = mod.default ?? mod;
        tacoList.value = mapTacoJsonRows(raw);
        loaded.value = true;
      } catch (e) {
        console.error("[taco] Falha ao carregar tabela de referência:", e);
        tacoList.value = [];
        loaded.value = true;
      } finally {
        loading.value = false;
        inflight = null;
      }
    })();
    await inflight;
  }

  return {
    tacoList,
    loaded,
    loading,
    ensureLoaded,
  };
}
