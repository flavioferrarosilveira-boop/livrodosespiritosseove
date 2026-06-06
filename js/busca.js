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

export function initBusca() {
  const obras = window.CHICO_XAVIER_DATA || [];
  const input   = document.getElementById("busca-input");
  const catSel  = document.getElementById("filtro-categoria");
  const serieSel= document.getElementById("filtro-serie");
  const perSel  = document.getElementById("filtro-periodo");
  const ordSel  = document.getElementById("filtro-ordenar");
  const countEl = document.getElementById("busca-count");
  const lista   = document.getElementById("busca-resultados");

  if (!lista) return;

  // Populate category options dynamically
  const categorias = [...new Set(obras.map(o => o.categoria))].sort();
  categorias.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  // Populate series options dynamically
  const series = [...new Set(obras.map(o => o.serie).filter(Boolean))].sort();
  series.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = "Série " + s;
    serieSel.appendChild(opt);
  });

  // Populate decade options
  DECADAS.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.min + "-" + d.max;
    opt.textContent = d.label;
    perSel.appendChild(opt);
  });

  function render() {
    const q    = normalizeText(input.value);
    const cat  = catSel.value;
    const serie= serieSel.value;
    const per  = perSel.value;
    const ord  = ordSel.value;

    let filtered = obras.filter(o => {
      if (cat   && o.categoria !== cat)   return false;
      if (serie && o.serie     !== serie) return false;
      if (per) {
        const [min, max] = per.split("-").map(Number);
        if (o.ano < min || o.ano > max)   return false;
      }
      if (q) {
        const hay = normalizeText([o.titulo, o.espirito, o.sinopse, o.serie, o.colab].join(" "));
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort
    if      (ord === "ano-desc") filtered.sort((a, b) => b.ano - a.ano);
    else if (ord === "titulo")   filtered.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
    else                         filtered.sort((a, b) => a.ano - b.ano);

    const n = filtered.length;
    countEl.textContent = `${n} obra${n !== 1 ? "s" : ""} encontrada${n !== 1 ? "s" : ""}`;

    if (!n) {
      lista.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhuma obra encontrada. Tente outros termos ou remova filtros.</div></div></div>';
      return;
    }

    lista.innerHTML = filtered.map(o => {
      const colab = o.colab ? ` · <em>Com ${escapeHtml(o.colab)}</em>` : "";
      const serieBadge = o.serie ? `<span class="badge badge-serie">Série ${escapeHtml(o.serie)}</span>` : "";
      const link = o.url
        ? `<a class="button busca-btn-ver" href="${escapeHtml(o.url)}" target="_blank" rel="noopener">Ver</a>`
        : "";
      return `
      <div class="item item-busca">
        <div class="meta">
          <div class="title">${escapeHtml(o.titulo)}</div>
          <div class="sub">
            <strong>${o.ano}</strong>
            ${o.editora ? ` · ${escapeHtml(o.editora)}` : ""}
            ${o.espirito ? ` · <em>${escapeHtml(o.espirito)}</em>` : ""}
            ${colab}
          </div>
          ${o.sinopse ? `<div class="sinopse">${escapeHtml(o.sinopse)}</div>` : ""}
        </div>
        <div class="busca-badges">
          <span class="badge badge-cat">${escapeHtml(o.categoria)}</span>
          ${serieBadge}
          ${link}
        </div>
      </div>`;
    }).join("");
  }

  input.addEventListener("input", render);
  catSel.addEventListener("change", render);
  serieSel.addEventListener("change", render);
  perSel.addEventListener("change", render);
  ordSel.addEventListener("change", render);

  render();
}
