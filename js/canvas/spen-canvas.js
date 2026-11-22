import { state, persistPrefs } from '../state.js';
import { saveCanvasDraft } from '../storage.js';
import { showToast } from '../ui/utils.js';

let canvas = null;
let ctx = null;
let wrapper = null;
let onAutoAnalyzeCallback = null;
let resizeTimer = null;
let draftSaveTimer = null;

// Rastreamento de 2 dedos para Zoom (pinça) e Pan no tablet
const touchPointers = new Map();
let lastPinchDist = null;
let lastPinchCenter = null;

export function initSPenCanvas({ onAutoAnalyze }) {
  canvas = document.getElementById('spen-canvas');
  ctx = canvas.getContext('2d', { desynchronized: true });
  wrapper = document.getElementById('canvas-wrapper');
  onAutoAnalyzeCallback = onAutoAnalyze;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 80);
  });

  if (typeof ResizeObserver !== 'undefined' && wrapper) {
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 40);
    });
    ro.observe(wrapper);
  }

  // Evita menu de contexto no tablet ao segurar o botão da S Pen ou toque longo
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUpOrCancel);
  canvas.addEventListener('pointercancel', handlePointerUpOrCancel);

  // Zoom com roda do mouse + Ctrl no PC
  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    applyZoomAtPoint(state.zoom * factor, cx, cy);
  }, { passive: false });

  resizeCanvas();
  updatePageIndicatorUI();
  updateZoomIndicatorUI();
}

export function resizeCanvas() {
  if (!wrapper || !canvas || !ctx) return;
  const rect = wrapper.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  redrawAllStrokes();
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - state.panX) / state.zoom,
    y: (sy - state.panY) / state.zoom
  };
}

function applyZoomAtPoint(newZoom, screenX, screenY) {
  const clamped = Math.min(3.5, Math.max(0.6, newZoom));
  const worldX = (screenX - state.panX) / state.zoom;
  const worldY = (screenY - state.panY) / state.zoom;
  state.zoom = clamped;
  state.panX = screenX - worldX * clamped;
  state.panY = screenY - worldY * clamped;
  redrawAllStrokes();
  updateZoomIndicatorUI();
}

export function resetCanvasZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  redrawAllStrokes();
  updateZoomIndicatorUI();
}

export function updateZoomIndicatorUI() {
  const el = document.getElementById('zoom-indicator');
  if (el) el.textContent = `${Math.round(state.zoom * 100)}%`;
}

function getEffectiveColor(tool) {
  if (tool === 'eraser') return '#000000';
  if (tool === 'highlighter') return 'rgba(250, 204, 21, 0.36)';
  if (state.color === '#1E293B' && state.darkMode) return '#F1F5F9';
  return state.color;
}

function getPinchMetrics() {
  const pts = Array.from(touchPointers.values());
  if (pts.length < 2) return null;
  const [p1, p2] = pts;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return {
    dist: Math.hypot(dx, dy),
    cx: (p1.x + p2.x) / 2,
    cy: (p1.y + p2.y) / 2
  };
}

function handlePointerDown(e) {
  if (e.pointerType === 'touch') {
    const rect = canvas.getBoundingClientRect();
    touchPointers.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // 2 dedos = Pinça (Zoom + Pan), mesmo com Rejeição de Palma ativa
    if (touchPointers.size === 2) {
      if (state.isDrawing) {
        state.isDrawing = false;
        state.currentStroke = null;
        redrawAllStrokes();
      }
      const m = getPinchMetrics();
      lastPinchDist = m.dist;
      lastPinchCenter = { x: m.cx, y: m.cy };
      return;
    }

    if (state.palmRejectionOnlyPen) {
      return;
    }
  }

  e.preventDefault();
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    // Ignora se não suportado
  }

  // Botão lateral da S Pen (barrel button) ou borracha traseira
  const isBarrelEraser =
    e.pointerType === 'pen' &&
    (e.buttons === 32 || e.buttons === 2 || e.button === 5 || e.button === 2);
  const effectiveTool = isBarrelEraser ? 'eraser' : state.tool;

  const { x, y } = screenToWorld(e.clientX, e.clientY);
  const pressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.5;

  state.isDrawing = true;
  state.redoStack = [];
  state.currentStroke = {
    tool: effectiveTool,
    color: getEffectiveColor(effectiveTool),
    baseWidth: parseFloat(state.baseWidth),
    points: [{ x, y, pressure }]
  };

  drawSinglePoint(state.currentStroke);
  document.getElementById('canvas-placeholder')?.classList.add('hidden');
  clearAutoAnalyzeTimer();
}

