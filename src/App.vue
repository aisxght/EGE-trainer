<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { loadWords, progress, todayCount } from './store'
const route = useRoute()
const menu = ref(false)
const links = [ { to: '/', icon: 'mdi-view-dashboard-outline', label: 'Обзор' }, { to: '/quiz', icon: 'mdi-lightning-bolt-outline', label: 'Квизы' }, { to: '/memory', icon: 'mdi-cards-outline', label: 'Запоминалка' }, { to: '/words', icon: 'mdi-book-open-page-variant-outline', label: 'База слов' } ]
const title = computed(() => route.path === '/' ? 'Моя подготовка' : route.path === '/quiz' ? 'Ударение · Квизы' : route.path === '/memory' ? 'Ударение · Запоминалка' : route.path === '/words' ? 'База слов' : 'Правописание')
onMounted(loadWords)
</script>

<template>
  <v-app>
    <aside class="sidebar" :class="{ 'is-open': menu }">
      <div class="brand-caption">РУССКИЙ ЯЗЫК · ЕГЭ</div>
      <div class="nav-label">ТВОЁ ПРОСТРАНСТВО</div>
      <nav><router-link v-for="link in links" :key="link.to" :to="link.to" class="nav-item" :class="{ active: route.path === link.to }" @click="menu = false"><v-icon :icon="link.icon" size="21" />{{ link.label }}<span v-if="link.to === '/quiz'" class="nav-new">GO</span></router-link></nav>
      <div class="sidebar-tip"><span class="tip-spark">✳</span><h3>Маленькие шаги.<br>Большой результат.</h3><p>Всего 10 слов в день —<br>и ты ближе к своей сотке.</p><div class="tip-line"><span :style="{ width: Math.min(todayCount / progress.goal * 100, 100) + '%' }"></span></div><small>{{ Math.min(todayCount, progress.goal) }} из {{ progress.goal }} слов сегодня</small></div>
      <div class="sidebar-bottom"><span class="mini-dot"></span>В своём темпе. Каждый день.</div>
    </aside>
    <div v-if="menu" class="nav-backdrop" @click="menu = false"></div>
    <div class="main-shell">
      <header class="topbar"><div class="topbar-title"><v-btn class="mobile-menu" icon="mdi-menu" variant="text" aria-label="Открыть меню" @click="menu = !menu" /><span>{{ title }}</span></div><div class="topbar-right"><span class="exam-badge"><span></span>Готовимся к ЕГЭ</span><span class="avatar">Я</span></div></header>
      <main><router-view /></main>
      <footer><span>Место, где всё становится понятнее.</span><span>Сделано для твоей подготовки <span class="footer-flower">✳</span></span></footer>
    </div>
  </v-app>
</template>
