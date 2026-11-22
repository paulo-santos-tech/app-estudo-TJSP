import { state } from '../state.js';
import { GUIDED_ESSAYS } from '../data/essays.js';
import { exportCanvasAsDataURL } from '../canvas/spen-canvas.js';
import { saveCustomLessonToDB } from '../storage.js';
import { buildLocalAIContext } from './knowledge-base.js';
import { escapeHTML, formatSimpleMarkdown, showToast } from '../ui/utils.js';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.8-flash';

export function getGeminiConfig() {
  try {
    const key = localStorage.getItem('tjsp2027_gemini_api_key') || '';
    const model = localStorage.getItem('tjsp2027_gemini_model') || DEFAULT_MODEL;
    return { apiKey: key.trim(), model };
  } catch {
    return { apiKey: '', model: DEFAULT_MODEL };
  }
}

export function saveGeminiConfig(apiKey, model) {
  try {
    localStorage.setItem('tjsp2027_gemini_api_key', (apiKey || '').trim());
    localStorage.setItem('tjsp2027_gemini_model', model || DEFAULT_MODEL);
  } catch {
    // Ignora se localStorage estiver indisponível
  }
}

export const GEMINI_SYSTEM_PROMPT = `Você é o Tutor Especialista do Concurso de Escrevente Técnico Judiciário do TJSP 2027 (Banca Vunesp).
Regras obrigatórias de didática para este aluno:
1. O aluno aprende e assimila o conteúdo por meio de HISTÓRIAS envolventes e explicações NOS MÍNIMOS DETALHES antes de resolver exercícios.
2. Acervo de referência TJSP 2027:
   - Resolução 963/2025 (eproc): processos antigos continuam no e-SAJ até o fim (inclusive recursos e incidentes), salvo migração.
   - Resolução 850/2021 (Teletrabalho): estágio probatório PODE; PERDE auxílio-transporte nos dias remotos; MANTÉM auxílio-alimentação; SEM auxílio tecnológico.
   - Normas da Corregedoria (NSCGJ): Correição ordinária em DEZEMBRO; Visita em 30 dias; Conclusão ao juiz em 1 dia; Execução em 5 dias; Senha de terceiros vale 48h; Cotas a lápis ou atos em branco são VEDADOS.
   - Estatuto 10.261/68: Posse 30d (+30), Exercício 30d (senão nomeação SEM EFEITO); Afastamento preventivo 180d (+180) SEM prejuízo; Procurador proibido EXCETO cônjuge ou parente até 2º grau.
   - Português Vunesp: Crase (troca pelo masculino -> "ao"), Colocação pronominal (ímãs: não, que, já; proibido iniciar frase com pronome), Conjunções concessivas (embora, conquanto, posto que).
   - Matemática/Excel Vunesp: Triângulo 3-4-5, regra de três, PROCV com cifrão $, MAIOR/MENOR com empates.
3. Responda sempre em Português do Brasil claro, acolhedor, organizado com tópicos e passo a passo.`;

async function fetchGeminiWithModel(model, apiKey, payload) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error?.message) errMsg += `: ${errData.error.message}`;
    } catch {
      // ignora erro ao ler JSON de erro
    }
    throw new Error(errMsg);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta vazia da IA');
  return text;
}

export async function callGeminiAPI(parts, systemInstructionText = GEMINI_SYSTEM_PROMPT, jsonSchema = null) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    }
    throw new Error('Informe sua chave de API do Gemini nas Configurações (⚙️) para ativar a IA.');
  }

  const payload = {
    contents: [{ role: 'user', parts }],
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    }
  };

  if (jsonSchema) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: jsonSchema
    };
  }

  const delays = [1000, 2000];
  let lastError = null;
  const modelsToTry = model === FALLBACK_MODEL ? [model] : [model, FALLBACK_MODEL];

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await fetchGeminiWithModel(currentModel, apiKey, payload);
      } catch (err) {
        lastError = err;
        if (err.message.includes('HTTP 400') || err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
          break;
        }
        if (attempt < delays.length) {
          await new Promise((res) => setTimeout(res, delays[attempt]));
        }
      }
    }
  }

  throw lastError || new Error('Falha ao conectar com a API do Gemini');
}

function getFilteredLessonsLocal() {
  if (state.disciplineFilter === 'todas') return state.lessons;
  return state.lessons.filter((l) => l.discipline === state.disciplineFilter);
}

/**
 * Converte a escrita à mão da S Pen em texto digital alinhado (como digitado no teclado)
 */
