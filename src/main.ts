import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import { VApp, VBtn, VCard, VIcon, VProgressLinear, VSelect, VTextField, VPagination, VDialog } from 'vuetify/components'
import { Ripple } from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import App from './App.vue'
import HomePage from './components/HomePage.vue'
import QuizPage from './components/QuizPage.vue'
import MemoryPage from './components/MemoryPage.vue'
import LibraryPage from './components/LibraryPage.vue'
import SpellingPage from './components/SpellingPage.vue'

const components = { VApp, VBtn, VCard, VIcon, VProgressLinear, VSelect, VTextField, VPagination, VDialog }
const directives = { Ripple }

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/quiz', component: QuizPage },
    { path: '/memory', component: MemoryPage },
    { path: '/words', component: LibraryPage },
    { path: '/spelling/:section?', component: SpellingPage },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
const vuetify = createVuetify({ components, directives, theme: { defaultTheme: 'light', themes: { light: { colors: { primary: '#285f49', secondary: '#e9e2f4', background: '#f7f8fa', surface: '#ffffff', error: '#b94e46', success: '#285f49' } } } }, defaults: { VBtn: { rounded: 'lg', elevation: 0 }, VCard: { elevation: 0, rounded: 'xl' } } })
createApp(App).use(router).use(vuetify).mount('#app')
