import { state, persistPrefs } from '../state.js';
import { callGeminiAPI, generateCustomStoryLesson } from '../ai/gemini.js';
import { buildLocalAIContext } from '../ai/knowledge-base.js';
import { escapeHTML, formatSimpleMarkdown, showToast } from './utils.js';

const DISCIPLINE_LABELS = {
  direito: 'Direito & Normas',
  portugues: 'Português',
  matematica: 'Matemática & RLM',
  informatica: 'Excel 365'
};

const DISCIPLINE_WEIGHTS = {
  direito: 0.35,
  portugues: 0.30,
  matematica: 0.20,
  informatica: 0.15
};

function getDaysUntilExam() {
  const target = new Date(`${state.examDate || '2027-03-21'}T09:00:00`);
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function computePerformanceMetrics() {
  // Usa attemptHistory completo; se vazio mas houver answeredQuestions, sintetiza
  let history = state.attemptHistory || [];
  if (history.length === 0 && Object.keys(state.answeredQuestions || {}).length > 0) {
    history = Object.entries(state.answeredQuestions).map(([lessonId, ans]) => {
      const lesson = state.lessons.find((l) => l.id === lessonId);
      return {
        lessonId,
        title: lesson?.title || lessonId,
        discipline: lesson?.discipline || 'direito',
        isCorrect: !!ans.isCorrect,
        timestamp: Date.now()
      };
    });
  }

  const totalAttempts = history.length;
  const totalHits = history.filter((h) => h.isCorrect).length;
  const totalErrors = totalAttempts - totalHits;
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalHits / totalAttempts) * 100) : 0;

  // Estatísticas por disciplina
  const byDiscipline = {};
  for (const key of Object.keys(DISCIPLINE_LABELS)) {
    const items = history.filter((h) => h.discipline === key);
    const hits = items.filter((i) => i.isCorrect).length;
    const total = items.length;
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : null;
    byDiscipline[key] = {
      key,
      label: DISCIPLINE_LABELS[key],
      total,
      hits,
      errors: total - hits,
      accuracy
    };
  }

  // Tópicos mais errados / que sabe menos
  const byLesson = {};
  for (const item of history) {
    if (!byLesson[item.lessonId]) {
      byLesson[item.lessonId] = {
        lessonId: item.lessonId,
        title: item.title,
        discipline: item.discipline,
        hits: 0,
        errors: 0,
        lastWrong: false
      };
    }
    if (item.isCorrect) {
      byLesson[item.lessonId].hits++;
      byLesson[item.lessonId].lastWrong = false;
    } else {
      byLesson[item.lessonId].errors++;
      byLesson[item.lessonId].lastWrong = true;
    }
  }

  const weakTopics = Object.values(byLesson)
    .filter((t) => t.errors > 0 || t.lastWrong)
    .sort((a, b) => (b.errors - a.errors) || (b.lastWrong ? 1 : -1));

  // Disciplina mais fraca
  const weakestDiscipline = Object.values(byDiscipline)
    .sort((a, b) => {
      const accA = a.accuracy === null ? -1 : a.accuracy;
      const accB = b.accuracy === null ? -1 : b.accuracy;
      return accA - accB;
    })[0];

  // Cálculo da Porcentagem de Chance de Passar em Março
  // Considera: acurácia ponderada nas 4 matérias, volume de questões e cobertura do edital
  let weightedAccuracy = 0;
  let coveredWeight = 0;
  for (const [disc, weight] of Object.entries(DISCIPLINE_WEIGHTS)) {
    const d = byDiscipline[disc];
    if (d.accuracy !== null) {
      weightedAccuracy += d.accuracy * weight;
      coveredWeight += weight;
    }
  }
  const effectiveAcc = coveredWeight > 0 ? weightedAccuracy / coveredWeight : 0;

  // Curva logística centrada na nota de corte Vunesp (~72%)
  const logisticScore = totalAttempts === 0
    ? 0
    : 100 / (1 + Math.exp(-(effectiveAcc - 68) / 11));

  // Fator de confiança pelo volume de questões praticadas e cobertura das 4 disciplinas
  const volumeFactor = Math.min(1, 0.35 + (totalAttempts / 24) * 0.65);
  const coverageFactor = 0.65 + (coveredWeight * 0.35);

  const passProbability = totalAttempts === 0
    ? 0
    : Math.min(96, Math.max(4, Math.round(logisticScore * volumeFactor * coverageFactor)));

  // Revisões periódicas (SRS)
  const now = Date.now();
  const reviews = Object.entries(state.answeredQuestions || {}).map(([lessonId, ans]) => {
    const lesson = state.lessons.find((l) => l.id === lessonId);
    const dueInDays = ans.nextReviewAt ? Math.ceil((ans.nextReviewAt - now) / (24 * 60 * 60 * 1000)) : 0;
    return {
      lessonId,
      title: lesson?.title || lessonId,
      isCorrect: ans.isCorrect,
      intervalDays: ans.intervalDays || 1,
      dueInDays
    };
  }).sort((a, b) => a.dueInDays - b.dueInDays);

  return {
    totalAttempts,
    totalHits,
    totalErrors,
    overallAccuracy,
    byDiscipline,
    weakTopics,
    weakestDiscipline,
    passProbability,
    daysUntilExam: getDaysUntilExam(),
    reviews
  };
}

