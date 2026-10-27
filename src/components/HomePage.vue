<script setup lang="ts">
import { computed, ref } from 'vue'
import { accuracy, database, progress, resetProgress, streak, todayCount } from '../store'
import StressWord from './StressWord.vue'
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
const dayWord = computed(() => database.value.words.find(w => w.correct === 'красИвее') || database.value.words[0])
const resetDialog = ref(false)
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">ПО ЧУТЬ-ЧУТЬ — К БОЛЬШОЙ ЦЕЛИ</div><h1>{{ greeting }} <span class="greeting-sun">✳</span></h1><p>Давай сделаем русский чуть понятнее.</p></div><div class="heading-note"><v-icon icon="mdi-sprout-outline" size="18" /> Твой темп — правильный темп</div></div>
  <section class="hero-card">
    <div class="hero-copy"><div class="hero-kicker"><span></span>ТВОЯ ЕЖЕДНЕВНАЯ ПРАКТИКА</div><h2>Уверенность начинается<br> с правильного ударе́ния.</h2><p>Знакомые слова умеют удивлять. Потренируемся<br class="desktop-break"> расставлять акценты — по одному слову за раз.</p><v-btn to="/quiz" color="#d5ecab" size="large" append-icon="mdi-arrow-right">Начать тренировку</v-btn><span class="hero-duration">10 слов · около 3 минут</span></div>
    <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-spark spark-one">✳</span><span class="art-dot"></span><div class="word-tile tile-back">тОрты<span>всё дело в акценте</span></div><div class="word-tile tile-front">крас<span>И́</span>вее<div class="tile-caption"><i class="mdi mdi-check-circle"></i> вот так правильно</div></div><span class="art-spark spark-two">✦</span><div class="art-label">ставим на нужное место</div></div>
  </section>
  <section class="stats-grid" aria-label="Твой прогресс">
    <div class="stat-card"><span class="stat-icon green"><v-icon icon="mdi-check-all" /></span><div><strong>{{ progress.learned.length }}<small> / {{ database.words.length }}</small></strong><span>слов отработано</span></div><span class="stat-decoration">↗</span></div>
    <div class="stat-card"><span class="stat-icon peach"><v-icon icon="mdi-fire" /></span><div><strong>{{ streak }} <small>{{ streak === 1 ? 'день' : streak > 1 && streak < 5 ? 'дня' : 'дней' }}</small></strong><span>занятий подряд</span></div><span class="stat-caption">{{ streak ? 'Так держать!' : 'Начнём сегодня' }}</span></div>
    <div class="stat-card"><span class="stat-icon lavender"><v-icon icon="mdi-bullseye-arrow" /></span><div><strong>{{ progress.answers ? accuracy + '%' : '—' }}</strong><span>правильных ответов</span></div><span class="stat-caption">{{ todayCount }} сегодня</span></div>
  </section>
  <section class="topics-section"><div class="section-heading"><div><h2>Что потренируем?</h2><p>Выбери тему и двигайся к своему результату.</p></div><span class="subtle-pill">2 темы</span></div>
    <div class="topics-grid">
      <v-card class="topic-card stress-topic"><div class="topic-head"><span class="topic-icon"><v-icon icon="mdi-format-letter-case" size="29" /></span><span class="topic-tag">ЗАДАНИЕ 4</span></div><h3>Ударение<span class="little-accent">́</span></h3><p>Почувствуй ритм слова.<br>Запоминай сложное, закрепляй знакомое.</p><div class="topic-actions"><router-link to="/quiz"><span><v-icon icon="mdi-lightning-bolt-outline" size="19" />Квизы</span><v-icon icon="mdi-arrow-top-right" size="19" /></router-link><router-link to="/memory"><span><v-icon icon="mdi-cards-outline" size="19" />Запоминалка</span><v-icon icon="mdi-arrow-top-right" size="19" /></router-link></div><div class="topic-foot"><span class="tiny-dot"></span>{{ database.words.length }} слов из твоего файла</div></v-card>
      <v-card class="topic-card spelling-topic"><div class="topic-head"><span class="topic-icon"><v-icon icon="mdi-pencil-outline" size="27" /></span><span class="topic-tag">СКОРО</span></div><h3>Правописание</h3><p>Разберись в правилах.<br>От корня слова до последнего суффикса.</p><div class="spelling-links"><router-link to="/spelling/root">В корне <v-icon icon="mdi-arrow-top-right" size="16" /></router-link><router-link to="/spelling/prefix">В приставке <v-icon icon="mdi-arrow-top-right" size="16" /></router-link><router-link to="/spelling/suffix">В суффиксе <v-icon icon="mdi-arrow-top-right" size="16" /></router-link></div><div class="topic-foot"><v-icon icon="mdi-clock-outline" size="15" />Готовим новые тренировки</div></v-card>
    </div>
  </section>
  <div class="bottom-grid"><section class="word-of-day"><div><div class="eyebrow">СЛОВО НА ЗАМЕТКУ <span>↗</span></div><StressWord :word="dayWord.correct" /><p>Проговори вслух. Ещё раз. Теперь запомнится.</p></div><router-link to="/memory" aria-label="Открыть запоминалку" class="circle-link"><v-icon icon="mdi-arrow-right" /></router-link></section><section class="trust-card"><span class="trust-icon"><v-icon icon="mdi-shield-check-outline" size="27" /></span><div><h3>Только твои проверенные слова</h3><p>База из загруженного файла.<br>Без случайных слов из интернета.</p><router-link to="/words">Посмотреть базу <v-icon icon="mdi-arrow-right" size="15" /></router-link></div></section></div>
  <div v-if="database.conflicts.length" class="source-note"><v-icon icon="mdi-information-outline" size="17" /><span>{{ database.conflicts.length }} {{ database.conflicts.length === 1 ? 'слово с разными ударениями в исходнике исключено' : 'слова с разными ударениями в исходнике исключены' }} из тренировок.</span><router-link to="/words?review=1">Посмотреть</router-link></div>
  <div v-if="progress.answers" class="progress-reset"><v-btn variant="text" size="small" color="#89917f" @click="resetDialog = true">Сбросить прогресс</v-btn></div>
  <v-dialog v-model="resetDialog" max-width="460"><v-card class="import-dialog"><h2>Начать с чистого листа?</h2><p class="reset-description">Статистика, серия занятий и список ошибок в этом браузере будут очищены.</p><div class="result-actions"><v-btn variant="tonal" @click="resetDialog = false">Отмена</v-btn><v-btn color="primary" @click="resetProgress(); resetDialog = false">Сбросить прогресс</v-btn></div></v-card></v-dialog>
</template>
