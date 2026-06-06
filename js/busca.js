import { normalizeText, escapeHtml } from "./app.js";

const DECADAS = [
  {label:"1930–1939", min:1930, max:1939},
  {label:"1940–1949", min:1940, max:1949},
  {label:"1950–1959", min:1950, max:1959},
  {label:"1960–1969", min:1960, max:1969},
  {label:"1970–1979", min:1970, max:1979},
  {label:"1980–1989", min:1980, max:1989},
  {label:"1990–1999", min:1990, max:1999},
  {label:"2000+",     min:2000, max:2099},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s) {
  const trocas = {"á":"a","à":"a","ã":"a","â":"a","ä":"a","é":"e","è":"e","ê":"e","ë":"e",
                  "í":"i","ì":"i","î":"i","ï":"i","ó":"o","ò":"o","õ":"o","ô":"o","ö":"o",
                  "ú":"u","ù":"u","û":"u","ü":"u","ç":"c"};
  return s.toLowerCase().trim()
    .replace(/[áàãâäéèêëíìîïóòõôöúùûüç]/g, c => trocas[c] || c)
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function snippets(texto, query, max = 3) {
  const q    = normalizeText(query);
  const norm = normalizeText(texto);
  const out  = [];
  let pos = 0;

  while (out.length < max) {
    const idx = norm.indexOf(q, pos);
    if (idx === -1) break;
    const s = Math.max(0, idx - 110);
    const e = Math.min(texto.length, idx + q.length + 110);
    const trecho = texto.slice(s, e).trim();
    out.push((s > 0 ? "…" : "") + trecho + (e < texto.length ? "…" : ""));
    pos = idx + 1;
  }
  return out;
}

function highlight(texto, query) {
  if (!query) return escapeHtml(texto);
  const safe = escapeHtml(texto);
  const re   = new RegExp(escapeHtml(query).replace(/[-.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return safe.replace(re, m => `<mark class="hl">${m}</mark>`);
}

// ── Cache de textos já carregados ─────────────────────────────────────────────

const _textoCache = new Map();

async function carregarTexto(obra) {
  const k = obra.id;
  if (_textoCache.has(k)) return _textoCache.get(k);

  const slug = slugify(obra.titulo);
  const id3  = String(obra.id).padStart(3, "0");
  const url  = `data/textos/${id3}-${slug}.json`;

  try {
    const r = await fetch(url);
    if (!r.ok) { _textoCache.set(k, null); return null; }
    const d = await r.json();
    _textoCache.set(k, d);
    return d;
  } catch {
    _textoCache.set(k, null);
    return null;
  }
}

// ── Renderização ──────────────────────────────────────────────────────────────

function renderCard(o, query = "", snips = []) {
  const colab      = o.colab   ? ` · <em>Com ${escapeHtml(o.colab)}</em>` : "";
  const serieBadge = o.serie   ? `<span class="badge badge-serie">Série ${escapeHtml(o.serie)}</span>` : "";
  const link       = o.url     ? `<a class="button busca-btn-ver" href="${escapeHtml(o.url)}" target="_blank" rel="noopener">Ver online</a>` : "";
  const snipHtml   = snips.length
    ? `<div class="snip-box">${snips.map(s => `<p class="snip">${highlight(s, query)}</p>`).join("")}</div>`
    : "";

  return `
  <div class="item item-busca">
    <div class="meta">
      <div class="title">${highlight(o.titulo, query)}</div>
      <div class="sub">
        <strong>${o.ano}</strong>
        ${o.editora ? ` · ${escapeHtml(o.editora)}` : ""}
        ${o.espirito ? ` · <em>${highlight(o.espirito, query)}</em>` : ""}
        ${colab}
      </div>
      ${o.sinopse ? `<div class="sinopse">${highlight(o.sinopse, query)}</div>` : ""}
      ${snipHtml}
    </div>
    <div class="busca-badges">
      <span class="badge badge-cat">${escapeHtml(o.categoria)}</span>
      ${serieBadge}
      ${link}
    </div>
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initBusca() {
  const obras   = window.CHICO_XAVIER_DATA || [];
  const input   = document.getElementById("busca-input");
  const catSel  = document.getElementById("filtro-categoria");
  const serieSel= document.getElementById("filtro-serie");
  const perSel  = document.getElementById("filtro-periodo");
  const ordSel  = document.getElementById("filtro-ordenar");
  const modoSel = document.getElementById("filtro-modo");
  const countEl = document.getElementById("busca-count");
  const lista   = document.getElementById("busca-resultados");
  const spinner = document.getElementById("busca-spinner");

  if (!lista) return;

  // Opções dinâmicas
  [...new Set(obras.map(o => o.categoria))].sort().forEach(c => {
    catSel.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
  });
  [...new Set(obras.map(o => o.serie).filter(Boolean))].sort().forEach(s => {
    serieSel.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(s)}">Série ${escapeHtml(s)}</option>`);
  });
  DECADAS.forEach(d => {
    perSel.insertAdjacentHTML("beforeend",
      `<option value="${d.min}-${d.max}">${escapeHtml(d.label)}</option>`);
  });

  // ── Filtragem por metadados ──
  function filtrar() {
    const q    = normalizeText(input.value);
    const cat  = catSel.value;
    const serie= serieSel.value;
    const per  = perSel.value;
    const ord  = ordSel.value;

    let filtered = obras.filter(o => {
      if (cat   && o.categoria !== cat)   return false;
      if (serie && o.serie     !== serie) return false;
      if (per) {
        const [mn, mx] = per.split("-").map(Number);
        if (o.ano < mn || o.ano > mx) return false;
      }
      if (q) {
        const hay = normalizeText([o.titulo, o.espirito, o.sinopse, o.serie, o.colab].join(" "));
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if      (ord === "ano-desc") filtered.sort((a, b) => b.ano - a.ano);
    else if (ord === "titulo")   filtered.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
    else                         filtered.sort((a, b) => a.ano - b.ano);

    return filtered;
  }

  // ── Render somente metadados ──
  function renderMeta(filtered) {
    const n = filtered.length;
    countEl.textContent = `${n} obra${n !== 1 ? "s" : ""} encontrada${n !== 1 ? "s" : ""}`;

    if (!n) {
      lista.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhuma obra encontrada. Tente outros termos ou remova filtros.</div></div></div>';
      return;
    }
    lista.innerHTML = filtered.map(o => renderCard(o, input.value)).join("");
  }

  // ── Render com busca no texto completo ──
  async function renderComTexto(filtered) {
    const q = input.value.trim();
    if (!q) { renderMeta(filtered); return; }

    spinner.hidden = false;
    lista.innerHTML = "";
    countEl.textContent = "Buscando no texto…";

    const comSnippets = [];
    const semTexto    = [];

    await Promise.all(filtered.map(async o => {
      const dado = await carregarTexto(o);
      if (!dado) { semTexto.push(o); return; }

      const qn   = normalizeText(q);
      const norm = normalizeText(dado.texto_completo || "");
      if (!norm.includes(qn)) { semTexto.push(o); return; }

      const snips = snippets(dado.texto_completo, q);
      comSnippets.push({ obra: o, snips });
    }));

    spinner.hidden = true;

    const totalMeta  = filtered.length;
    const totalTexto = comSnippets.length;
    const temTextos  = comSnippets.length + (filtered.length - semTexto.length) > 0;

    if (!temTextos) {
      // nenhum texto disponível — mostra todos os resultados de metadados
      const n = filtered.length;
      countEl.textContent = `${n} obra${n !== 1 ? "s" : ""} nos metadados (textos não disponíveis ainda)`;
      lista.innerHTML = filtered.map(o => renderCard(o, q)).join("");
      return;
    }

    let html = "";

    if (comSnippets.length) {
      html += `<div class="small secao-label">Encontrado no texto de ${comSnippets.length} obra${comSnippets.length !== 1 ? "s" : ""}:</div>`;
      html += comSnippets.map(({ obra, snips }) => renderCard(obra, q, snips)).join("");
    }

    if (semTexto.length && semTexto.length < totalMeta) {
      html += `<div class="small secao-label" style="margin-top:14px;">Nos metadados (texto não disponível para estas ${semTexto.length}):</div>`;
      html += semTexto.map(o => renderCard(o, q)).join("");
    }

    countEl.textContent = comSnippets.length
      ? `${comSnippets.length} no texto completo + ${semTexto.length} só nos metadados`
      : `${totalMeta} nos metadados`;

    lista.innerHTML = html || '<div class="item"><div class="meta"><div class="sub">Nenhum resultado.</div></div></div>';
  }

  // ── Debounce ──
  let timer = null;
  function atualizar() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const filtered = filtrar();
      const modo = modoSel ? modoSel.value : "meta";
      if (modo === "texto") {
        await renderComTexto(filtered);
      } else {
        renderMeta(filtered);
      }
    }, 220);
  }

  input.addEventListener("input", atualizar);
  catSel.addEventListener("change", atualizar);
  serieSel.addEventListener("change", atualizar);
  perSel.addEventListener("change", atualizar);
  ordSel.addEventListener("change", atualizar);
  if (modoSel) modoSel.addEventListener("change", atualizar);

  atualizar();
}
