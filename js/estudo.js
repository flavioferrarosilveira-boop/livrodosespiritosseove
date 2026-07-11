const TOTAL = 1018;
const KEY_PLANO   = "estudo-le-plano";    // "7"|"30"|"60"|"365"
const KEY_INICIO  = "estudo-le-inicio";   // ISO date string YYYY-MM-DD
const KEY_LIDAS   = "estudo-le-lidas";    // JSON array of numero ints
const KEY_SESSAO  = "estudo-le-sessao";   // day index of last session

function today(){ return new Date().toISOString().slice(0,10); }

function daysBetween(a, b){
  const msA = new Date(a).getTime(), msB = new Date(b).getTime();
  return Math.floor((msB - msA) / 86400000);
}

function getLidas(){ try{ return JSON.parse(localStorage.getItem(KEY_LIDAS)||"[]"); } catch{ return []; } }
function saveLidas(arr){ localStorage.setItem(KEY_LIDAS, JSON.stringify(arr)); }
function toggleLida(num){
  const arr = getLidas();
  const idx = arr.indexOf(num);
  if(idx >= 0) arr.splice(idx,1); else arr.push(num);
  saveLidas(arr);
  return arr;
}

export function initEstudo(){
  const items = window.LE_DATA || [];
  if(!items.length) return;

  const btnIniciar  = document.getElementById("btn-iniciar");
  const btnResetar  = document.getElementById("btn-resetar");
  const btnExportar = document.getElementById("btn-exportar");
  const btnMarcarTodos = document.getElementById("btn-marcar-todos");
  const btnLerPrimeiro = document.getElementById("btn-ler-primeiro");
  const planoSelector  = document.getElementById("plano-selector");
  const sessaoHoje     = document.getElementById("sessao-hoje");
  const sessaoTitulo   = document.getElementById("sessao-titulo");
  const sessaoSub      = document.getElementById("sessao-sub");
  const sessaoLista    = document.getElementById("sessao-lista");
  const progFill    = document.getElementById("prog-fill");
  const progInfo    = document.getElementById("prog-info");
  const progLabelEsq = document.getElementById("prog-label-esq");
  const progLabelDir = document.getElementById("prog-label-dir");

  function sessaoPorDia(dias, plano){
    // Distribute 1018 questions over `plano` days; return array for `dias` index (0-based)
    const qPerDay = Math.ceil(TOTAL / plano);
    const start = dias * qPerDay;
    const end   = Math.min(start + qPerDay, TOTAL);
    return items.slice(start, end);
  }

  function atualizarProgresso(){
    const lidas = getLidas();
    const n = lidas.length;
    const pct = Math.min(100, Math.round(n / TOTAL * 100));
    progFill.style.width = pct + "%";
    progLabelEsq.textContent = n + " pergunta" + (n !== 1 ? "s" : "") + " lida" + (n !== 1 ? "s" : "");
    progLabelDir.textContent = TOTAL + " total";
    const plano = localStorage.getItem(KEY_PLANO);
    const inicio = localStorage.getItem(KEY_INICIO);
    if(plano && inicio){
      const diasDecorridos = Math.max(0, daysBetween(inicio, today()));
      progInfo.textContent = `Plano de ${plano} dias · Iniciado em ${inicio} · Dia ${diasDecorridos + 1}`;
    } else {
      progInfo.textContent = "";
    }
  }

  function renderSessao(){
    const plano  = localStorage.getItem(KEY_PLANO);
    const inicio = localStorage.getItem(KEY_INICIO);
    if(!plano || !inicio){ return; }

    const dias = Math.max(0, daysBetween(inicio, today()));
    const maxDia = parseInt(plano, 10) - 1;
    const diaIdx = Math.min(dias, maxDia);

    const sessaoItens = sessaoPorDia(diaIdx, parseInt(plano, 10));

    if(!sessaoItens.length){
      sessaoTitulo.textContent = "Plano concluído 🎉";
      sessaoSub.textContent = `Você completou a leitura em ${plano} dias. Parabéns!`;
      sessaoLista.innerHTML = "<div class=\"small\">Reinicie o plano para ler novamente.</div>";
      sessaoHoje.hidden = false;
      planoSelector.hidden = true;
      return;
    }

    sessaoHoje.hidden = false;
    planoSelector.hidden = true;

    sessaoTitulo.textContent = `Leitura de hoje — Dia ${diaIdx + 1} de ${plano}`;
    sessaoSub.textContent    = `${sessaoItens.length} pergunta${sessaoItens.length !== 1 ? "s" : ""} para hoje`;

    const lidas = getLidas();

    if(btnLerPrimeiro){
      const primeiro = sessaoItens.find(x => !lidas.includes(Number(x.numero)));
      btnLerPrimeiro.href = "livro.html?n=" + (primeiro ? primeiro.numero : sessaoItens[0].numero);
    }

    sessaoLista.innerHTML = "";
    for(const it of sessaoItens){
      const num  = Number(it.numero);
      const done = lidas.includes(num);
      const div  = document.createElement("div");
      div.className = "check-item" + (done ? " done" : "");
      div.innerHTML = `
        <input type="checkbox" ${done?"checked":""} data-num="${num}"/>
        <a class="q-text" href="livro.html?n=${num}" style="color:inherit;text-decoration:none">
          ${escHtml(it.pergunta || "")}
        </a>
        <span class="q-num">nº ${num}</span>`;
      div.querySelector("input")?.addEventListener("change", function(){
        const arr = toggleLida(num);
        div.classList.toggle("done", arr.includes(num));
        this.checked = arr.includes(num);
        atualizarProgresso();
      });
      sessaoLista.appendChild(div);
    }
  }

  function escHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function iniciar(){
    const sel = document.querySelector("input[name=plano]:checked");
    if(!sel){ alert("Selecione um plano primeiro."); return; }
    localStorage.setItem(KEY_PLANO, sel.value);
    localStorage.setItem(KEY_INICIO, today());
    atualizarProgresso();
    renderSessao();
  }

  function resetar(){
    if(!confirm("Reiniciar o plano apagará todo o progresso. Continuar?")) return;
    localStorage.removeItem(KEY_PLANO);
    localStorage.removeItem(KEY_INICIO);
    localStorage.removeItem(KEY_LIDAS);
    planoSelector.hidden = false;
    sessaoHoje.hidden = true;
    atualizarProgresso();
  }

  function exportar(){
    const lidas = getLidas();
    const plano = localStorage.getItem(KEY_PLANO) || "—";
    const inicio = localStorage.getItem(KEY_INICIO) || "—";
    let txt = `Livro dos Espíritos — Progresso de leitura\nPlano: ${plano} dias | Iniciado: ${inicio}\nLidas: ${lidas.length} de ${TOTAL}\n\nPerguntas lidas:\n`;
    for(const num of lidas.sort((a,b)=>a-b)){
      const it = items.find(x => Number(x.numero) === num);
      txt += `\n[${num}] ${it ? it.pergunta : "?"}`;
    }
    const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meu-estudo-livro-dos-espiritos.txt";
    a.click();
  }

  btnIniciar?.addEventListener("click", iniciar);
  btnResetar?.addEventListener("click", resetar);
  btnExportar?.addEventListener("click", exportar);
  btnMarcarTodos?.addEventListener("click", () => {
    const plano = localStorage.getItem(KEY_PLANO);
    const inicio = localStorage.getItem(KEY_INICIO);
    if(!plano || !inicio) return;
    const dias = Math.max(0, daysBetween(inicio, today()));
    const sessaoItens = sessaoPorDia(Math.min(dias, parseInt(plano,10)-1), parseInt(plano,10));
    const arr = getLidas();
    for(const it of sessaoItens){
      const num = Number(it.numero);
      if(!arr.includes(num)) arr.push(num);
    }
    saveLidas(arr);
    atualizarProgresso();
    renderSessao();
  });

  // Highlight selected plan option
  document.querySelectorAll("input[name=plano]").forEach(r => {
    r.addEventListener("change", () => {
      document.querySelectorAll(".plan-option").forEach(el => el.classList.remove("selected"));
      r.closest(".plan-option")?.classList.add("selected");
    });
  });

  // Init
  const planoAtivo = localStorage.getItem(KEY_PLANO);
  atualizarProgresso();
  if(planoAtivo){
    renderSessao();
  } else {
    planoSelector.hidden = false;
    sessaoHoje.hidden = true;
  }
}
