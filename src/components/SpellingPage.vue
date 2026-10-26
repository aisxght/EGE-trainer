<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const section = computed(() => ({ root: 'В корне', prefix: 'В приставке', suffix: 'В суффиксе' }[String(route.params.section)] || 'Правописание'))
</script>
<template><div class="page-heading"><div><router-link to="/" class="back-link"><v-icon icon="mdi-arrow-left" size="16" />К темам</router-link><h1>Правописание<span class="heading-dot">.</span></h1><p>Всё начинается с хорошей базы.</p></div><span class="subtle-pill">Скоро</span></div><div class="spelling-tabs"><v-btn v-for="(label, key) in { root: 'В корне', prefix: 'В приставке', suffix: 'В суффиксе' }" :key="key" :to="`/spelling/${key}`" :variant="route.params.section === key ? 'flat' : 'tonal'" color="primary">{{ label }}</v-btn></div><v-card class="coming-soon"><span class="aside-flower">✳</span><div class="eyebrow">{{ section.toUpperCase() }}</div><h2>Здесь появятся<br>новые тренировки.</h2><p>Для этого раздела пока нет проверенных заданий.<br>А ударения уже можно тренировать.</p><v-btn to="/quiz" color="primary" append-icon="mdi-arrow-right">Перейти к ударениям</v-btn></v-card></template>
