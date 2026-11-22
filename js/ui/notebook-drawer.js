import { state } from '../state.js';
import { GUIDED_ESSAYS } from '../data/essays.js';
import { exportCanvasAsDataURL, setPaperStyle, redrawAllStrokes } from '../canvas/spen-canvas.js';
import { savePageToDB, deletePageFromDB, saveCanvasDraft } from '../storage.js';
import { getFilteredLessons } from './lessons-view.js';
import { escapeHTML, formatSimpleMarkdown, showToast } from './utils.js';

export function updateSavedBadge() {
  const badge = document.getElementById('saved-badge');
  if (badge) badge.textContent = String(state.savedPages.length);
}

export async function saveCurrentPage(includeFeedback = false) {
  if (state.strokes.length === 0 && !includeFeedback) {
    showToast('Faça alguma anotação ou cálculo na lousa antes de guardar!');
    return;
  }

  let title = 'Anotação S Pen TJSP';
  if (state.mode === 'aulas') {
    const list = getFilteredLessons();
    const lesson = list[state.currentLessonIdx] || list[0];
    title = lesson ? `História: ${lesson.title}` : 'História TJSP';
  } else if (state.mode === 'redacao') {
    title = `Redação: ${GUIDED_ESSAYS[state.currentEssayIdx].title.slice(0, 45)}...`;
  } else {
    title = 'Cálculo / Fórmula S Pen';
  }

  const pageEntry = {
    id: Date.now(),
    title,
    date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    paperStyle: state.paperStyle,
    thumbnail: exportCanvasAsDataURL(1200),
    strokes: JSON.parse(JSON.stringify(state.strokes)),
    feedback: includeFeedback ? state.lastAIFeedback : ''
  };

  try {
    await savePageToDB(pageEntry);
    state.savedPages.unshift(pageEntry);
    updateSavedBadge();
    showToast('Guardado localmente no Meu Caderno!');
  } catch (err) {
    showToast('Erro ao salvar página localmente.');
    console.error(err);
  }
}

export function openSavedDrawer() {
  renderSavedPagesList();
  document.getElementById('saved-drawer-backdrop')?.classList.remove('hidden');
  document.getElementById('saved-drawer')?.classList.remove('translate-x-full');
}

export function closeSavedDrawer() {
  document.getElementById('saved-drawer-backdrop')?.classList.add('hidden');
  document.getElementById('saved-drawer')?.classList.add('translate-x-full');
}

export function renderSavedPagesList() {
  const container = document.getElementById('saved-pages-list');
  if (!container) return;

  if (state.savedPages.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 dark:text-slate-400">
        <p class="text-sm font-semibold">Seu caderno ainda está vazio</p>
        <p class="text-xs mt-1">Anote com a S Pen e toque em <strong>"Guardar"</strong> no topo da lousa.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.savedPages.map((page) => `
    <div class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h4 class="font-bold text-xs text-slate-900 dark:text-white leading-snug">${escapeHTML(page.title)}</h4>
          <span class="text-[11px] text-slate-500">${escapeHTML(page.date)}</span>
        </div>
        <button onclick="deleteSavedPage(${page.id})" class="text-xs text-red-500 hover:text-red-700 font-semibold px-1.5 py-0.5">Excluir</button>
      </div>
      <img src="${page.thumbnail}" alt="Anotação S Pen" class="w-full h-28 object-contain bg-white rounded-xl border border-slate-200 dark:border-slate-700" />
      ${page.feedback ? `<p class="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-blue-50/70 dark:bg-blue-950/40 p-2 rounded-lg">✨ Correção / Resultado IA salvo junto</p>` : ''}
      <button onclick="loadSavedPage(${page.id})" class="w-full py-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">Abrir na Lousa S Pen</button>
    </div>
  `).join('');
}

export function loadSavedPage(id) {
  const page = state.savedPages.find((p) => p.id === id);
  if (!page) return;
  state.strokes = JSON.parse(JSON.stringify(page.strokes || []));
  state.redoStack = [];
  setPaperStyle(page.paperStyle || 'dotted');
  redrawAllStrokes();
  saveCanvasDraft(state.strokes);

  if (page.feedback) {
    state.lastAIFeedback = page.feedback;
    const body = document.getElementById('ai-feedback-body');
    if (body) body.innerHTML = formatSimpleMarkdown(page.feedback);
    document.getElementById('ai-feedback-panel')?.classList.remove('hidden');
  }

  closeSavedDrawer();
  showToast('Página restaurada na lousa!');
}

export async function deleteSavedPage(id) {
  try {
    await deletePageFromDB(id);
    state.savedPages = state.savedPages.filter((p) => p.id !== id);
    updateSavedBadge();
    renderSavedPagesList();
  } catch (err) {
    showToast('Erro ao excluir página.');
    console.error(err);
  }
}
