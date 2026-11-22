import { state, persistPrefs } from '../state.js';
import { GUIDED_ESSAYS } from '../data/essays.js';
import { escapeHTML } from './utils.js';

export function nextEssayTopic() {
  state.currentEssayIdx = (state.currentEssayIdx + 1) % GUIDED_ESSAYS.length;
  state.selectedCause1Idx = 0;
  state.selectedCause2Idx = 0;
  persistPrefs();
  renderGuidedRedacaoView();
}

export function selectEssayIdea(part, idx) {
  if (part === 1) state.selectedCause1Idx = idx;
  if (part === 2) state.selectedCause2Idx = idx;
  renderGuidedRedacaoView();
}

export function renderGuidedRedacaoView() {
  if (state.currentEssayIdx >= GUIDED_ESSAYS.length) {
    state.currentEssayIdx = 0;
  }
  const essay = GUIDED_ESSAYS[state.currentEssayIdx];
  const c1 = essay.cause1Options[state.selectedCause1Idx];
  const c2 = essay.cause2Options[state.selectedCause2Idx];
  const container = document.getElementById('left-content-scroll');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3.5">
      <div class="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Tema de Treino • Vunesp TJSP</span>
        <h2 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1 leading-snug">${escapeHTML(essay.title)}</h2>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">${escapeHTML(essay.context)}</p>
      </div>

      <!-- PASSO 1: ESCOLHA AS IDEIAS COM 1 TOQUE -->
      <div class="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800 space-y-2.5">
        <div class="text-xs font-extrabold text-amber-900 dark:text-amber-300">💡 Passo 1: Destrave suas Ideias (Toque para escolher 2 causas)</div>

        <div>
          <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Causa 1 (Para o 2º parágrafo):</span>
          <div class="mt-1 space-y-1">
            ${essay.cause1Options.map((opt, idx) => `
              <button onclick="selectEssayIdea(1, ${idx})" class="w-full text-left text-xs p-2 rounded-xl border transition-all ${state.selectedCause1Idx === idx ? 'bg-amber-600 text-white border-amber-700 font-semibold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}">
                ${state.selectedCause1Idx === idx ? '✓ ' : '○ '}${escapeHTML(opt)}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Causa 2 (Para o 3º parágrafo):</span>
          <div class="mt-1 space-y-1">
            ${essay.cause2Options.map((opt, idx) => `
              <button onclick="selectEssayIdea(2, ${idx})" class="w-full text-left text-xs p-2 rounded-xl border transition-all ${state.selectedCause2Idx === idx ? 'bg-amber-600 text-white border-amber-700 font-semibold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}">
                ${state.selectedCause2Idx === idx ? '✓ ' : '○ '}${escapeHTML(opt)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- PASSO 2: REPERTÓRIO PRONTO -->
      <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200">
        <strong>⚖️ Repertório Jurídico Pronto para Citar:</strong> ${escapeHTML(essay.repertoire)}
      </div>

      <!-- PASSO 3: ESQUELETO MONTADO AUTOMATICAMENTE -->
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
        <div class="text-xs font-extrabold text-blue-900 dark:text-blue-300">📐 Passo 2: Modelo Guia (Copie/adapte com suas palavras na folha ao lado)</div>
        <pre class="whitespace-pre-wrap font-serif text-xs leading-relaxed text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">${escapeHTML(essay.skeleton(c1, c2))}</pre>
      </div>
    </div>
  `;
}
