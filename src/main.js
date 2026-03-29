import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Lara from '@primeuix/themes/lara'
import { all as primeLocales } from 'primelocale'
import router from './router'
import { syncSocialImageUrls } from './router/seo'
import App from './App.vue'
import './style.css'

syncSocialImageUrls()

if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister())
  })
}

const app = createApp(App)
app.use(router)
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: '.dark',
      prefix: 'p',
    },
  },
  locale: primeLocales.pt_BR,
  inputVariant: 'outlined',
})

app.mount('#app')
