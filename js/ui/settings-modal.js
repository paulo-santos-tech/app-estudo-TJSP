import { state } from '../state.js';
import { getGeminiConfig, saveGeminiConfig } from '../ai/gemini.js';
import { getStudySources, initKnowledgeBase } from '../ai/knowledge-base.js';
import { savePageToDB, saveCustomLessonToDB, saveStudySourceToDB } from '../storage.js';
import { updateSavedBadge } from './notebook-drawer.js';
import { updateScoreCounter, renderStoryLessonView } from './lessons-view.js';
import { showToast } from './utils.js';

export function openSettingsModal() {
  const { apiKey, model } = getGeminiConfig();
  const keyInput = document.getElementById('settings-api-key');
  const modelSelect = document.getElementById('settings-model');
  if (keyInput) keyInput.value = apiKey;
  if (modelSelect) modelSelect.value = model;
  document.getElementById('settings-modal')?.classList.remove('hidden');
}

export function closeSettingsModal() {
  document.getElementById('settings-modal')?.classList.add('hidden');
}

export function saveSettingsForm(e) {
  e.preventDefault();
  const key = document.getElementById('settings-api-key')?.value || '';
  const model = document.getElementById('settings-model')?.value || 'gemini-3-flash-preview';
  saveGeminiConfig(key, model);
  closeSettingsModal();
  showToast('Configurações da IA Gemini salvas localmente!');
}

export function exportLocalBackup() {
  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    savedPages: state.savedPages,
    customLessons: state.lessons.filter((l) => l.isCustom),
    studySources: getStudySources(),
    personalNotes: state.personalNotes,
    answeredQuestions: state.answeredQuestions,
    attemptHistory: state.attemptHistory
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caderno-tjsp2027-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON baixado no tablet!');
}

export async function importLocalBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (Array.isArray(data.savedPages)) {
      for (const p of data.savedPages) {
        if (!state.savedPages.some((sp) => sp.id === p.id)) {
          await savePageToDB(p);
          state.savedPages.push(p);
        }
      }
      state.savedPages.sort((a, b) => (b.id || 0) - (a.id || 0));
      updateSavedBadge();
    }

    if (Array.isArray(data.customLessons)) {
      for (const l of data.customLessons) {
        if (!state.lessons.some((sl) => sl.id === l.id)) {
          await saveCustomLessonToDB(l);
          state.lessons.unshift(l);
        }
      }
    }

    if (Array.isArray(data.studySources)) {
      const existing = getStudySources();
      for (const s of data.studySources) {
        if (!existing.some((es) => es.id === s.id)) {
          await saveStudySourceToDB(s);
        }
      }
      await initKnowledgeBase();
    }

    if (data.personalNotes && typeof data.personalNotes === 'object') {
      Object.assign(state.personalNotes, data.personalNotes);
      localStorage.setItem('tjsp2027_personal_notes', JSON.stringify(state.personalNotes));
    }

    if (data.answeredQuestions && typeof data.answeredQuestions === 'object') {
      Object.assign(state.answeredQuestions, data.answeredQuestions);
      localStorage.setItem('tjsp2027_answered_questions', JSON.stringify(state.answeredQuestions));
      updateScoreCounter();
    }

    if (Array.isArray(data.attemptHistory)) {
      state.attemptHistory = data.attemptHistory;
      localStorage.setItem('tjsp2027_attempt_history', JSON.stringify(state.attemptHistory));
    }

    renderStoryLessonView();
    showToast('Backup restaurado com sucesso!');
  } catch (err) {
    showToast('Arquivo de backup inválido.');
    console.error(err);
  } finally {
    event.target.value = '';
  }
}
