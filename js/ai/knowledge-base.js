import { state } from '../state.js';
import {
  loadStudySources,
  saveStudySourceToDB,
  deleteStudySourceFromDB
} from '../storage.js';
import { escapeHTML, showToast } from '../ui/utils.js';

let cachedSources = [];

export async function initKnowledgeBase() {
  cachedSources = await loadStudySources();
  updateSourcesBadge();
}

export function getStudySources() {
  return cachedSources;
}

export function updateSourcesBadge() {
  const badge = document.getElementById('sources-badge');
  if (badge) {
    const activeCount = cachedSources.filter((s) => s.enabled !== false).length;
    badge.textContent = String(activeCount);
  }
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

/**
 * Busca nas fontes locais do tablet + anotações do aluno os trechos mais relevantes
 * para conectar a IA Gemini ao material salvo localmente.
 */
export function buildLocalAIContext(queryText = '', maxChars = 12000) {
  const queryTokens = new Set(tokenize(queryText));
  const chunks = [];

  // 1. Fontes de estudo salvas no IndexedDB do tablet
  const activeSources = cachedSources.filter((s) => s.enabled !== false && s.content);
  for (const src of activeSources) {
    const paragraphs = src.content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    if (paragraphs.length === 0) continue;

    // Pontua parágrafos por relevância com a pergunta/aula atual
    const scored = paragraphs.map((p, idx) => {
      const pTokens = tokenize(p);
      let score = idx === 0 ? 1 : 0; // leve bônus para cabeçalho
      for (const t of pTokens) {
        if (queryTokens.has(t)) score += 2;
      }
      return { text: p.trim(), score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, 6).map((s) => s.text).join('\n');
    chunks.push(`[FONTE LOCAL: ${src.title}]\n${selected}`);
  }

  // 2. Anotações digitadas do aluno nas aulas
  const noteEntries = Object.entries(state.personalNotes || {}).filter(([, val]) => val && val.trim());
  if (noteEntries.length > 0) {
    const notesText = noteEntries
      .slice(0, 8)
      .map(([lessonId, note]) => {
        const lesson = state.lessons.find((l) => l.id === lessonId);
        return `- (${lesson ? lesson.title : lessonId}): ${note.trim()}`;
      })
      .join('\n');
    chunks.push(`[ANOTAÇÕES DO ALUNO NO TABLET]\n${notesText}`);
  }

  if (chunks.length === 0) return '';

  let combined = chunks.join('\n\n');
  if (combined.length > maxChars) {
    combined = combined.slice(0, maxChars) + '\n...[conteúdo truncado]';
  }

  return `\n\n=== BASE DE CONHECIMENTO LOCAL DO TABLET DO ALUNO ===\nUse prioritariamente estas fontes e anotações salvas pelo aluno ao explicar, criar histórias ou corrigir:\n${combined}\n=== FIM DA BASE LOCAL ===`;
}

export function openSourcesModal() {
  renderSourcesList();
  document.getElementById('sources-modal')?.classList.remove('hidden');
}

export function closeSourcesModal() {
  document.getElementById('sources-modal')?.classList.add('hidden');
}

export async function addManualStudySource(e) {
  e.preventDefault();
  const titleInput = document.getElementById('source-title-input');
  const contentInput = document.getElementById('source-content-input');
  const title = titleInput?.value.trim();
  const content = contentInput?.value.trim();

  if (!title || !content) {
    showToast('Preencha o título e o conteúdo da fonte.');
    return;
  }

  const newSource = {
    id: 'src-' + Date.now(),
    title,
    content,
    enabled: true,
    createdAt: Date.now()
  };

  await saveStudySourceToDB(newSource);
  cachedSources.unshift(newSource);
  titleInput.value = '';
  contentInput.value = '';
  updateSourcesBadge();
  renderSourcesList();
  showToast('Fonte salva localmente no tablet e conectada à IA!');
}

export async function uploadStudySourceFiles(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  let added = 0;
  for (const file of files) {
    try {
      const text = await file.text();
      if (!text.trim()) continue;
      const src = {
        id: 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        title: file.name,
        content: text.trim(),
        enabled: true,
        createdAt: Date.now()
      };
      await saveStudySourceToDB(src);
      cachedSources.unshift(src);
      added++;
    } catch {
      // Ignora arquivo que não pôde ser lido como texto
    }
  }

  event.target.value = '';
  updateSourcesBadge();
  renderSourcesList();
  if (added > 0) {
    showToast(`${added} arquivo(s) salvo(s) na base local da IA!`);
  } else {
    showToast('Use arquivos .txt, .md ou .csv (para PDFs, copie e cole o texto).');
  }
}

export async function toggleStudySource(id) {
  const src = cachedSources.find((s) => s.id === id);
  if (!src) return;
  src.enabled = src.enabled === false;
  await saveStudySourceToDB(src);
  updateSourcesBadge();
  renderSourcesList();
}

export async function removeStudySource(id) {
  await deleteStudySourceFromDB(id);
  cachedSources = cachedSources.filter((s) => s.id !== id);
  updateSourcesBadge();
  renderSourcesList();
  showToast('Fonte removida.');
}

export function renderSourcesList() {
  const container = document.getElementById('sources-list');
  if (!container) return;

  if (cachedSources.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
        Nenhuma fonte adicionada ainda. Envie arquivos <code>.txt</code>/<code>.md</code> ou cole artigos de lei/resumos acima para a IA consultar localmente.
      </div>
    `;
    return;
  }

  container.innerHTML = cachedSources
    .map((src) => {
      const active = src.enabled !== false;
      const chars = src.content?.length || 0;
      return `
        <div class="p-3 rounded-xl border ${active ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'} flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-xs text-slate-900 dark:text-white truncate">${escapeHTML(src.title)}</div>
            <div class="text-[11px] text-slate-500">${chars.toLocaleString('pt-BR')} caracteres • ${active ? 'Conectada à IA ✓' : 'Pausada'}</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="toggleStudySource('${escapeHTML(src.id)}')" class="px-2 py-1 rounded-lg text-[11px] font-semibold ${active ? 'bg-blue-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">
              ${active ? 'Ativa' : 'Ativar'}
            </button>
            <button onclick="removeStudySource('${escapeHTML(src.id)}')" class="px-2 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">Excluir</button>
          </div>
        </div>
      `;
    })
    .join('');
}
