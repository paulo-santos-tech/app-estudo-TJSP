/**
 * Aulas baseadas em histórias + explicação nos mínimos detalhes (TJSP 2027)
 */
export const DEFAULT_STORY_LESSONS = [
  {
    id: 'story-nscgj-prazos',
    discipline: 'direito',
    disciplineLabel: 'Normas da Corregedoria • Prazos e Regras de Cartório',
    paperSuggested: 'dotted',
    title: 'O Primeiro Plantão de Lucas no Cartório da 2ª Vara',
    story: 'Era segunda-feira, 9h da manhã, e Lucas acabava de assumir sua mesa como Escrevente Técnico Judiciário. Logo na primeira hora, três situações aconteceram ao mesmo tempo: (1) Um advogado entregou um pedido urgente que precisava da decisão do juiz; (2) O juiz assinou um despacho mandando intimar uma testemunha; e (3) Um estagiário pegou um lápis para escrever um recadinho na margem da folha do processo dizendo "verificar endereço depois". Lucas lembrou das Normas da Corregedoria e interveio na hora: levou o pedido ao juiz no dia seguinte (1 dia), cumpriu a intimação em 4 dias (dentro do limite de 5 dias) e tirou o lápis da mão do estagiário avisando que qualquer anotação a lápis ou espaço em branco assinado é estritamente VEDADO!',
    detailedExplanation: [
      '<strong>1. O Relógio do Escrevente (1 dia vs. 5 dias):</strong> Sempre que um processo precisa ir para a mesa do juiz decidir, você tem apenas <strong>1 dia</strong> para fazer a conclusão. Depois que o juiz decide e devolve para o cartório, você tem <strong>5 dias</strong> para executar o ato (expedir carta, mandado ou intimação).',
      '<strong>2. A Regra da Pasta Sagrada (Palavra-Bomba VEDADO):</strong> Nunca se pode lançar cotas marginais (recados na beirada da folha), sublinhar frases do processo ou assinar termos em branco — <strong>nem mesmo a lápis</strong>. Na prova, a Vunesp troca a palavra <em>"vedado"</em> por <em>"deve ser evitado"</em> para te enganar.',
      '<strong>3. Senha de Terceiros e Correições:</strong> Se alguém de fora autorizado pedir senha para consultar autos digitais, ela vale por <strong>48 horas</strong>. E a Correição Ordinária do juiz acontece uma vez por ano, preferencialmente em <strong>dezembro</strong>.'
    ],
    question: {
      statement: 'Com base na história de Lucas e nas Normas da Corregedoria Geral da Justiça do TJSP, assinale a alternativa CORRETA:',
      options: [
        { letter: 'A', text: 'O escrevente tem 5 dias para concluir os autos ao juiz e 1 dia para executar os atos processuais.' },
        { letter: 'B', text: 'Deve ser apenas evitada a assinatura de atos em branco ou anotações a lápis nas margens dos autos.' },
        { letter: 'C', text: 'Os autos devem ser conclusos ao juiz em 1 dia e os atos executados em 5 dias, sendo expressamente vedado lançar cotas marginais, ainda que a lápis.' },
        { letter: 'D', text: 'A Correição Ordinária anual ocorre preferencialmente no mês de janeiro.' }
      ],
      correct: 'C',
      feedback: 'Perfeito! Você gravou a história de Lucas: 1 dia para o juiz, 5 dias para o escrevente, e tudo a lápis ou em branco é VEDADO (proibido).'
    }
  },
  {
    id: 'story-eproc-teletrabalho',
    discipline: 'direito',
    disciplineLabel: 'Legislação Interna 2025 • eproc e Teletrabalho',
    paperSuggested: 'dotted',
    title: 'A Mudança de Casa Digital e o Home Office de Mariana',
    story: 'Em 2025, o Fórum onde Mariana trabalha inaugurou o novo sistema <strong>eproc</strong> para substituir o antigo e-SAJ. Um advogado entrou desesperado no balcão perguntando se teria que digitalizar e transferir seus 50 processos antigos do e-SAJ para o eproc. Mariana explicou com calma: "Doutor, funciona como uma mudança de casa — os processos que já nasceram na casa antiga (e-SAJ) ficam lá até o encerramento, inclusive os recursos e incidentes deles! Só os processos novos entram direto no eproc". Na mesma tarde, Mariana, que ainda estava no 2º ano de estágio probatório, foi autorizada a entrar no teletrabalho: ela continuou recebendo seu vale-alimentação integral, deixou de receber vale-transporte nos dias em que ficou em casa e usou seu próprio computador, pois o Tribunal não paga auxílio tecnológico.',
    detailedExplanation: [
      '<strong>1. Resolução nº 963/2025 (eproc — Regra da Casa Antiga):</strong> Processos ajuizados antes da implantação do eproc, bem como seus recursos, incidentes e processos dependentes/conexos, <strong>continuam tramitando no sistema legado (e-SAJ)</strong> até o encerramento, salvo migração oficial. Não existe prazo de 60 dias para o advogado escolher o sistema.',
      '<strong>2. Resolução nº 850/2021 (Teletrabalho — O Pacote dos 4 Pontos):</strong> (a) Estágio probatório <strong>PODE</strong> participar; (b) <strong>PERDE</strong> auxílio-transporte nos dias remotos; (c) <strong>MANTÉM</strong> auxílio-alimentação; (d) <strong>NÃO</strong> há auxílio tecnológico.'
    ],
    question: {
      statement: 'Segundo as Resoluções nº 963/2025 (eproc) e nº 850/2021 (Teletrabalho) do TJSP, aplicadas na história de Mariana, é correto afirmar que:',
      options: [
        { letter: 'A', text: 'Servidores em estágio probatório não podem fazer teletrabalho, mas quem faz recebe auxílio tecnológico.' },
        { letter: 'B', text: 'Os processos anteriores ao eproc e seus recursos continuam no sistema legado até o fim, e o servidor em teletrabalho mantém o auxílio-alimentação mas perde o auxílio-transporte nos dias remotos.' },
        { letter: 'C', text: 'Os advogados têm 60 dias para escolher se protocolam ações novas no e-SAJ ou no eproc.' },
        { letter: 'D', text: 'Ao entrar em teletrabalho, o servidor perde tanto o auxílio-transporte quanto o auxílio-alimentação.' }
      ],
      correct: 'B',
      feedback: 'Exato! A regra da Casa Antiga (e-SAJ) e os 4 pontos do Teletrabalho de Mariana estão gravados na sua memória.'
    }
  },
  {
    id: 'story-portugues-ima',
    discipline: 'portugues',
    disciplineLabel: 'Língua Portuguesa • Colocação Pronominal e Crase',
    paperSuggested: 'ruled',
    title: 'O Segredo do Ímã Gigante e da Troca pelo Masculino',
    story: 'Imagine que as palavrinhas curtas da língua portuguesa (<strong>me, te, se, o, a, lhe</strong>) são pequenos clipes de metal soltos na mesa. Na entrada da frase existe uma placa de "Boa Educação": você <strong>nunca</strong> pode abrir a porta com um clipe na frente (proibido dizer <em>"Me empresta"</em> ou <em>"Se ensina"</em> no início da frase). Porém, se aparecer uma palavra negativa como <strong>NÃO</strong>, <strong>NUNCA</strong> ou um <strong>QUE</strong> antes do verbo, essa palavra liga um <strong>Ímã Gigante</strong> que puxa o clipe para antes do verbo (<em>"Ele <strong>não me</strong> emprestou"</em>). Já quando a dúvida for sobre colocar o chapéu da crase (<strong>à</strong>), o detetive usa o disfarce masculino: se trocar a palavra feminina por uma masculina e aparecer <strong>"ao"</strong>, a crase é obrigatória!',
    detailedExplanation: [
      '<strong>1. Regra da Educação (Início de Frase):</strong> Nunca comece uma frase ou oração após vírgula com pronome oblíquo (<em>me, te, se, o, a, nos</em>). Diga <em>"Ensina-se"</em> e nunca <em>"Se ensina"</em>.',
      '<strong>2. O Ímã da Próclise:</strong> Palavras negativas (<em>não, nunca, ninguém</em>), pronomes relativos (<em>que, cujo</em>) e advérbios sem vírgula (<em>já, sempre</em>) puxam o pronome para antes do verbo: <em>"...caso o garoto <strong>não a ajudasse</strong>"</em>.',
      '<strong>3. Teste infalível da Crase:</strong> Troque o substantivo feminino por um masculino. Ex.: <em>"Prejudicial à saúde"</em> → <em>"Prejudicial <strong>ao</strong> coração"</em> (virou <strong>ao</strong> = tem crase!). Se antes vier <em>qualquer, quem, todos</em> ou singular antes de plural (<em>a pessoas</em>), crase é proibida.'
    ],
    question: {
      statement: 'Aplicando a história do "Ímã Gigante" e do "Disfarce Masculino", assinale a alternativa escrita rigorosamente na norma-padrão da Vunesp:',
      options: [
        { letter: 'A', text: 'Se lembra a todos que a medida é prejudicial à qualquer pessoa desatenta.' },
        { letter: 'B', text: 'A juíza afirmou ao escrevente que poderia elogiá-lo, caso ele não se atrasasse na entrega.' },
        { letter: 'C', text: 'Tendo referido-me ao processo, entreguei a pasta à você ontem.' },
        { letter: 'D', text: 'O advogado não entregou-me a petição referente à pessoas interessadas.' }
      ],
      correct: 'B',
      feedback: 'Sensacional! Em B, o ímã "não" puxou o "se" para antes do verbo ("não se atrasasse"), e "ao escrevente" está perfeito.'
    }
  },
  {
    id: 'story-mat-pitagoras-sofi',
    discipline: 'matematica',
    disciplineLabel: 'Matemática • Triângulo 3-4-5 e Proporção',
    paperSuggested: 'grid',
    title: 'A Escada do Engenheiro na Torre ATTO',
    story: 'Um engenheiro precisava prender um cabo de aço do topo de uma torre de observação de <strong>100 metros</strong> de altura até um pino fincado no chão a <strong>75 metros</strong> da base da torre. Sem calculadora na mão, ele olhou para os números 75 e 100 e sorriu: "Esses dois números são velhos conhecidos da família <strong>3, 4 e 5</strong>!". Ele dividiu os dois por 25 e descobriu que 75 era <strong>3 × 25</strong> e 100 era <strong>4 × 25</strong>. Como todo triângulo retângulo com lados 3 e 4 tem diagonal 5, o cabo só podia medir <strong>5 × 25 = 125 metros</strong>! Enquanto isso, no escritório, Sofia digitalizava processos: nos primeiros 9 dias, ela fez 27 por dia (243 processos), o que representava <strong>36%</strong> do lote. Ela descobriu quanto valia 1% dividindo 243 ÷ 36 = 6,75 e multiplicou pelos <strong>64%</strong> que faltavam (432 processos) para dividir pelos 24 dias restantes (18 por dia).',
    detailedExplanation: [
      '<strong>1. O Triângulo Mágico 3, 4 e 5 da Vunesp:</strong> Sempre que um problema formar um ângulo reto (torre, escada na parede, terreno retangular), teste dividir os dois lados menores pelo mesmo número. Se der <strong>3</strong> e <strong>4</strong>, o maior lado será automaticamente <strong>5</strong> multiplicado por esse mesmo número!',
      '<strong>2. Método do "1%" na Regra de Três:</strong> Se uma parte equivale a 36% (ex: 243 processos), divida 243 por 36 para achar quanto vale 1% (6,75). Depois multiplique pelo percentual que <strong>falta</strong> (100% - 36% = 64%).',
      '<strong>3. Atenção ao "Restante":</strong> A Vunesp sempre pergunta quantos dias ou caixas <strong>ainda cabem/faltam</strong>, e nunca o que já foi ocupado.'
    ],
    question: {
      statement: 'Um terreno retangular tem 60 m de largura e 80 m de comprimento. Se o escrevente atravessar esse terreno caminhando em linha reta pela diagonal de um canto ao outro, quantos metros ele vai percorrer?',
      options: [
        { letter: 'A', text: '90 m' },
        { letter: 'B', text: '100 m' },
        { letter: 'C', text: '120 m' },
        { letter: 'D', text: '140 m' }
      ],
      correct: 'B',
      feedback: 'Na mosca! 60 = 3 × 20; 80 = 4 × 20; logo a diagonal é 5 × 20 = 100 metros!'
    }
  },
  {
    id: 'story-excel-procv',
    discipline: 'informatica',
    disciplineLabel: 'Informática • MS-Excel 365 (PROCV e MAIOR/MENOR)',
    paperSuggested: 'grid',
    title: 'O Balcão de Atendimento do PROCV e o Pódio de Medalhas',
    story: 'Imagine que o <strong>PROCV</strong> é um atendente de balcão muito obediente que sempre recebe 3 ordens na sequência: <em>(1) "Olhe este número de senha na minha mão"</em>; <em>(2) "Procure esse número na primeira coluna daquela tabela na parede"</em>; e <em>(3) "Me traga o que está escrito na 2ª coluna da mesma linha"</em>. Para a tabela na parede não escorregar quando você arrasta a fórmula para baixo, você prega dois pregos chamados <strong>cifrão ($)</strong> antes dos números das linhas: <code>A$2:B$4</code>. Já as funções <strong>MAIOR</strong> e <strong>MENOR</strong> funcionam como um pódio olímpico: se dois atletas empatarem com a nota 5, os dois sobem no pódio ocupando o 1º e o 2º lugar!',
    detailedExplanation: [
      '<strong>1. Anatomia do PROCV:</strong> <code>=PROCV(valor_procurado ; matriz_tabela ; num_coluna)</code>. O valor procurado vem <strong>primeiro</strong>, a tabela vem no <strong>meio</strong> com <code>$</code> antes das linhas (ex: <code>A$2:B$4</code>) e o número da coluna vem no <strong>final</strong>.',
      '<strong>2. Empates no MAIOR e MENOR:</strong> Em uma lista <code>2, 4, 5, 3, 5, 5</code>, o 1º maior é 5, o 2º maior também é 5 e o 3º maior também é 5. Cada repetição ocupa uma posição!'
    ],
    question: {
      statement: 'Na planilha do TJSP 2025, a célula C7 tem o código 2 e a tabela de referência está em A2:B4 (código na col. 1, descrição na col. 2). Para arrastar a fórmula de D7 até D9 sem mover as linhas da tabela, qual fórmula usar em D7?',
      options: [
        { letter: 'A', text: '=PROCV(A$2:B$4;C7;2)' },
        { letter: 'B', text: '=PROCV(C7;A$2:B$4;2)' },
        { letter: 'C', text: '=PROCV($A2:$B4;C7;2)' },
        { letter: 'D', text: '=PROCV(C7;A2:B4;1)' }
      ],
      correct: 'B',
      feedback: 'Perfeito! Primeiro o que procura (C7), depois a tabela travada nas linhas (A$2:B$4), depois a coluna de resposta (2).'
    }
  }
];
