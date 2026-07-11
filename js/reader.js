/* ══════════════════════════════════════════
   Livro dos Espíritos — Reader
══════════════════════════════════════════ */

const DATA = window.LE_DATA || [];
const EV   = window.EV_DATA || [];

/* ── Índice estrutural ── */
const INDICE = [
  { parte: 1, romano: "I",   titulo: "Das Causas Primeiras",              min: 1,   max: 49,
    caps: [
      { num: "Cap. I",    titulo: "De Deus",                            min: 1,   max: 14  },
      { num: "Cap. II",   titulo: "Dos elementos gerais do Universo",   min: 15,  max: 33  },
      { num: "Cap. III",  titulo: "Da criação",                         min: 34,  max: 49  },
    ]},
  { parte: 2, romano: "II",  titulo: "Do Mundo Espírita",                 min: 50,  max: 222,
    caps: [
      { num: "Cap. I",    titulo: "Dos Espíritos",                      min: 50,  max: 83  },
      { num: "Cap. II",   titulo: "Da encarnação dos Espíritos",        min: 84,  max: 100 },
      { num: "Cap. III",  titulo: "Da volta à vida corpórea",           min: 101, max: 165 },
      { num: "Cap. IV",   titulo: "Da pluralidade das existências",     min: 166, max: 222 },
    ]},
  { parte: 3, romano: "III", titulo: "Das Leis Morais",                   min: 223, max: 629,
    caps: [
      { num: "Cap. I",    titulo: "Da lei divina ou natural",           min: 223, max: 249 },
      { num: "Cap. II",   titulo: "Da lei de adoração",                 min: 250, max: 272 },
      { num: "Cap. III",  titulo: "Da lei do trabalho",                 min: 273, max: 286 },
      { num: "Cap. IV",   titulo: "Da lei de reprodução",               min: 287, max: 306 },
      { num: "Cap. V",    titulo: "Da lei de conservação",              min: 307, max: 343 },
      { num: "Cap. VI",   titulo: "Da lei de destruição",               min: 344, max: 371 },
      { num: "Cap. VII",  titulo: "Da lei de sociedade",                min: 372, max: 421 },
      { num: "Cap. VIII", titulo: "Da lei do progresso",                min: 422, max: 469 },
      { num: "Cap. IX",   titulo: "Da lei de igualdade",                min: 470, max: 503 },
      { num: "Cap. X",    titulo: "Da lei de liberdade",                min: 504, max: 549 },
      { num: "Cap. XI",   titulo: "Da lei de justiça, amor e caridade", min: 550, max: 629 },
    ]},
  { parte: 4, romano: "IV",  titulo: "Das Esperanças e das Consolações",  min: 630, max: 1019,
    caps: [
      { num: "Cap. I",    titulo: "Das penas e gozos terrenos",         min: 630, max: 718  },
      { num: "Cap. II",   titulo: "Das penas e gozos futuros",          min: 719, max: 875  },
      { num: "Cap. III",  titulo: "Das esperanças e das consolações",   min: 876, max: 1019 },
    ]},
];

