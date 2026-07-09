import { normalizeText, escapeHtml } from "./app.js";

const PARTES = [
  { id:1, label:"1ª Parte — Das Causas Primeiras",              min:1,   max:49  },
  { id:2, label:"2ª Parte — Do Mundo Espírita",                 min:50,  max:222 },
  { id:3, label:"3ª Parte — Das Leis Morais",                   min:223, max:629 },
  { id:4, label:"4ª Parte — Das Esperanças e das Consolações",  min:630, max:1019 },
];

function partePorNumero(n){
  return PARTES.find(p => n >= p.min && n <= p.max) || null;
}

function notaKey(num){ return "nota-le-" + num; }

function lerNota(num){ return localStorage.getItem(notaKey(num)) || ""; }

function salvarNota(num, texto){ localStorage.setItem(notaKey(num), texto); }

export function initLivro(){
  const items = window.LE_DATA || [];
  if(!items.length) return;

  // ── Tabs ──
  const tabLeitura = document.getElementById("tab-leitura");
  const tabBusca   = document.getElementById("tab-busca");
  const paneLeitura= document.getElementById("pane-leitura");
  const paneBusca  = document.getElementById("pane-busca");

  function setTab(which){
    tabLeitura.classList.toggle("on", which === "leitura");
    tabBusca.classList.toggle("on", which === "busca");
    paneLeitura.classList.toggle("on", which === "leitura");
    paneBusca.classList.toggle("on", which === "busca");
  }
  tabLeitura?.addEventListener("click", () => setTab("leitura"));
  tabBusca?.addEventListener("click",   () => setTab("busca"));

  // ── Reader ──
  const rParte = document.getElementById("r-parte");
  const rNum   = document.getElementById("r-num");
  const rQ     = document.getElementById("r-q");
  const rR     = document.getElementById("r-r");
  const lrPrev = document.getElementById("lr-prev");
  const lrNext = document.getElementById("lr-next");
  const lrNum  = document.getElementById("lr-num");
  const lrIr   = document.getElementById("lr-ir");
  const lrParte= document.getElementById("lr-parte");
  const lrNota = document.getElementById("lr-nota");
  const notaInline = document.getElementById("nota-inline");
  const notaTxt    = document.getElementById("nota-txt");
  const notaSalvar = document.getElementById("nota-salvar");
  const notaFechar = document.getElementById("nota-fechar");
  const notaSavedMsg = document.getElementById("nota-saved-msg");

  // Subset of items based on selected parte
  let subset = items.slice();
  let cursor = 0;

  function findIndexByNumero(n){
    return subset.findIndex(x => Number(x.numero) === Number(n));
  }

  function renderReader(){
    const item = subset[cursor];
    if(!item){ return; }
    const parte = partePorNumero(Number(item.numero));
    rParte.textContent = parte ? parte.label : "";
    rNum.textContent   = "Pergunta nº " + item.numero + " de " + items.length;
    rQ.textContent     = item.pergunta || "";
    rR.textContent     = item.resposta || "";
    lrPrev.disabled    = cursor === 0;
    lrNext.disabled    = cursor === subset.length - 1;
    // Update nota button style
    const nota = lerNota(item.numero);
    lrNota?.classList.toggle("has-nota", nota.length > 0);
    lrNota.textContent = nota ? "✏️ Ver nota" : "✏️ Anotar";
    // If inline editor is open, refresh content
    if(notaInline && notaInline.style.display !== "none"){
      notaTxt.value = nota;
    }
    // Sync url param
    const url = new URL(location.href);
    url.searchParams.set("n", item.numero);
    history.replaceState(null, "", url);
  }

  function goTo(index){
    if(index < 0 || index >= subset.length) return;
    cursor = index;
    renderReader();
    document.getElementById("reader-box")?.scrollIntoView({behavior:"smooth", block:"nearest"});
  }

  lrPrev?.addEventListener("click", () => goTo(cursor - 1));
  lrNext?.addEventListener("click", () => goTo(cursor + 1));

  lrIr?.addEventListener("click", () => {
    const n = parseInt(lrNum?.value, 10);
    if(isNaN(n)) return;
    const idx = findIndexByNumero(n);
    if(idx >= 0) goTo(idx);
  });
  lrNum?.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); lrIr.click(); } });

  lrParte?.addEventListener("change", () => {
    const v = lrParte.value;
    if(!v){
      subset = items.slice();
    } else {
      const p = PARTES.find(x => String(x.id) === v);
      subset = p ? items.filter(x => Number(x.numero) >= p.min && Number(x.numero) <= p.max) : items.slice();
    }
    cursor = 0;
    renderReader();
  });

  // Notes inline
  lrNota?.addEventListener("click", () => {
    const item = subset[cursor];
    if(!item) return;
    const isOpen = notaInline.style.display !== "none";
    if(isOpen){
      notaInline.style.display = "none";
    } else {
      notaTxt.value = lerNota(item.numero);
      notaInline.style.display = "block";
      notaTxt.focus();
      notaSavedMsg.style.display = "none";
    }
  });

  notaSalvar?.addEventListener("click", () => {
    const item = subset[cursor];
    if(!item) return;
    salvarNota(item.numero, notaTxt.value);
    notaSavedMsg.style.display = "block";
    setTimeout(() => { notaSavedMsg.style.display = "none"; }, 2000);
    lrNota?.classList.toggle("has-nota", notaTxt.value.trim().length > 0);
    lrNota.textContent = notaTxt.value.trim() ? "✏️ Ver nota" : "✏️ Anotar";
  });

  notaFechar?.addEventListener("click", () => {
    notaInline.style.display = "none";
  });

  // Keyboard navigation
  document.addEventListener("keydown", e => {
    if(paneLeitura && paneLeitura.classList.contains("on")){
      if(document.activeElement === notaTxt) return;
      if(e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); goTo(cursor - 1); }
      if(e.key === "ArrowRight" || e.key === "ArrowDown")  { e.preventDefault(); goTo(cursor + 1); }
    }
  });

  // ── Search ──
  const leNumero    = document.getElementById("le-numero");
  const leTexto     = document.getElementById("le-texto");
  const leBuscar    = document.getElementById("le-buscar");
  const leResultados= document.getElementById("le-resultados");
  const leCount     = document.getElementById("le-count");

  function highlightText(text, query){
    if(!query) return escapeHtml(text);
    const norm = normalizeText(query);
    const escaped = escapeHtml(text);
    if(!norm) return escaped;
    const normText = normalizeText(text);
    let result = ""; let i = 0;
    while(i < text.length){
      const pos = normText.indexOf(norm, i);
      if(pos === -1){ result += escapeHtml(text.slice(i)); break; }
      result += escapeHtml(text.slice(i, pos));
      result += "<mark class=\"hl\">" + escapeHtml(text.slice(pos, pos + norm.length)) + "</mark>";
      i = pos + norm.length;
    }
    return result;
  }

  function renderSearch(list, query){
    leResultados.innerHTML = "";
    leCount.textContent = list.length ? list.length + " resultado(s)" : "";
    if(!list.length){
      leResultados.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhum resultado encontrado.</div></div></div>';
      return;
    }
    for(const it of list.slice(0, 80)){
      const div = document.createElement("div");
      div.className = "item";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <div class="meta">
          <div class="title">Pergunta ${escapeHtml(String(it.numero))}</div>
          <div class="sub"><b>${highlightText(it.pergunta||"", query)}</b></div>
          ${it.resposta ? `<div class="sub" style="margin-top:4px">${highlightText(it.resposta.slice(0,200)||"", query)}${it.resposta.length>200?"…":""}</div>`:""}
        </div>
        <div style="flex-shrink:0">
          <button class="button" style="font-size:12px;white-space:nowrap">Ler</button>
        </div>`;
      div.addEventListener("click", () => {
        // Switch to reader, jump to this number
        setTab("leitura");
        const idx = items.findIndex(x => Number(x.numero) === Number(it.numero));
        if(idx >= 0){
          subset = items.slice();
          lrParte.value = "";
          cursor = idx;
          renderReader();
          document.getElementById("reader-box")?.scrollIntoView({behavior:"smooth"});
        }
      });
      leResultados.appendChild(div);
    }
    if(list.length > 80){
      const more = document.createElement("div");
      more.className = "small";
      more.style.textAlign = "center";
      more.style.padding = "8px";
      more.textContent = `Mostrando 80 de ${list.length}. Refine a busca para ver mais.`;
      leResultados.appendChild(more);
    }
  }

  function search(){
    const num = (leNumero?.value || "").trim();
    const txt = normalizeText((leTexto?.value || "").trim());
    if(num){
      const n = parseInt(num, 10);
      const res = items.filter(x => Number(x.numero) === n);
      return renderSearch(res, "");
    }
    if(txt){
      const res = items.filter(x => {
        const hay = normalizeText(`${x.pergunta||""} ${x.resposta||""}`);
        return hay.includes(txt);
      });
      return renderSearch(res, txt);
    }
    leResultados.innerHTML = '<div class="item"><div class="meta"><div class="sub">Digite um número (ex.: 77) ou palavra (ex.: Deus) e clique em Buscar.</div></div></div>';
    leCount.textContent = "";
  }

  leBuscar?.addEventListener("click", e => { e.preventDefault(); search(); });
  leTexto?.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); search(); } });
  leNumero?.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); search(); } });

  // ── Init ──
  const params = new URLSearchParams(location.search);
  const startN = parseInt(params.get("n"), 10);
  const startTab = params.get("tab");

  if(startTab === "busca"){
    setTab("busca");
    search();
  } else {
    if(startN && !isNaN(startN)){
      const idx = items.findIndex(x => Number(x.numero) === startN);
      cursor = idx >= 0 ? idx : 0;
    }
    renderReader();
  }

  // Default search placeholder
  leResultados.innerHTML = '<div class="item"><div class="meta"><div class="sub">Digite um número (ex.: 77) ou palavra (ex.: Deus) e clique em Buscar.</div></div></div>';
}
