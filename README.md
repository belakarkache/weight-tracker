# Weight Tracker

PWA em Vue 3 com Tailwind CSS, PrimeVue (pt-BR) e Tabler Icons. Modo escuro e mobile first.

## Tecnologias

- **Vue 3** + **Vite 8**
- **Vue Router 4**
- **Tailwind CSS 3**
- **PrimeVue 4** (tema Aura, locale pt-BR)
- **Tabler Icons** (@tabler/icons-vue)
- **vite-plugin-pwa** (PWA com service worker)

## Desenvolvimento

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Como testar o toast de atualização da PWA (local)

O aviso "Nova versão disponível" só aparece quando já existe um service worker ativo e um **novo** build é detectado. Para simular isso localmente:

1. **Gere e sirva o build:**
   ```bash
   npm run build
   npm run preview
   ```
2. **Abra no navegador** a URL do preview (ex.: http://localhost:4173). Conclua o onboarding se precisar — o service worker será registrado.
3. **Em outro terminal**, faça uma alteração qualquer (ex.: um comentário em `src/App.vue`), build de novo e mantenha o preview rodando:
   ```bash
   # edite qualquer arquivo, depois:
   npm run build
   ```
4. **Volte à aba do app** e recarregue a página (F5). O navegador detecta o novo service worker; o toast "Nova versão disponível" deve aparecer com o botão **Atualizar**.
5. Clique em **Atualizar** — a página recarrega e passa a usar a nova versão.

Em modo `npm run dev` o PWA está desativado, então o toast de atualização não aparece no dev server.

## Fluxo de onboarding

Ao abrir o app, é exibido um onboarding em 7 passos:

1. **Altura** (cm)
2. **Peso atual** (kg)
3. **Idade** (anos)
4. **Sexo** (masculino/feminino)
5. **Nível de atividade física** (sedentário a muito ativo)
6. **Nível de déficit calórico** (leve, moderado, agressivo)
7. **Meta de peso** (kg)

Os dados são salvos no **localStorage** do dispositivo. O app principal só fica acessível após concluir o onboarding. Qualquer rota acessada sem onboarding completo redireciona para `/onboarding`.

## Estrutura

- `src/composables/useOnboarding.js` – estado e persistência do onboarding
- `src/router/index.js` – rotas e guard (redireciona para onboarding se incompleto)
- `src/views/OnboardingView.vue` – fluxo de onboarding (Stepper PrimeVue)
- `src/views/AppView.vue` – tela principal (placeholder após onboarding)

## Ícones PWA

O manifest usa `/favicon.svg`. Para ícones PNG (192x192, 512x512), crie em `public/icons/` e ajuste `vite.config.js`.
