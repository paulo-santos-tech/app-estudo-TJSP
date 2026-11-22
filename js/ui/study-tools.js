import { state } from '../state.js';
import { GUIDED_ESSAYS } from '../data/essays.js';
import { renderStrokesToDataURL } from '../canvas/spen-canvas.js';
import { getFilteredLessons, savePersonalTextNote, renderStoryLessonView } from './lessons-view.js';
import { escapeHTML, formatSimpleMarkdown, showToast } from './utils.js';

// ============================================================================
// 1. CRONÔMETRO DE SIMULADO / REDAÇÃO VUNESP
// ============================================================================
let timerSeconds = 0;
let timerRunning = false;
let timerInterval = null;

function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function toggleStudyTimer() {
  const btn = document.getElementById('btn-timer-toggle');
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    if (btn) btn.title = 'Retomar Cronômetro';
  } else {
    timerRunning = true;
    if (btn) btn.title = 'Pausar Cronômetro';
    timerInterval = setInterval(() => {
      timerSeconds++;
      const el = document.getElementById('study-timer-display');
      if (el) el.textContent = formatTimer(timerSeconds);
    }, 1000);
  }
  const icon = document.getElementById('timer-play-icon');
  if (icon) icon.textContent = timerRunning ? '⏸' : '▶';
}

export function resetStudyTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 0;
  const el = document.getElementById('study-timer-display');
  if (el) el.textContent = '00:00';
  const icon = document.getElementById('timer-play-icon');
  if (icon) icon.textContent = '▶';
}

// ============================================================================
// 2. MODAL DE TEXTO ALINHADO (S PEN -> TECLADO)
// ============================================================================
export function closeAlignedTextModal() {
  document.getElementById('aligned-text-modal')?.classList.add('hidden');
}

export async function copyAlignedText() {
  const text = document.getElementById('aligned-text-output')?.value || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Texto alinhado copiado!');
  } catch {
    showToast('Selecione o texto para copiar.');
  }
}

export function sendAlignedTextToNotes() {
  const text = document.getElementById('aligned-text-output')?.value || '';
  if (!text) return;
  const list = getFilteredLessons();
  const lesson = list[state.currentLessonIdx] || list[0];
  if (!lesson) return;

  const existing = state.personalNotes[lesson.id] || '';
  const combined = existing ? `${existing}\n\n${text}` : text;
  savePersonalTextNote(lesson.id, combined);
  if (state.mode === 'aulas') renderStoryLessonView();
  closeAlignedTextModal();
  showToast('Texto inserido nas anotações da aula!');
}

export function downloadAlignedText() {
  const text = document.getElementById('aligned-text-output')?.value || '';
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anotacao-spen-tjsp-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Arquivo .txt baixado!');
}

// ============================================================================
// 3. EXPORTAÇÃO EM PDF (IMPRESSÃO LIMPA OFFLINE)
// ============================================================================
export function exportNotebookPDF() {
  const nonEmptyPages = state.pages.filter((p) => Array.isArray(p) && p.length > 0);
  if (nonEmptyPages.length === 0 && !state.lastAIFeedback) {
    showToast('Escreva algo na lousa ou gere uma análise antes de exportar o PDF.');
    return;
  }

  let contextTitle = 'Caderno Inteligente S Pen • TJSP 2027';
  let typedNotes = '';
  if (state.mode === 'aulas') {
    const list = getFilteredLessons();
    const lesson = list[state.currentLessonIdx] || list[0];
    if (lesson) {
      contextTitle = `Aula: ${lesson.title}`;
      typedNotes = state.personalNotes[lesson.id] || '';
    }
  } else if (state.mode === 'redacao') {
    contextTitle = `Redação Vunesp: ${GUIDED_ESSAYS[state.currentEssayIdx].title}`;
  } else {
    contextTitle = 'Calculadora Inteligente S Pen • Resolução';
  }

  const pageImagesHTML = nonEmptyPages
    .map((strokes, i) => {
      const dataUrl = renderStrokesToDataURL(strokes, 1600);
      return `
        <div class="pdf-page-block">
          <div class="pdf-page-label">Lousa S Pen — Página ${i + 1}</div>
          <img src="${dataUrl}" alt="Página ${i + 1}" />
        </div>
      `;
    })
    .join('');

  const printWin = window.open('', '_blank');
  if (!printWin) {
    showToast('Permita pop-ups para gerar o PDF.');
    return;
  }

  printWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHTML(contextTitle)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }
    h1 { font-size: 18px; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 12px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 18px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1e3a8a; margin: 18px 0 8px; }
    .pdf-page-block { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; margin-bottom: 14px; page-break-inside: avoid; }
    .pdf-page-label { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; }
    .pdf-page-block img { width: 100%; height: auto; display: block; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; white-space: pre-wrap; }
    .ai-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; font-size: 13px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHTML(contextTitle)}</h1>
  <div class="meta">TJSP 2027 • Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  ${pageImagesHTML}
  ${typedNotes ? `<div class="section-title">Anotações Digitadas</div><div class="box">${escapeHTML(typedNotes)}</div>` : ''}
  ${state.lastAIFeedback ? `<div class="section-title">Análise / Correção Tutor Gemini</div><div class="ai-box">${formatSimpleMarkdown(state.lastAIFeedback)}</div>` : ''}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
  printWin.document.close();
}