export async function convertHandwritingToAlignedText() {
  if (state.strokes.length === 0) {
    showToast('Escreva algo na lousa com a S Pen primeiro!');
    return;
  }
  if (!navigator.onLine) {
    showToast('Conecte-se à internet para converter a escrita S Pen em texto.');
    return;
  }

  const btn = document.getElementById('btn-handwriting-to-text');
  if (btn) btn.disabled = true;
  showToast('Convertendo sua escrita S Pen em texto alinhado...');

  try {
    const base64Data = exportCanvasAsDataURL(1600).split(',')[1];
    const prompt = `Transcreva exatamente o que foi escrito à mão nesta lousa digital, organizando e alinhando o texto como se tivesse sido digitado no teclado:
- Se houver parágrafos (como em uma redação), mantenha cada parágrafo bem separado com linha em branco e recuo/alinhamento limpo.
- Se houver tópicos ou listas, formate com marcadores ("• ").
- Se houver equações ou fórmulas, mantenha a notação matemática clara e alinhada.
- Corrija apenas falhas óbvias de traço/letra ilegível, mas NÃO reescreva as ideias do aluno nem adicione comentários extras. Retorne SOMENTE o texto transcrito e alinhado.`;

    const alignedText = await callGeminiAPI([
      { text: prompt },
      { inlineData: { mimeType: 'image/png', data: base64Data } }
    ]);

    const textarea = document.getElementById('aligned-text-output');
    if (textarea) textarea.value = alignedText.trim();
    document.getElementById('aligned-text-modal')?.classList.remove('hidden');
  } catch (err) {
    showToast(err.message || 'Erro ao converter escrita em texto.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function analyzeHandwritingWithAI() {
  if (state.strokes.length === 0) {
    showToast('Desenhe ou escreva algo na lousa com a S Pen primeiro!');
    return;
  }

  if (!navigator.onLine) {
    showToast('Você está offline. Conecte-se à internet para usar o Tutor IA.');
    return;
  }

  const btn = document.getElementById('btn-analyze-ai');
  const label = document.getElementById('btn-analyze-label');
  const originalLabel = label.textContent;
  btn.disabled = true;
  label.textContent = 'Lendo S Pen...';

  const feedbackPanel = document.getElementById('ai-feedback-panel');
  const feedbackBody = document.getElementById('ai-feedback-body');
  const panelTitle = document.getElementById('ai-panel-title');
  feedbackPanel.classList.remove('hidden');
  feedbackBody.innerHTML = `<div class="py-3 text-blue-800 dark:text-blue-300 font-medium">Examinando cada traço da sua S Pen com Gemini...</div>`;

  try {
    const base64Data = exportCanvasAsDataURL(1600).split(',')[1];

    if (state.mode === 'calculadora') {
      panelTitle.textContent = '🧮 Calculadora Inteligente S Pen • Resolução Passo a Passo';
      const calcSchema = {
        type: 'OBJECT',
        properties: {
          recognizedExpression: { type: 'STRING' },
          finalResult: { type: 'STRING' },
          userAttemptEvaluation: { type: 'STRING' },
          stepByStepExplanation: { type: 'STRING' }
        },
        required: ['recognizedExpression', 'finalResult', 'userAttemptEvaluation', 'stepByStepExplanation']
      };

      const prompt = 'Analise a fórmula, conta, equação, regra de três ou expressão matemática escrita à mão com a S Pen nesta imagem. Extraia a expressão matemática reconhecida, calcule o resultado final exato, verifique se o aluno escreveu uma tentativa de resposta (apontando se acertou ou onde errou) e explique a resolução nos mínimos detalhes.';

      const jsonStr = await callGeminiAPI(
        [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }],
        GEMINI_SYSTEM_PROMPT,
        calcSchema
      );

      const calcData = JSON.parse(jsonStr);
      document.getElementById('calc-result-banner').classList.remove('hidden');
      document.getElementById('calc-recognized-expr').textContent = calcData.recognizedExpression;
      document.getElementById('calc-final-answer').textContent = calcData.finalResult;

      const formatted = `
        <h3>📐 Expressão Lida da Sua S Pen: <code>${escapeHTML(calcData.recognizedExpression)}</code></h3>
        <p><strong>Resultado Exato:</strong> <span class="text-base font-extrabold text-emerald-700 dark:text-emerald-300">${escapeHTML(calcData.finalResult)}</span></p>
        <p><strong>Análise do Seu Rascunho:</strong> ${escapeHTML(calcData.userAttemptEvaluation)}</p>
        <h3>🔍 Explicação Passo a Passo</h3>
        ${formatSimpleMarkdown(calcData.stepByStepExplanation)}
      `;
      state.lastAIFeedback = `${calcData.recognizedExpression} = ${calcData.finalResult}\n\n${calcData.stepByStepExplanation}`;
      feedbackBody.innerHTML = formatted;
    } else if (state.mode === 'redacao') {
      panelTitle.textContent = '✍️ Examinador Vunesp • Correção Detalhada e Pontos a Melhorar';
      const essay = GUIDED_ESSAYS[state.currentEssayIdx];
      const localCtx = buildLocalAIContext(essay.title, 6000);
      const prompt = `O aluno escreveu à mão com S Pen uma redação dissertativo-argumentativa (ou parágrafos) sobre o tema: "${essay.title}".
Faça uma correção extremamente didática e encorajadora no padrão da banca Vunesp contendo obrigatoriamente:
1. **Transcrição do que você escreveu** (para o aluno conferir a leitura da caligrafia);
2. **Nota Estimada (0 a 10)** dividida por Tema/Estrutura, Coesão e Norma-Padrão;
3. **O que você já mandou bem**;
4. **Pontos que você ainda precisa melhorar (Passo a Passo)** — apontando erros exatos de vírgula, crase, concordância, repetição de palavras ou argumentação e mostrando como reescrever cada frase melhorada.${localCtx}`;

      const reply = await callGeminiAPI([
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: base64Data } }
      ]);
      state.lastAIFeedback = reply;
      feedbackBody.innerHTML = formatSimpleMarkdown(reply);
    } else {
      panelTitle.textContent = '📖 Tutor TJSP • Análise das Suas Anotações S Pen';
      const list = getFilteredLessonsLocal();
      const lesson = list[state.currentLessonIdx] || list[0];
      const localCtx = buildLocalAIContext(`${lesson.title} ${lesson.disciplineLabel}`, 8000);
      const prompt = `O aluno está estudando a aula "${lesson.title}" (${lesson.disciplineLabel}) e fez anotações, esquemas ou contas à mão na lousa com a S Pen. Leia tudo o que ele escreveu, valide se está correto, complemente nos mínimos detalhes se faltou alguma exceção/pegadinha da Vunesp e conecte com a história da aula.${localCtx}`;

      const reply = await callGeminiAPI([
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: base64Data } }
      ]);
      state.lastAIFeedback = reply;
      feedbackBody.innerHTML = formatSimpleMarkdown(reply);
    }
  } catch (err) {
    feedbackBody.innerHTML = `
      <div class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 space-y-1">
        <p class="font-bold">Não foi possível processar com a IA Gemini.</p>
        <p class="text-xs">${escapeHTML(err.message || 'Erro de rede ou chave inválida.')}</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    label.textContent = originalLabel;
  }
}

export async function generateCustomStoryLesson(topicQuery, { onLessonCreated }) {
  if (!navigator.onLine) {
    showToast('Você está offline. Conecte-se à internet para gerar novas aulas com IA.');
    return;
  }

  const lessonSchema = {
    type: 'OBJECT',
    properties: {
      discipline: { type: 'STRING' },
      disciplineLabel: { type: 'STRING' },
      title: { type: 'STRING' },
      story: { type: 'STRING' },
      detailedExplanation: {
        type: 'ARRAY',
        items: { type: 'STRING' }
      },
      questionStatement: { type: 'STRING' },
      options: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            letter: { type: 'STRING' },
            text: { type: 'STRING' }
          },
          required: ['letter', 'text']
        }
      },
      correct: { type: 'STRING' },
      feedback: { type: 'STRING' }
    },
    required: ['discipline', 'disciplineLabel', 'title', 'story', 'detailedExplanation', 'questionStatement', 'options', 'correct', 'feedback']
  };

  const localCtx = buildLocalAIContext(topicQuery, 10000);
  const prompt = `Crie uma aula completa para o concurso de Escrevente TJSP 2027 sobre o tema pedido pelo aluno: "${topicQuery}".
Regras:
1. Em "story", crie uma história envolvente e memorável (estilo crônica cotidiana de cartório ou situação prática) que ensine toda a lógica e as regras do tema.
2. Em "detailedExplanation", liste 3 a 4 tópicos explicando a matéria NOS MÍNIMOS DETALHES, destacando pegadinhas e palavras-chave da banca Vunesp (pode usar <strong> para negrito).
3. Crie 1 questão estilo Vunesp com 4 alternativas (A, B, C, D) e o gabarito comentado.
4. No campo "discipline", use uma destas chaves: direito, portugues, matematica ou informatica.${localCtx}`;

  const jsonStr = await callGeminiAPI([{ text: prompt }], GEMINI_SYSTEM_PROMPT, lessonSchema);
  const data = JSON.parse(jsonStr);

  const validDisc = ['direito', 'portugues', 'matematica', 'informatica'].includes(data.discipline)
    ? data.discipline
    : 'direito';

  const newLesson = {
    id: 'story-ai-' + Date.now(),
    createdAt: Date.now(),
    isCustom: true,
    discipline: validDisc,
    disciplineLabel: data.disciplineLabel,
    paperSuggested: (validDisc === 'matematica' || validDisc === 'informatica') ? 'grid' : 'dotted',
    title: data.title,
    story: data.story,
    detailedExplanation: data.detailedExplanation,
    question: {
      statement: data.questionStatement,
      options: data.options,
      correct: data.correct,
      feedback: data.feedback
    }
  };

  state.lessons.unshift(newLesson);
  await saveCustomLessonToDB(newLesson);

  if (onLessonCreated) onLessonCreated(newLesson);
}

export function closeAIFeedback() {
  document.getElementById('ai-feedback-panel')?.classList.add('hidden');
}