function handlePointerMove(e) {
  if (e.pointerType === 'touch' && touchPointers.has(e.pointerId)) {
    const rect = canvas.getBoundingClientRect();
    touchPointers.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (touchPointers.size >= 2) {
      e.preventDefault();
      const m = getPinchMetrics();
      if (m && lastPinchDist && lastPinchCenter) {
        const dx = m.cx - lastPinchCenter.x;
        const dy = m.cy - lastPinchCenter.y;
        state.panX += dx;
        state.panY += dy;
        const scaleFactor = m.dist / lastPinchDist;
        applyZoomAtPoint(state.zoom * scaleFactor, m.cx, m.cy);
        lastPinchDist = m.dist;
        lastPinchCenter = { x: m.cx, y: m.cy };
      }
      return;
    }
  }

  if (!state.isDrawing || !state.currentStroke) return;
  if (state.palmRejectionOnlyPen && e.pointerType === 'touch') return;

  e.preventDefault();
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events) {
    const { x, y } = screenToWorld(ev.clientX, ev.clientY);
    const pressure = ev.pointerType === 'pen' ? (ev.pressure > 0 ? ev.pressure : 0.5) : 0.5;
    state.currentStroke.points.push({ x, y, pressure });
  }
  drawLatestSegment(state.currentStroke);
}

function handlePointerUpOrCancel(e) {
  if (e.pointerType === 'touch') {
    touchPointers.delete(e.pointerId);
    if (touchPointers.size < 2) {
      lastPinchDist = null;
      lastPinchCenter = null;
    }
  }
  finishStroke();
}

function finishStroke() {
  if (!state.isDrawing) return;
  state.isDrawing = false;
  if (state.currentStroke && state.currentStroke.points.length > 0) {
    state.strokes.push(state.currentStroke);
  }
  state.currentStroke = null;
  redrawAllStrokes();
  scheduleDraftSave();

  const autoToggle = document.getElementById('auto-analyze-toggle');
  if (autoToggle?.checked && state.strokes.length > 0 && onAutoAnalyzeCallback) {
    clearAutoAnalyzeTimer();
    state.autoAnalyzeTimer = setTimeout(() => {
      onAutoAnalyzeCallback();
    }, 3000);
  }
}

export function clearAutoAnalyzeTimer() {
  if (state.autoAnalyzeTimer) {
    clearTimeout(state.autoAnalyzeTimer);
    state.autoAnalyzeTimer = null;
  }
}

function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveCanvasDraft(state.pages, state.currentPageIdx);
  }, 400);
}

function applyCanvasTransform(targetCtx) {
  const dpr = window.devicePixelRatio || 1;
  targetCtx.setTransform(
    dpr * state.zoom,
    0,
    0,
    dpr * state.zoom,
    dpr * state.panX,
    dpr * state.panY
  );
}

