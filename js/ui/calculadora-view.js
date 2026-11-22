export function renderCalculadoraGuideView() {
  const container = document.getElementById('left-content-scroll');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
        <h2 class="font-extrabold text-base text-emerald-950 dark:text-emerald-200">🧮 Calculadora Inteligente com S Pen</h2>
        <p class="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed">
          Escreva ou desenhe qualquer conta, equação, fração, raiz, porcentagem, regra de três ou fórmula do Excel na <strong>lousa quadriculada à direita</strong>.
        </p>
        <p class="text-xs text-emerald-800 dark:text-emerald-400">
          Ao tocar em <strong>"Calcular Fórmula / Conta Desenhada"</strong> (ou ativar o modo automático), eu leio sua caligrafia matemática, mostro a resposta exata no visor verde e explico cada passo!
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Exemplos do que você pode desenhar agora:</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-blue-800 dark:text-blue-300">Porcentagem Vunesp</div>
            <div class="font-mono mt-1 text-slate-700 dark:text-slate-300">36% de 675 = ?</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-blue-800 dark:text-blue-300">Teorema de Pitágoras</div>
            <div class="font-mono mt-1 text-slate-700 dark:text-slate-300">c² = 100² + 75²</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-blue-800 dark:text-blue-300">Equação / Sistema</div>
            <div class="font-mono mt-1 text-slate-700 dark:text-slate-300">2x + 15 = 53</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-blue-800 dark:text-blue-300">Regra de Três</div>
            <div class="font-mono mt-1 text-slate-700 dark:text-slate-300">36% — 243<br>64% — x</div>
          </div>
        </div>
      </div>

      <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
        <strong>💡 Dica para treinar contas:</strong> Se você já colocou o seu resultado na frente do sinal de igual (ex: <code>125 × 8 = 900</code>), eu verifico se você acertou ou se houve erro de tabuada/sinal!
      </div>
    </div>
  `;
}
