/**
 * Oficina Guiada de Redação (Anti-Bloqueio de Ideias + Corretor Vunesp)
 */
export const GUIDED_ESSAYS = [
  {
    title: 'Os desafios do envelhecimento populacional e da longevidade no Brasil contemporâneo',
    context: 'Dados do IBGE mostram que o número de brasileiros com 60 anos ou mais cresce rapidamente, mas o país ainda carece de hospitais preparados, acessibilidade nas ruas e respeito ao idoso no mercado de trabalho.',
    cause1Options: [
      'a omissão do Estado na oferta de saúde geriátrica e acessibilidade urbana',
      'a falta de políticas públicas voltadas ao amparo previdenciário e médico dos idosos',
      'a precariedade na infraestrutura das cidades para garantir mobilidade à terceira idade'
    ],
    cause2Options: [
      'o preconceito etário (etarismo) que exclui os mais velhos do mercado de trabalho',
      'a falta de conscientização social e o abandono familiar enfrentado por muitos idosos',
      'a cultura que desvaloriza a experiência e a autonomia da pessoa idosa'
    ],
    repertoire: 'A Constituição Federal de 1988 (art. 230) determina que a família, a sociedade e o Estado têm o dever de amparar as pessoas idosas, assegurando sua participação na comunidade e defendendo sua dignidade.',
    skeleton: (c1, c2) => `1º PARÁGRAFO (Introdução - ~5 linhas):
"No Brasil contemporâneo, o rápido envelhecimento da população tornou-se um desafio urgente. Nesse cenário, observa-se que a plena dignidade da pessoa idosa ainda é dificultada tanto por ${c1} quanto por ${c2}."

2º PARÁGRAFO (Desenvolvimento 1 - ~7 linhas):
"Em primeiro plano, cabe destacar que ${c1} agrava diretamente esse problema. Embora a Constituição Federal (art. 230) assegure proteção integral ao idoso, verifica-se na prática que a carência de investimentos públicos compromete a qualidade de vida dessa parcela da população."

3º PARÁGRAFO (Desenvolvimento 2 - ~7 linhas):
"Ademais, soma-se a esse quadro ${c2}. Isso ocorre porque muitos cidadãos ainda enxergam o envelhecimento apenas como perda de produtividade, gerando exclusão social e sobrecarga emocional."

4º PARÁGRAFO (Conclusão - ~5 linhas):
"Portanto, torna-se imprescindível enfrentar os desafios da longevidade no país. Para isso, o Poder Público deve ampliar os serviços de saúde e acessibilidade, aliado a campanhas educativas que valorizem o idoso na sociedade."`
  },
  {
    title: 'O impacto da desinformação e das notícias falsas (fake news) na democracia e na sociedade',
    context: 'Com o avanço das redes sociais, informações falsas se espalham em segundos, prejudicando a saúde pública, enganando cidadãos e ameaçando a confiança nas instituições democráticas.',
    cause1Options: [
      'a ausência de regulamentação eficaz e fiscalização sobre as plataformas digitais',
      'a velocidade dos algoritmos que priorizam conteúdos sensacionalistas em vez da verdade',
      'a fragilidade no combate jurídico aos criadores de campanhas de desinformação'
    ],
    cause2Options: [
      'a falta de educação midiática para que o cidadão cheque a fonte antes de compartilhar',
      'o hábito social de repassar mensagens alarmistas sem verificar sua veracidade',
      'a vulnerabilidade da população diante de notícias manipuladas emocionalmente'
    ],
    repertoire: 'A Constituição Federal garante a liberdade de expressão (art. 5º, IV), mas veda o anonimato e assegura o direito à informação verdadeira e à proteção da honra.',
    skeleton: (c1, c2) => `1º PARÁGRAFO (Introdução - ~5 linhas):
"Na era digital contemporânea, a disseminação de notícias falsas consolidou-se como um grave entrave social. Esse fenômeno persiste tanto por ${c1} quanto por ${c2}."

2º PARÁGRAFO (Desenvolvimento 1 - ~7 linhas):
"Em primeiro plano, é evidente que ${c1} impulsiona a circulação de mentiras. Embora a Constituição assegure a liberdade de expressão, esse direito não autoriza o ataque à verdade nem o prejuízo à coletividade."

3º PARÁGRAFO (Desenvolvimento 2 - ~7 linhas):
"Além disso, ${c2} também alimenta esse ciclo prejudicial. Quando o usuário compartilha boatos sem checar fontes confiáveis, torna-se agente involuntário da desinformação."

4º PARÁGRAFO (Conclusão - ~5 linhas):
"Portanto, combater as notícias falsas exige ação conjunta. Cabe ao Poder Público aprimorar a responsabilização digital e promover a educação midiática nas escolas para fortalecer a cidadania."`
  }
];
