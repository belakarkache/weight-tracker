const SITE_NAME = "Diário de Peso";
const DEFAULT_DESCRIPTION =
  "Registre peso e refeições, acompanhe calorias, metas e estatísticas no celular. App leve, em português.";

const ROUTE_COPY = {
  onboarding: {
    title: "Configuração inicial",
    description:
      "Configure altura, peso, meta e nível de atividade para personalizar seu plano.",
  },
  today: {
    title: "Hoje",
    description:
      "Visão do dia: meta calórica, refeições, peso e progresso rumo à sua meta.",
  },
  statistics: {
    title: "Estatísticas",
    description:
      "Gráfico de peso, variação total, jornada, média semanal e resumo nutricional.",
  },
  ingredients: {
    title: "Ingredientes",
    description:
      "Biblioteca de alimentos com macros para montar refeições com mais precisão.",
  },
  recipes: {
    title: "Receitas",
    description:
      "Monte receitas a partir dos ingredientes e registre porções consumidas no dia.",
  },
  "design-system": {
    title: "Design system",
    description: "Referência interna de componentes e tokens visuais.",
  },
  profile: {
    title: "Perfil",
    description: "Edite dados pessoais, meta de peso e preferências do app.",
  },
};

export function syncSocialImageUrls() {
  if (typeof window === "undefined") return;
  const root = import.meta.env.BASE_URL || "/";
  const baseHref = root.endsWith("/")
    ? window.location.origin + root
    : `${window.location.origin}${root}/`;
  const imageUrl = new URL("og-image.svg", baseHref).href;
  document
    .querySelector('meta[property="og:image"]')
    ?.setAttribute("content", imageUrl);
  document
    .querySelector('meta[name="twitter:image"]')
    ?.setAttribute("content", imageUrl);
}

export function applyRouteSeo(route) {
  const key = route.name != null ? String(route.name) : "";
  const copy = ROUTE_COPY[key];
  const title = copy?.title ?? SITE_NAME;
  const description = copy?.description ?? DEFAULT_DESCRIPTION;

  document.title = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute("content", description);

  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute("content", document.title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement("meta");
    ogDesc.setAttribute("property", "og:description");
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute("content", description);

  if (typeof window !== "undefined") {
    const url = `${window.location.origin}${route.fullPath.split("?")[0]}`;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", url);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }
}

export { SITE_NAME, DEFAULT_DESCRIPTION };