export function openAnalyticsModal() {
  renderAnalyticsModal();
  document.getElementById('analytics-modal')?.classList.remove('hidden');
}

export function closeAnalyticsModal() {
  document.getElementById('analytics-modal')?.classList.add('hidden');
}

export function updateExamDate(val) {
  if (!val) return;
  state.examDate = val;
  persistPrefs();
  renderAnalyticsModal();
}

export function renderAnalyticsModal() {
  const container = document.getElementById('analytics-body');
  if (!container) return;

  const m = computePerformanceMetrics();
  let chanceColor = 'text-red-600 dark:text-red-400';
  let chanceLabel = 'Base Inicial — Pratique mais questões';
  if (m.passProbability >= 75) {
    chanceColor = 'text-emerald-600 dark:text-emerald-400';
    chanceLabel = 'Ritmo Competitivo de Aprovação!';
  } else if (m.passProbability >= 50) {
    chanceColor = 'text-amber-600 dark:text-amber-400';
    chanceLabel = 'Em Evolução — Foque nos pontos fracos';
  }

  container.innerHTML = `
    <!-- BLOCO 1: PROBABILIDADE DE APROVAÇÃO EM MARÇO -->
    <div class="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border border-blue-200 dark:border-blue-800 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Previsão de Aprovação na Prova de Março</div>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-3xl font-extrabold ${chanceColor}">${m.passProbability}%</span>
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">${chanceLabel}</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-200">⏳ Faltam ${m.daysUntilExam} dias</div>
          <label class="text-[11px] text-slate-500 flex items-center gap-1 justify-end mt-1">
            Prova:
            <input type="date" value="${escapeHTML(state.examDate)}" onchange="updateExamDate(this.value)" class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px]" />
          </label>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700">
          <div class="font-extrabold text-base text-slate-900 dark:text-white">${m.totalAttempts}</div>
          <div class="text-[11px] text-slate-500">Questões Feitas</div>
        </div>
        <div class="p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700">
          <div class="font-extrabold text-base text-emerald-600">${m.totalHits}</div>
          <div class="text-[11px] text-slate-500">Acertos (${m.overallAccuracy}%)</div>
        </div>
        <div class="p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700">
          <div class="font-extrabold text-base text-red-600">${m.totalErrors}</div>
          <div class="text-[11px] text-slate-500">Erros</div>
        </div>
      </div>
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        * Estimativa calculada pela sua taxa de acerto ponderada (padrão de corte Vunesp ~75%), cobertura das 4 matérias e volume de questões resolvidas.
      </p>
    </div>

    <!-- BLOCO 2: DESEMPENHO POR MATÉRIA -->
    <div class="space-y-2">
      <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">📊 Domínio por Matéria</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        ${Object.values(m.byDiscipline).map((d) => {
          const pct = d.accuracy === null ? 0 : d.accuracy;
          const barColor = d.accuracy === null ? 'bg-slate-300' : pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
          return `
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800 dark:text-slate-100">${escapeHTML(d.label)}</span>
                <span class="font-mono font-bold">${d.accuracy === null ? 'Sem dados' : `${pct}% (${d.hits}/${d.total})`}</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div class="h-full ${barColor}" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- BLOCO 3: PONTOS FRACOS & REFORÇO AUTOMÁTICO COM IA -->
    <div class="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">🎯 Onde Você Precisa Focar Agora</h4>
        <div class="flex items-center gap-1.5">
          <button onclick="generateWeaknessReinforcement()" id="btn-reinforce-weakest" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors">
            ✨ Gerar Reforço IA
          </button>
          <button onclick="runAIStrategicDiagnosis()" id="btn-ai-diagnosis" class="px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors">
            🤖 Plano de Ataque IA
          </button>
        </div>
      </div>

      ${m.weakTopics.length > 0 ? `
        <ul class="space-y-1 text-xs text-slate-700 dark:text-slate-200">
          ${m.weakTopics.slice(0, 5).map((t) => `
            <li class="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
              <span class="truncate pr-2 font-medium">${escapeHTML(t.title)}</span>
              <span class="shrink-0 text-[11px] font-bold text-red-600 dark:text-red-400">${t.errors} erro(s)</span>
            </li>
          `).join('')}
        </ul>
      ` : `
        <p class="text-xs text-slate-600 dark:text-slate-300">
          ${m.totalAttempts === 0
            ? 'Resolva questões nas aulas para identificar seus pontos fracos.'
            : `Nenhum erro acumulado! Matéria com menor prática atual: <strong>${escapeHTML(m.weakestDiscipline.label)}</strong>.`}
        </p>
      `}

      <div id="ai-diagnosis-output" class="hidden p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs ai-markdown selectable-text"></div>
    </div>

    <!-- BLOCO 4: AGENDA DE REVISÕES PERIÓDICAS (SRS) -->
    <div class="space-y-2">
      <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">🔁 Agenda de Revisões Periódicas (SRS)</h4>
      ${m.reviews.length > 0 ? `
        <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          ${m.reviews.map((r) => `
            <div class="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="truncate pr-2">${escapeHTML(r.title)}</span>
              <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.dueInDays <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
                ${r.dueInDays <= 0 ? 'Revisar Hoje!' : `Em ${r.dueInDays} dia(s)`}
              </span>
            </div>
          `).join('')}
        </div>
      ` : `<p class="text-xs text-slate-500">Suas revisões periódicas (1d → 3d → 7d → 15d) aparecerão aqui conforme você responder questões.</p>`}
    </div>
  `;
}

export async function generateWeaknessReinforcement() {
  if (!navigator.onLine) {
    showToast('Conecte-se à internet para gerar uma aula de reforço com IA.');
    return;
  }

  const m = computePerformanceMetrics();
  const targetTopic = m.weakTopics.length > 0
    ? `Reforço aprofundado sobre "${m.weakTopics[0].title}" (${DISCIPLINE_LABELS[m.weakTopics[0].discipline] || 'TJSP'}) com nova história e pegadinhas Vunesp`
    : `Reforço de ${m.weakestDiscipline.label} para Escrevente TJSP 2027 (nível Vunesp)`;

  const btn = document.getElementById('btn-reinforce-weakest');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando reforço...';
  }

  try {
    await generateCustomStoryLesson(targetTopic, {
      onLessonCreated: () => {
        closeAnalyticsModal();
        if (typeof window.selectStoryDiscipline === 'function') {
          window.selectStoryDiscipline('todas');
        }
        showToast('Aula de reforço criada nos seus pontos fracos!');
      }
    });
  } catch (err) {
    showToast(err.message || 'Erro ao gerar reforço.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Gerar Reforço IA';
    }
  }
}

export async function runAIStrategicDiagnosis() {
  if (!navigator.onLine) {
    showToast('Conecte-se à internet para gerar o plano de ataque com IA.');
    return;
  }

  const out = document.getElementById('ai-diagnosis-output');
  const btn = document.getElementById('btn-ai-diagnosis');
  if (!out || !btn) return;

  btn.disabled = true;
  btn.textContent = 'Analisando...';
  out.classList.remove('hidden');
  out.innerHTML = '<p class="text-blue-700 dark:text-blue-300 font-semibold">Calculando estratégia com Gemini...</p>';

  try {
    const m = computePerformanceMetrics();
    const summary = Object.values(m.byDiscipline)
      .map((d) => `- ${d.label}: ${d.accuracy === null ? 'não praticada' : `${d.accuracy}% (${d.hits}/${d.total})`}`)
      .join('\n');
    const weakList = m.weakTopics.slice(0, 5).map((t) => `- ${t.title} (${t.errors} erros)`).join('\n') || 'Nenhum erro ainda.';
    const localCtx = buildLocalAIContext(weakList, 4000);

    const prompt = `Analise o desempenho atual do aluno para o concurso TJSP 2027 (prova em ${state.examDate}, faltam ${m.daysUntilExam} dias):
- Chance atual estimada: ${m.passProbability}%
- Acertos totais: ${m.totalHits}/${m.totalAttempts} (${m.overallAccuracy}%)
Por matéria:
${summary}
Tópicos com mais erros:
${weakList}
${localCtx}

Crie um plano de estudo objetivo e prático (em até 4 tópicos curtos):
1. Diagnóstico sincero de como aumentar a chance de aprovação até março;
2. Ordem de prioridade do que revisar hoje e nesta semana;
3. Sugestão de 2 temas exatos para o aluno pedir no gerador de aulas.`;

    const reply = await callGeminiAPI([{ text: prompt }]);
    out.innerHTML = formatSimpleMarkdown(reply);
  } catch (err) {
    out.innerHTML = `<p class="text-red-600 font-semibold">${escapeHTML(err.message || 'Erro ao gerar diagnóstico.')}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Plano de Ataque IA';
  }
}
