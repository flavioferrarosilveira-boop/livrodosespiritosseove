import { normalizeText, escapeHtml } from "./app.js";

const KEY_PREFIX = "nota-le-";

function notaKey(num){ return KEY_PREFIX + num; }
function lerNota(num){ return localStorage.getItem(notaKey(num)) || ""; }
function salvarNota(num, txt){ localStorage.setItem(notaKey(num), txt); }
function apagarNota(num){ localStorage.removeItem(notaKey(num)); }

function todasNotas(){
  const out = {};
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith(KEY_PREFIX)){
      const num = parseInt(k.slice(KEY_PREFIX.length), 10);
      if(!isNaN(num)) out[num] = localStorage.getItem(k);
    }
  }
  return out;
}

export function initNotas(){
  const items = window.LE_DATA || [];
  if(!items.length) return;

  const ntBusca     = document.getElementById("nt-busca");
  const ntSoNotas   = document.getElementById("nt-so-notas");
  const ntLista     = document.getElementById("nt-lista");
  const ntEditor    = document.getElementById("nt-editor");
  const ntEditorVazio = document.getElementById("nt-editor-vazio");
  const ntNumLabel  = document.getElementById("nt-num-label");
  const ntQLabel    = document.getElementById("nt-q-label");
  const ntTextarea  = document.getElementById("nt-textarea");
  const ntSalvar    = document.getElementById("nt-salvar");
  const ntApagar    = document.getElementById("nt-apagar");
  const ntLerLink   = document.getElementById("nt-ler-link");
  const ntSavedMsg  = document.getElementById("nt-saved-msg");
  const ntExportar  = document.getElementById("nt-exportar");
  const ntTotalNotas= document.getElementById("nt-total-notas");

  let selectedNum = null;
  let savedTimer  = null;

  function escHtml(s){ return escapeHtml(s); }

  function renderLista(){
    const query   = normalizeText(ntBusca?.value || "");
    const soNotas = ntSoNotas?.checked;
    const notas   = todasNotas();

    const totalNotas = Object.keys(notas).filter(k => notas[k]?.trim()).length;
    if(ntTotalNotas) ntTotalNotas.textContent = totalNotas + " anotação" + (totalNotas !== 1 ? "ões" : "") + " salva" + (totalNotas !== 1 ? "s" : "");

    ntLista.innerHTML = "";

    let visible = 0;
    for(const it of items){
      const num  = Number(it.numero);
      const nota = notas[num] || "";

      if(soNotas && !nota.trim()) continue;

      if(query){
        const hay = normalizeText(`${it.pergunta||""} ${nota}`);
        if(!hay.includes(query)) continue;
      }

      visible++;
      if(visible > 200) break;

      const div = document.createElement("div");
      div.className = "nota-item" + (num === selectedNum ? " active" : "");
      div.dataset.num = num;

      const preview = nota.trim().slice(0, 80);
      div.innerHTML = `
        <div class="nota-num">Pergunta nº ${num}${nota.trim() ? '<span class="nota-badge">nota</span>' : ""}</div>
        <div class="nota-q">${escHtml(it.pergunta || "")}</div>
        ${preview ? `<div class="nota-preview">${escHtml(preview)}${nota.trim().length > 80 ? "…" : ""}</div>` : ""}`;

      div.addEventListener("click", () => selectQuestion(num));
      ntLista.appendChild(div);
    }

    if(visible === 0){
      ntLista.innerHTML = '<div class="small" style="padding:8px;color:var(--muted)">Nenhuma pergunta encontrada.</div>';
    }
  }

  function selectQuestion(num){
    selectedNum = num;
    const it = items.find(x => Number(x.numero) === num);
    if(!it) return;

    // Update list
    ntLista.querySelectorAll(".nota-item").forEach(el => {
      el.classList.toggle("active", Number(el.dataset.num) === num);
    });

    // Open editor
    ntEditorVazio.style.display = "none";
    ntEditor.style.display      = "flex";
    ntNumLabel.textContent      = "Pergunta nº " + num;
    ntQLabel.textContent        = it.pergunta || "";
    ntTextarea.value            = lerNota(num);
    if(ntLerLink) ntLerLink.href = "livro.html?n=" + num;
    if(ntSavedMsg) ntSavedMsg.style.display = "none";
    ntTextarea.focus();

    // Check URL param to auto-open
    const url = new URL(location.href);
    url.searchParams.set("n", num);
    history.replaceState(null, "", url);
  }

  function salvar(){
    if(selectedNum === null) return;
    salvarNota(selectedNum, ntTextarea.value);
    if(ntSavedMsg){
      ntSavedMsg.style.display = "inline";
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => { ntSavedMsg.style.display = "none"; }, 2000);
    }
    renderLista();
  }

  function apagar(){
    if(selectedNum === null) return;
    if(!confirm("Apagar esta nota?")) return;
    apagarNota(selectedNum);
    ntTextarea.value = "";
    renderLista();
  }

  function exportar(){
    const notas = todasNotas();
    let txt = "Livro dos Espíritos — Minhas Notas\n" + "=".repeat(40) + "\n\n";
    const nums = Object.keys(notas).map(Number).filter(n => notas[n]?.trim()).sort((a,b)=>a-b);
    if(!nums.length){ alert("Nenhuma nota para exportar."); return; }
    for(const num of nums){
      const it = items.find(x => Number(x.numero) === num);
      txt += `\n[Pergunta ${num}]\n${it ? it.pergunta : "?"}\n\nMinha nota:\n${notas[num]}\n` + "-".repeat(40);
    }
    const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "notas-livro-dos-espiritos.txt";
    a.click();
  }

  // Auto-save on typing (debounced)
  let autoSaveTimer = null;
  ntTextarea?.addEventListener("input", () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      if(selectedNum !== null){
        salvarNota(selectedNum, ntTextarea.value);
        renderLista();
      }
    }, 800);
  });

  ntSalvar?.addEventListener("click", salvar);
  ntApagar?.addEventListener("click", apagar);
  ntExportar?.addEventListener("click", exportar);
  ntBusca?.addEventListener("input", renderLista);
  ntSoNotas?.addEventListener("change", renderLista);

  // Auto-open from URL param
  const params = new URLSearchParams(location.search);
  const startN = parseInt(params.get("n"), 10);

  renderLista();

  if(startN && !isNaN(startN)){
    selectQuestion(startN);
    // Scroll item into view
    setTimeout(() => {
      ntLista.querySelector(`[data-num="${startN}"]`)?.scrollIntoView({block:"center"});
    }, 100);
  }
}
