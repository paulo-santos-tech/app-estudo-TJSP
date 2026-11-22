import { state, persistPrefs, persistAnsweredQuestions, persistAttemptHistory, persistPersonalNotes } from '../state.js';
import { setPaperStyle } from '../canvas/spen-canvas.js';
import { escapeHTML } from './utils.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getDueReviewCount() {
  const now = Date.now();
  return state.lessons.filter((l) => {
    const ans = state.answeredQuestions[l.id];
    return ans && ans.nextReviewAt && ans.nextReviewAt <= now;
  }).length;
}

export function getFilteredLessons() {
  if (state.disciplineFilter === 'revisar') {
    const now = Date.now();
    return state.lessons.filter((l) => {
      const ans = state.answeredQuestions[l.id];
      return ans && ans.nextReviewAt && ans.nextReviewAt <= now;
    });
  }
  if (state.disciplineFilter === 'todas') return state.lessons;
  return state.lessons.filter((l) => l.discipline === state.disciplineFilter);
}

export function updateScoreCounter() {
  const entries = Object.values(state.answeredQuestions);
  const hits = entries.filter((e) => e.isCorrect).length;
  const counter = document.getElementById('score-counter');
  if (counter) counter.textContent = `${hits}/${entries.length}`;

  const srsBadge = document.getElementById('srs-due-badge');
  if (srsBadge) {
    const due = getDueReviewCount();
    srsBadge.textContent = String(due);
    srsBadge.classList.toggle('hidden', due === 0);
  }
}

export function selectStoryDiscipline(disc) {
  state.disciplineFilter = disc;
  state.currentLessonIdx = 0;
  persistPrefs();

  document.querySelectorAll('.disc-pill').forEach((pill) => {
    if (pill.dataset.disc === disc) {
      pill.className = 'disc-pill px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-800 text-white whitespace-nowrap flex items-center gap-1';
    } else {
      pill.className = 'disc-pill px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1';
    }
  });

  renderStoryLessonView();
}

