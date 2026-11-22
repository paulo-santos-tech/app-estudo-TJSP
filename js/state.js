import { DEFAULT_STORY_LESSONS } from './data/lessons.js';
import { getLocalJSON, setLocalJSON } from './storage.js';

const savedPrefs = getLocalJSON('tjsp2027_prefs', {});

export const state = {
  mode: savedPrefs.mode || 'aulas', // 'aulas' | 'redacao' | 'calculadora'
  disciplineFilter: savedPrefs.disciplineFilter || 'todas',
  currentLessonIdx: savedPrefs.currentLessonIdx || 0,
  answeredQuestions: getLocalJSON('tjsp2027_answered_questions', {}),
  attemptHistory: getLocalJSON('tjsp2027_attempt_history', []),
  examDate: savedPrefs.examDate || '2027-03-21',
  personalNotes: getLocalJSON('tjsp2027_personal_notes', {}),
  currentEssayIdx: savedPrefs.currentEssayIdx || 0,
  selectedCause1Idx: 0,
  selectedCause2Idx: 0,
  palmRejectionOnlyPen: savedPrefs.palmRejectionOnlyPen ?? true,
  darkMode: savedPrefs.darkMode ?? false,
  paperStyle: savedPrefs.paperStyle || 'dotted',
  tool: 'pen',
  color: '#1E293B',
  baseWidth: savedPrefs.baseWidth || 2.8,

  // Múltiplas páginas na lousa + Zoom/Pan
  pages: [[]],
  currentPageIdx: 0,
  get strokes() {
    return this.pages[this.currentPageIdx] || (this.pages[this.currentPageIdx] = []);
  },
  set strokes(val) {
    this.pages[this.currentPageIdx] = Array.isArray(val) ? val : [];
  },
  zoom: 1,
  panX: 0,
  panY: 0,

  redoStack: [],
  currentStroke: null,
  isDrawing: false,
  autoAnalyzeTimer: null,
  savedPages: [],
  lessons: [...DEFAULT_STORY_LESSONS],
  lastAIFeedback: ''
};

export function persistPrefs() {
  setLocalJSON('tjsp2027_prefs', {
    mode: state.mode,
    disciplineFilter: state.disciplineFilter,
    currentLessonIdx: state.currentLessonIdx,
    currentEssayIdx: state.currentEssayIdx,
    palmRejectionOnlyPen: state.palmRejectionOnlyPen,
    darkMode: state.darkMode,
    paperStyle: state.paperStyle,
    baseWidth: state.baseWidth,
    examDate: state.examDate
  });
}

export function persistAnsweredQuestions() {
  setLocalJSON('tjsp2027_answered_questions', state.answeredQuestions);
}

export function persistAttemptHistory() {
  setLocalJSON('tjsp2027_attempt_history', state.attemptHistory);
}

export function persistPersonalNotes() {
  setLocalJSON('tjsp2027_personal_notes', state.personalNotes);
}