/* ── Helpers ── */
function esc(s){ return String(s||"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim(); }
function dayOfYear(d){ const s=new Date(d.getFullYear(),0,0); return Math.floor((d-s)/86400000); }

function highlight(text, q){
  if(!q) return esc(text);
  const nt = norm(text), nq = norm(q);
  if(!nq) return esc(text);
  let res="", i=0;
  while(i<text.length){
    const pos = nt.indexOf(nq, i);
    if(pos===-1){ res+=esc(text.slice(i)); break; }
    res += esc(text.slice(i,pos)) + '<mark class="hl">' + esc(text.slice(pos,pos+nq.length)) + "</mark>";
    i = pos + nq.length;
  }
  return res;
}

/* ── Build sidebar nav ── */
function buildNav(){
  const nav = document.getElementById("sb-nav");
  if(!nav) return;
  let html = "";
  for(const p of INDICE){
    html += `<div class="sb-parte">Parte ${p.romano}</div>`;
    html += `<a class="sb-parte-link" href="#parte-${p.parte}">${esc(p.titulo)}</a>`;
    for(const c of p.caps){
      html += `<a class="sb-cap-link" href="#cap-${p.parte}-${c.min}">${esc(c.num)} — ${esc(c.titulo)}</a>`;
    }
    html += `<div class="sb-sep"></div>`;
  }
  nav.innerHTML = html;
}

/* ── Build book content ── */
function buildBook(){
  const book = document.getElementById("book");
  if(!book || !DATA.length) return;

  const byNum = {};
  DATA.forEach(q => { byNum[Number(q.numero)] = q; });

  let html = "";
  for(const p of INDICE){
    html += `<section class="book-parte" id="parte-${p.parte}">`;
    html += `<header class="parte-header">
      <div class="parte-label">Parte ${p.romano}</div>
      <h2 class="parte-titulo">${esc(p.titulo)}</h2>
      <div class="parte-range">Perguntas ${p.min}–${p.max}</div>
    </header>`;

    for(const c of p.caps){
      html += `<div class="book-cap" id="cap-${p.parte}-${c.min}">`;
      html += `<div class="cap-titulo">${esc(c.num)} — ${esc(c.titulo)}</div>`;

      // Collect questions in this chapter range
      for(let n = c.min; n <= c.max; n++){
        const q = byNum[n];
        if(!q) continue;
        const nota = lerNota(n);
        html += `<div class="q-item" id="q-${n}" data-n="${n}" data-p="${esc(q.pergunta||"")}" data-r="${esc(q.resposta||"")}">
          <div class="q-n">${n}</div>
          <div class="q-body">
            <div class="q-p">${esc(q.pergunta||"")}</div>
            <div class="q-r">${esc(q.resposta||"")}</div>
            <button class="q-nota-btn${nota?" has":""}" onclick="abrirNota(${n})" title="Anotar">${nota?"✏️ Ver nota":"✏️ Anotar"}</button>
          </div>
        </div>`;
      }
      html += `</div>`; // .book-cap
    }
    html += `</section>`; // .book-parte
  }
  book.innerHTML = html;
}

/* ── Notes shortcut ── */
function lerNota(n){ return localStorage.getItem("nota-le-"+n)||""; }
function abrirNota(n){ window.location.href = "notas.html?n="+n; }

/* ── Mensagem do dia ── */
function initMensagem(){
  if(!EV.length) return;
  const card = document.getElementById("msg-card");
  if(!card) return;

  const today = new Date().toISOString().slice(0,10);
  const dismissed = localStorage.getItem("msg-dismissed");
  if(dismissed === today) return;

  const idx = dayOfYear(new Date()) % EV.length;
  const msg = EV[idx];
  if(!msg) return;

  document.getElementById("msg-label").textContent = "☀ Mensagem do dia — O Evangelho segundo o Espiritismo";
  document.getElementById("msg-titulo").textContent = msg.titulo||"";
  document.getElementById("msg-texto").textContent  = msg.texto||"";
  card.hidden = false;
}

function dismissMsg(){
  const today = new Date().toISOString().slice(0,10);
  localStorage.setItem("msg-dismissed", today);
  document.getElementById("msg-card").hidden = true;
}

/* ── Search ── */
let searchTimer = null;
let lastQuery   = "";

function onBusca(raw){
  // Sync both inputs
  const val = raw;
  const sb = document.getElementById("busca-sb");
  const tp = document.getElementById("busca-top");
  if(sb && sb.value !== val) sb.value = val;
  if(tp && tp.value !== val) tp.value = val;

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applySearch(val.trim()), 180);
}

function applySearch(query){
  if(query === lastQuery) return;
  lastQuery = query;

  const count = document.getElementById("busca-count");
  const items = document.querySelectorAll(".q-item");
  const caps  = document.querySelectorAll(".book-cap");
  const partes= document.querySelectorAll(".book-parte");

  if(!query){
    // Reset
    items.forEach(el => {
      el.classList.remove("hidden");
      el.querySelector(".q-p").innerHTML = esc(el.dataset.p);
      el.querySelector(".q-r").innerHTML = esc(el.dataset.r);
    });
    caps.forEach(el => el.style.display = "");
    partes.forEach(el => el.style.display = "");
    if(count){ count.textContent=""; count.hidden=true; }
    document.querySelectorAll(".no-results").forEach(el=>el.remove());
    return;
  }

  const q = norm(query);
  let total = 0;
  items.forEach(el => {
    const hay = norm(el.dataset.p + " " + el.dataset.r);
    if(hay.includes(q)){
      el.classList.remove("hidden");
      el.querySelector(".q-p").innerHTML = highlight(el.dataset.p, query);
      el.querySelector(".q-r").innerHTML = highlight(el.dataset.r, query);
      total++;
    } else {
      el.classList.add("hidden");
    }
  });

  // Hide empty caps and parts
  caps.forEach(cap => {
    const visible = cap.querySelectorAll(".q-item:not(.hidden)").length > 0;
    cap.style.display = visible ? "" : "none";
  });
  partes.forEach(parte => {
    const visible = parte.querySelectorAll(".q-item:not(.hidden)").length > 0;
    parte.style.display = visible ? "" : "none";
  });

  if(count){
    count.textContent = total ? total+" resultado"+(total!==1?"s":"") : "Nenhum resultado";
    count.hidden = false;
  }

  // Scroll to first result
  const first = document.querySelector(".q-item:not(.hidden)");
  if(first) first.scrollIntoView({ behavior:"smooth", block:"center" });
}

/* ── Active nav on scroll ── */
function updateActiveNav(){
  const scrollY = window.scrollY + 120;
  let activeParteId = null, activeCapId = null;

  for(const p of INDICE){
    const el = document.getElementById("parte-"+p.parte);
    if(el && el.offsetTop <= scrollY) activeParteId = "parte-"+p.parte;
    for(const c of p.caps){
      const cel = document.getElementById("cap-"+p.parte+"-"+c.min);
      if(cel && cel.offsetTop <= scrollY) activeCapId = "cap-"+p.parte+"-"+c.min;
    }
  }

  document.querySelectorAll(".sb-parte-link").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#"+activeParteId);
  });
  document.querySelectorAll(".sb-cap-link").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === "#"+activeCapId);
  });
}

/* ── Sidebar mobile ── */
function toggleSidebar(){
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  const open = sb.classList.toggle("open");
  ov.classList.toggle("on", open);
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("on");
}

/* Close sidebar on nav link click (mobile) */
document.addEventListener("click", e => {
  if(window.innerWidth <= 840 && e.target.matches(".sb-parte-link, .sb-cap-link")){
    setTimeout(closeSidebar, 150);
  }
});

/* ── Init ── */
(function init(){
  buildNav();
  buildBook();
  initMensagem();

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if(!scrollTicking){ requestAnimationFrame(()=>{ updateActiveNav(); scrollTicking=false; }); scrollTicking=true; }
  }, { passive: true });
  updateActiveNav();

  // Handle #hash from URL (e.g., estudo/notas linking back)
  if(location.hash){
    setTimeout(()=>{
      const el = document.querySelector(location.hash);
      if(el) el.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 300);
  }
})();
