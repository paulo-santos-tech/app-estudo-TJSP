import { state, persistPrefs } from './state.js';
import { loadSavedPages, loadCustomLessons, loadCanvasDraft } from './storage.js';
import {
  initSPenCanvas,
  redrawAllStrokes,
  selectTool,
  changeBaseWidth,
  undoCanvas,
  redoCanvas,
  clearCanvasConfirm,
  closeClearModal,
  confirmClearCanvas,
  setPaperStyle,
  applyPalmRejectionUI,
  togglePalmRejection,
  clearAutoAnalyzeTimer,
  addCanvasPage,
  prevCanvasPage,
  nextCanvasPage,
  resetCanvasZoom,
  updatePageIndicatorUI
} from './canvas/spen-canvas.js';
import {
  analyzeHandwritingWithAI,
  convertHandwritingToAlignedText,
  generateCustomStoryLesson,
  closeAIFeedback
} from './ai/gemini.js';
import {
  initKnowledgeBase,
  openSourcesModal,
  closeSourcesModal,
  addManualStudySource,
  uploadStudySourceFiles,
  toggleStudySource,
  removeStudySource
} from './ai/knowledge-base.js';
import {
  selectStoryDiscipline,
  renderStoryLessonView,
  savePersonalTextNote,
  answerLessonQuestion,
  prevLesson,
  nextLesson,
  updateScoreCounter
} from './ui/lessons-view.js';
import {
  nextEssayTopic,
  selectEssayIdea,
  renderGuidedRedacaoView
} from './ui/redacao-view.js';
import { renderCalculadoraGuideView } from './ui/calculadora-view.js';
import {
  saveCurrentPage,
  openSavedDrawer,
  closeSavedDrawer,
  loadSavedPage,
  deleteSavedPage,
  updateSavedBadge
} from './ui/notebook-drawer.js';
import {
  openSettingsModal,
  closeSettingsModal,
  saveSettingsForm,
  exportLocalBackup,
  importLocalBackup
} from './ui/settings-modal.js';
import {
  toggleStudyTimer,
  resetStudyTimer,
  exportNotebookPDF,
  closeAlignedTextModal,
  copyAlignedText,
  sendAlignedTextToNotes,
  downloadAlignedText
} from './ui/study-tools.js';
import {
  openAnalyticsModal,
  closeAnalyticsModal,
  updateExamDate,
  generateWeaknessReinforcement,
  runAIStrategicDiagnosis
} from './ui/analytics-modal.js';
import { showToast } from './ui/utils.js';

let deferredInstallPrompt = null;

function applyDarkModeUI() {
  document.documentElement.classList.toggle('dark', state.darkMode);
  document.getElementById('icon-moon')?.classList.toggle('hidden', state.darkMode);
  document.getElementById('icon-sun')?.classList.toggle('hidden', !state.darkMode);
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  applyDarkModeUI();
  persistPrefs();
  redrawAllStrokes();
}

function setAppMode(mode, { preservePaper = false } = {}) {
  clearAutoAnalyzeTimer();
  state.mode = mode;
  persistPrefs();

  document.querySelectorAll('.mode-tab').forEach((btn) => {
    btn.className = 'mode-tab px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300 hover:text-slate-900';
  });
  const active = document.getElementById(`tab-${mode}`);
  if (active) {
    active.className = 'mode-tab px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-300 shadow-sm';
  }

  document.getElementById('aulas-filters')?.classList.toggle('hidden', mode !== 'aulas');
  document.getElementById('redacao-filters')?.classList.toggle('hidden', mode !== 'redacao');
  document.getElementById('calculadora-filters')?.classList.toggle('hidden', mode !== 'calculadora');
  document.getElementById('calc-result-banner')?.classList.toggle('hidden', mode !== 'calculadora');

  const actionBtn = document.getElementById('btn-analyze-ai');
  const actionLabel = document.getElementById('btn-analyze-label');
  const pTitle = document.getElementById('placeholder-title');
  const pDesc = document.getElementById('placeholder-desc');

  if (mode === 'aulas') {
    actionBtn.className = 'pointer-events-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95';
    actionLabel.textContent = 'Analisar Minhas Anotações S Pen';
    pTitle.textContent = 'Caderno de Anotações & Esquemas S Pen';
    pDesc.textContent = 'Anote os pontos da história, crie mapas mentais ou resolva o exercício com a S Pen.';
    renderStoryLessonView();
  } else if (mode === 'redacao') {
    if (!preservePaper) setPaperStyle('ruled');
    actionBtn.className = 'pointer-events-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-700 via-orange-600 to-red-600 hover:from-amber-600 hover:to-red-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95';
    actionLabel.textContent = 'Corrigir Minha Redação (Nota + Pontos a Melhorar)';
    pTitle.textContent = 'Folha Oficial de Redação Vunesp (S Pen)';
    pDesc.textContent = 'Use o roteiro ao lado para destravar suas ideias e escreva seus 4 parágrafos aqui.';
    renderGuidedRedacaoView();
  } else if (mode === 'calculadora') {
    if (!preservePaper) setPaperStyle('grid');
    actionBtn.className = 'pointer-events-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95';
    actionLabel.textContent = 'Calcular Fórmula / Conta Desenhada';
    pTitle.textContent = 'Lousa Calculadora Inteligente (S Pen)';
    pDesc.textContent = 'Desenhe qualquer fórmula, equação, regra de três, raiz ou porcentagem aqui. Eu calculo e explico para você!';
    renderCalculadoraGuideView();
  }
}

