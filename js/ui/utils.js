/**
 * Utilitários seguros de UI e formatação
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converte Markdown simples da IA para HTML seguro (sem XSS e com listas agrupadas corretamente)
 */
export function formatSimpleMarkdown(mdText) {
  if (!mdText) return '';
  const escaped = escapeHTML(mdText);

  const lines = escaped.split(/\r?\n/);
  const htmlParts = [];
  let inUl = false;
  let inOl = false;
  let inPre = false;
  let preLines = [];

  const closeLists = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  };

  const formatInline = (text) =>
    text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      if (inPre) {
        htmlParts.push(`<pre>${preLines.join('\n')}</pre>`);
        preLines = [];
        inPre = false;
      } else {
        closeLists();
        inPre = true;
      }
      continue;
    }

    if (inPre) {
      preLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      continue;
    }

    const hMatch = line.match(/^#{1,3}\s+(.*)$/);
    if (hMatch) {
      closeLists();
      htmlParts.push(`<h3>${formatInline(hMatch[1])}</h3>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`<li>${formatInline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${formatInline(line)}</p>`);
  }

  if (inPre) htmlParts.push(`<pre>${preLines.join('\n')}</pre>`);
  closeLists();

  return htmlParts.join('');
}

export function showToast(msg) {
  const toast = document.getElementById('toast-banner');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2800);
}