export function renderStoryLessonView() {
  const list = getFilteredLessons();
  const container = document.getElementById('left-content-scroll');
  if (!container) return;

  // Atualiza pílula ativa caso restaurada de prefs
  document.querySelectorAll('.disc-pill').forEach((pill) => {
    if (pill.dataset.disc === state.disciplineFilter) {
      pill.className = 'disc-pill px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-800 text-white whitespace-nowrap flex items-center gap-1';
    } else {
      pill.className = 'disc-pill px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1';
    }
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 space-y-2 text-slate-500 dark:text-slate-400">
        <p class="text-sm font-bold text-emerald-700 dark:text-emerald-400">🎉 Nenhuma revisão pendente para hoje!</p>
        <p class="text-xs">Responda questões ou explore as histórias em "Todas as Histórias".</p>
        <button onclick="selectStoryDiscipline('todas')" class="mt-2 px-4 py-2 rounded-xl bg-blue-800 text-white text-xs font-semibold">Ver Todas as Histórias</button>
      </div>
    `;
    return;
  }

  if (state.currentLessonIdx >= list.length) {
    state.currentLessonIdx = 0;
  }
  const lesson = list[state.currentLessonIdx] || list[0];

  if (lesson.paperSuggested) setPaperStyle(lesson.paperSuggested);

  const savedNote = state.personalNotes[lesson.id] || '';
  const prevAnswer = state.answeredQuestions[lesson.id];

  container.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">${escapeHTML(lesson.disciplineLabel)}</span>
        ${lesson.isCustom ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">✨ Criada por IA</span>' : ''}
      </div>
      <span class="text-xs font-semibold text-slate-500 shrink-0">Aula ${state.currentLessonIdx + 1} de ${list.length}</span>
    </div>

    <h2 class="font-extrabold text-base lg:text-lg text-slate-900 dark:text-white leading-snug">${escapeHTML(lesson.title)}</h2>

    <!-- BLOCO 1: A HISTÓRIA PARA FIXAÇÃO -->
    <div class="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 space-y-2">
      <div class="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
        <span>📖 Passo 1: A História (Para Gravar na Mente)</span>
      </div>
      <p class="font-serif text-xs sm:text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200">
        ${lesson.story}
      </p>
    </div>

    <!-- BLOCO 2: EXPLICAÇÃO NOS MÍNIMOS DETALHES -->
    <div class="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/70 space-y-2.5">
      <div class="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300">
        🔍 Passo 2: Explicação nos Mínimos Detalhes
      </div>
      <ul class="space-y-2 text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
        ${lesson.detailedExplanation.map((item) => `<li class="pl-2 border-l-2 border-blue-400">${item}</li>`).join('')}
      </ul>
    </div>

    <!-- BLOCO 3: CADERNO DE ANOTAÇÕES DA AULA -->
    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
      <div class="flex items-center justify-between">
        <label for="lesson-note-box" class="text-xs font-bold text-slate-700 dark:text-slate-200">📝 Passo 3: Suas Anotações (ou S Pen → Texto)</label>
        <span id="note-saved-indicator" class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">${savedNote ? 'Salvo ✓' : ''}</span>
      </div>
      <textarea
        id="lesson-note-box"
        rows="2"
        oninput="savePersonalTextNote('${escapeHTML(lesson.id)}', this.value)"
        placeholder="Escreva com teclado ou com a S Pen (o sistema do Tab S10 converte direto aqui)..."
        class="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 dark:text-slate-100"
      >${escapeHTML(savedNote)}</textarea>
    </div>

    <!-- BLOCO 4: DESAFIO DE FIXAÇÃO VUNESP -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
          🎯 Passo 4: Teste o que Você Aprendeu
        </div>
        ${prevAnswer?.intervalDays ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">🔁 Revisão em ${prevAnswer.intervalDays}d</span>` : ''}
      </div>
      <p class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">${escapeHTML(lesson.question.statement)}</p>

      <div class="space-y-1.5">
        ${lesson.question.options.map((opt) => {
          let btnClass = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-slate-50/60 dark:bg-slate-900/60';
          let badgeClass = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
          if (prevAnswer) {
            if (opt.letter === lesson.question.correct) {
              btnClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
              badgeClass = 'bg-emerald-600 text-white';
            } else if (opt.letter === prevAnswer.selected) {
              btnClass = 'border-red-500 bg-red-50 dark:bg-red-950/50';
              badgeClass = 'bg-red-600 text-white';
            }
          }
          return `
            <button onclick="answerLessonQuestion('${escapeHTML(lesson.id)}', '${escapeHTML(opt.letter)}')" class="w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${btnClass}">
              <span class="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${badgeClass}">${escapeHTML(opt.letter)}</span>
              <span class="text-xs leading-snug text-slate-800 dark:text-slate-100">${escapeHTML(opt.text)}</span>
            </button>
          `;
        }).join('')}
      </div>

      ${prevAnswer ? `
        <div class="p-3 rounded-xl text-xs leading-relaxed ${prevAnswer.isCorrect ? 'bg-emerald-100/80 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-amber-100/80 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'}">
          <strong>${prevAnswer.isCorrect ? '✅ Excelente!' : '💡 Releia a história:'}</strong> ${escapeHTML(lesson.question.feedback)}
        </div>
      ` : ''}
    </div>

    <!-- NAVEGAÇÃO ENTRE HISTÓRIAS -->
    <div class="flex items-center justify-between pt-1">
      <button onclick="prevLesson()" ${state.currentLessonIdx === 0 ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-40 transition-colors">← História Anterior</button>
      <button onclick="nextLesson()" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-800 hover:bg-blue-700 text-white transition-colors">Próxima História →</button>
    </div>
  `;
}

export function savePersonalTextNote(lessonId, value) {
  state.personalNotes[lessonId] = value;
  persistPersonalNotes();
  const ind = document.getElementById('note-saved-indicator');
  if (ind) ind.textContent = 'Salvo ✓';
}

export function answerLessonQuestion(lessonId, letter) {
  const lesson = state.lessons.find((l) => l.id === lessonId);
  if (!lesson) return;
  const isCorrect = letter === lesson.question.correct;
  const prevInterval = state.answeredQuestions[lessonId]?.intervalDays || 1;
  const intervalDays = isCorrect ? Math.min(30, prevInterval === 1 ? 3 : prevInterval * 2) : 1;

  state.answeredQuestions[lessonId] = {
    selected: letter,
    isCorrect,
    intervalDays,
    nextReviewAt: Date.now() + intervalDays * ONE_DAY_MS
  };
  state.attemptHistory.push({
    lessonId,
    title: lesson.title,
    discipline: lesson.discipline,
    isCorrect,
    timestamp: Date.now()
  });
  persistAnsweredQuestions();
  persistAttemptHistory();
  updateScoreCounter();
  renderStoryLessonView();
}

export function prevLesson() {
  if (state.currentLessonIdx > 0) {
    state.currentLessonIdx--;
    persistPrefs();
    renderStoryLessonView();
  }
}

export function nextLesson() {
  const list = getFilteredLessons();
  if (list.length === 0) return;
  state.currentLessonIdx = (state.currentLessonIdx + 1) % list.length;
  persistPrefs();
  renderStoryLessonView();
}