async function handleCustomStoryOrQuestion(e) {
  e.preventDefault();
  const input = document.getElementById('quick-chat-input');
  const topicQuery = input?.value.trim();
  if (!topicQuery) return;

  const btn = document.getElementById('btn-quick-send');
  btn.disabled = true;
  btn.innerHTML = '<span>Criando...</span>';
  input.value = '';

  try {
    await generateCustomStoryLesson(topicQuery, {
      onLessonCreated: () => {
        state.disciplineFilter = 'todas';
        state.currentLessonIdx = 0;
        persistPrefs();
        setAppMode('aulas');
        showToast('Nova aula com história criada e salva localmente!');
      }
    });
  } catch (err) {
    showToast(`Erro ao criar aula: ${err.message || 'Tente novamente.'}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Criar Aula</span>';
  }
}

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('App instalado no seu tablet!');
  }
  deferredInstallPrompt = null;
  document.getElementById('btn-install-pwa')?.classList.add('hidden');
}

function registerServiceWorkerAndPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('btn-install-pwa')?.classList.remove('hidden');
  });

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker não registrado:', err);
    });
  }
}

Object.assign(window, {
  setAppMode,
  togglePalmRejection,
  openSavedDrawer,
  closeSavedDrawer,
  toggleDarkMode,
  selectStoryDiscipline,
  nextEssayTopic,
  selectEssayIdea,
  handleCustomStoryOrQuestion,
  selectTool,
  changeBaseWidth,
  undoCanvas,
  redoCanvas,
  clearCanvasConfirm,
  closeClearModal,
  confirmClearCanvas,
  setPaperStyle,
  addCanvasPage,
  prevCanvasPage,
  nextCanvasPage,
  resetCanvasZoom,
  saveCurrentPage,
  analyzeHandwritingWithAI,
  convertHandwritingToAlignedText,
  closeAIFeedback,
  savePersonalTextNote,
  answerLessonQuestion,
  prevLesson,
  nextLesson,
  loadSavedPage,
  deleteSavedPage,
  openSettingsModal,
  closeSettingsModal,
  saveSettingsForm,
  exportLocalBackup,
  importLocalBackup,
  installPWA,
  toggleStudyTimer,
  resetStudyTimer,
  exportNotebookPDF,
  closeAlignedTextModal,
  copyAlignedText,
  sendAlignedTextToNotes,
  downloadAlignedText,
  openSourcesModal,
  closeSourcesModal,
  addManualStudySource,
  uploadStudySourceFiles,
  toggleStudySource,
  removeStudySource,
  openAnalyticsModal,
  closeAnalyticsModal,
  updateExamDate,
  generateWeaknessReinforcement,
  runAIStrategicDiagnosis
});

async function bootstrapApp() {
  applyDarkModeUI();
  applyPalmRejectionUI();

  const widthSelect = document.getElementById('stroke-width-select');
  if (widthSelect) widthSelect.value = String(state.baseWidth);

  const [savedPages, customLessons, draft] = await Promise.all([
    loadSavedPages(),
    loadCustomLessons(),
    loadCanvasDraft(),
    initKnowledgeBase()
  ]);

  state.savedPages = savedPages;
  if (customLessons.length > 0) {
    state.lessons = [...customLessons, ...state.lessons];
  }
  if (draft && Array.isArray(draft.pages) && draft.pages.length > 0) {
    state.pages = draft.pages;
    state.currentPageIdx = draft.currentPageIdx || 0;
  }

  initSPenCanvas({ onAutoAnalyze: analyzeHandwritingWithAI });
  updatePageIndicatorUI();
  setPaperStyle(state.paperStyle);
  setAppMode(state.mode, { preservePaper: true });
  updateSavedBadge();
  updateScoreCounter();
  registerServiceWorkerAndPWA();
}

window.addEventListener('DOMContentLoaded', bootstrapApp);