function drawSinglePoint(stroke) {
  const pt = stroke.points[0];
  if (!pt) return;
  ctx.save();
  applyCanvasTransform(ctx);
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
  }
  const r = stroke.tool === 'eraser' ? stroke.baseWidth * 3.5 : stroke.baseWidth * 0.6;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLatestSegment(stroke) {
  const pts = stroke.points;
  if (pts.length < 2) return;
  const p1 = pts[pts.length - 2];
  const p2 = pts[pts.length - 1];

  ctx.save();
  applyCanvasTransform(ctx);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.baseWidth * 7;
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.baseWidth * 6;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.baseWidth * (0.45 + p2.pressure * 1.15);
  }

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function renderStrokesToContext(targetCtx, strokes, { isExport = false } = {}) {
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) continue;

    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      if (isExport) {
        targetCtx.globalCompositeOperation = 'source-over';
        targetCtx.strokeStyle = '#FFFFFF';
        targetCtx.fillStyle = '#FFFFFF';
      } else {
        targetCtx.globalCompositeOperation = 'destination-out';
        targetCtx.strokeStyle = 'rgba(0,0,0,1)';
        targetCtx.fillStyle = 'rgba(0,0,0,1)';
      }
    } else {
      targetCtx.globalCompositeOperation = 'source-over';
      let color = stroke.color;
      if (isExport) {
        if (stroke.tool === 'pen' && color === '#F1F5F9') {
          color = '#0F172A';
        } else if (stroke.tool === 'highlighter') {
          color = '#FACC15';
          targetCtx.globalAlpha = 0.36;
        }
      } else if (stroke.tool === 'pen' && (color === '#1E293B' || color === '#F1F5F9')) {
        color = state.darkMode ? '#F1F5F9' : '#1E293B';
      }
      targetCtx.strokeStyle = color;
      targetCtx.fillStyle = color;
    }

    if (pts.length === 1) {
      targetCtx.beginPath();
      const r = stroke.tool === 'eraser' ? stroke.baseWidth * 3.5 : stroke.baseWidth * 0.6;
      targetCtx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
      targetCtx.fill();
    } else if (stroke.tool === 'highlighter' && isExport) {
      targetCtx.lineWidth = stroke.baseWidth * 6;
      targetCtx.beginPath();
      targetCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        targetCtx.lineTo(pts[i].x, pts[i].y);
      }
      targetCtx.stroke();
    } else {
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        if (stroke.tool === 'eraser') {
          targetCtx.lineWidth = stroke.baseWidth * 7;
        } else if (stroke.tool === 'highlighter') {
          targetCtx.lineWidth = stroke.baseWidth * 6;
        } else {
          targetCtx.lineWidth = stroke.baseWidth * (0.45 + p2.pressure * 1.15);
        }
        targetCtx.beginPath();
        targetCtx.moveTo(p1.x, p1.y);
        targetCtx.lineTo(p2.x, p2.y);
        targetCtx.stroke();
      }
    }

    targetCtx.restore();
  }
}

export function redrawAllStrokes() {
  if (!wrapper || !ctx || !canvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyCanvasTransform(ctx);
  renderStrokesToContext(ctx, state.strokes, { isExport: false });
  ctx.restore();

  const placeholder = document.getElementById('canvas-placeholder');
  if (placeholder) {
    placeholder.classList.toggle('hidden', state.strokes.length > 0);
  }
}

export function renderStrokesToDataURL(strokes, maxDimension = 1600) {
  const rect = wrapper.getBoundingClientRect();
  const logicalW = Math.max(1, rect.width || 800);
  const logicalH = Math.max(1, rect.height || 600);
  const dpr = window.devicePixelRatio || 1;
  const rawW = logicalW * dpr;
  const rawH = logicalH * dpr;
  const scaleDown = Math.min(1, maxDimension / Math.max(rawW, rawH));

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.round(rawW * scaleDown);
  tempCanvas.height = Math.round(rawH * scaleDown);
  const tCtx = tempCanvas.getContext('2d');

  tCtx.fillStyle = '#FFFFFF';
  tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  tCtx.scale(dpr * scaleDown, dpr * scaleDown);
  renderStrokesToContext(tCtx, strokes, { isExport: true });

  return tempCanvas.toDataURL('image/png');
}

export function exportCanvasAsDataURL(maxDimension = 1600) {
  return renderStrokesToDataURL(state.strokes, maxDimension);
}

// ============================================================================
// CONTROLES DE MÚLTIPLAS PÁGINAS NA LOUSA
// ============================================================================
export function updatePageIndicatorUI() {
  const ind = document.getElementById('canvas-page-indicator');
  if (ind) {
    ind.textContent = `Pág ${state.currentPageIdx + 1}/${state.pages.length}`;
  }
}

export function addCanvasPage() {
  state.pages.push([]);
  state.currentPageIdx = state.pages.length - 1;
  state.redoStack = [];
  redrawAllStrokes();
  updatePageIndicatorUI();
  saveCanvasDraft(state.pages, state.currentPageIdx);
  showToast(`Nova página (${state.currentPageIdx + 1}) criada!`);
}

export function prevCanvasPage() {
  if (state.currentPageIdx > 0) {
    state.currentPageIdx--;
    state.redoStack = [];
    redrawAllStrokes();
    updatePageIndicatorUI();
    saveCanvasDraft(state.pages, state.currentPageIdx);
  }
}

export function nextCanvasPage() {
  if (state.currentPageIdx < state.pages.length - 1) {
    state.currentPageIdx++;
    state.redoStack = [];
    redrawAllStrokes();
    updatePageIndicatorUI();
    saveCanvasDraft(state.pages, state.currentPageIdx);
  } else {
    addCanvasPage();
  }
}

// ============================================================================
// FERRAMENTAS
// ============================================================================
export function selectTool(tool, color) {
  state.tool = tool;
  state.color = color;
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50', 'dark:bg-blue-950');
  });

  let btnId = 'tool-pen-black';
  if (tool === 'pen' && color === '#1D4ED8') btnId = 'tool-pen-blue';
  else if (tool === 'pen' && color === '#DC2626') btnId = 'tool-pen-red';
  else if (tool === 'highlighter') btnId = 'tool-highlighter';
  else if (tool === 'eraser') btnId = 'tool-eraser';

  const activeBtn = document.getElementById(btnId);
  if (activeBtn) {
    activeBtn.classList.add('ring-2', 'ring-blue-600', 'bg-blue-50', 'dark:bg-blue-950');
  }
}

export function changeBaseWidth(val) {
  state.baseWidth = parseFloat(val);
  persistPrefs();
}

export function undoCanvas() {
  if (state.strokes.length === 0) return;
  state.redoStack.push(state.strokes.pop());
  redrawAllStrokes();
  scheduleDraftSave();
}

export function redoCanvas() {
  if (state.redoStack.length === 0) return;
  state.strokes.push(state.redoStack.pop());
  redrawAllStrokes();
  scheduleDraftSave();
}

export function clearCanvasConfirm() {
  if (state.strokes.length === 0) return;
  document.getElementById('clear-modal')?.classList.remove('hidden');
}

export function closeClearModal() {
  document.getElementById('clear-modal')?.classList.add('hidden');
}

export function confirmClearCanvas() {
  clearAutoAnalyzeTimer();
  state.strokes = [];
  state.redoStack = [];
  redrawAllStrokes();
  saveCanvasDraft(state.pages, state.currentPageIdx);
  closeClearModal();
  document.getElementById('calc-result-banner')?.classList.add('hidden');
  showToast('Página atual apagada.');
}

export function setPaperStyle(style) {
  state.paperStyle = style;
  const select = document.getElementById('paper-style-select');
  if (select) select.value = style;
  const pane = document.getElementById('right-pane');
  if (pane) {
    pane.classList.remove('bg-paper-grid', 'bg-paper-ruled', 'bg-paper-dotted', 'bg-paper-blank');
    pane.classList.add(`bg-paper-${style}`);
  }
  persistPrefs();
}

export function applyPalmRejectionUI() {
  const btn = document.getElementById('btn-palm-rejection');
  const label = document.getElementById('palm-label');
  if (!btn || !label) return;

  if (state.palmRejectionOnlyPen) {
    btn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300';
    label.textContent = 'Somente S Pen';
  } else {
    btn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    label.textContent = 'Caneta + Dedo';
  }
}

export function togglePalmRejection() {
  state.palmRejectionOnlyPen = !state.palmRejectionOnlyPen;
  applyPalmRejectionUI();
  persistPrefs();
  showToast(
    state.palmRejectionOnlyPen
      ? 'Rejeição de Palma ativada (use 2 dedos para zoom/arrastar).'
      : 'Toque com dedo e S Pen ativados.'
  );
}
