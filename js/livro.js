import { normalizeText, escapeHtml } from "./app.js";

export function initLivro() {
  const out      = document.getElementById("le-resultados");
  const countEl  = document.getElementById("le-count");
  const inputNum = document.getElementById("le-numero");
  const inputTxt = document.getElementById("le-texto");
  const btn      = document.getElementById("le-buscar");

  if (!out) return;

  const items = window.LE_DATA || [];

  function render(list) {
    if (countEl) {
      countEl.textContent = list.length
        ? `${list.length} pergunta${list.length !== 1 ? "s" : ""} encontrada${list.length !== 1 ? "s" : ""}`
        : "";
    }
    if (!list.length) {
      out.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhum resultado encontrado.</div></div></div>';
      return;
    }
    out.innerHTML = list.slice(0, 80).map(it => `
      <div class="item">
        <div class="meta">
          <div class="quest-num">Pergunta ${escapeHtml(String(it.numero))}</div>
          <div class="quest-p">${escapeHtml(it.pergunta || "")}</div>
          ${it.resposta ? `<div class="quest-r">${escapeHtml(it.resposta)}</div>` : ""}
        </div>
      </div>`).join("");
  }

  function search() {
    const num = (inputNum?.value || "").trim();
    const txt = normalizeText((inputTxt?.value || "").trim());

    if (num) {
      const n = parseInt(num, 10);
      return render(items.filter(x => Number(x.numero) === n));
    }
    if (txt) {
      return render(items.filter(x => {
        const hay = normalizeText(`${x.pergunta || ""} ${x.resposta || ""}`);
        return hay.includes(txt);
      }));
    }
    render([]);
    if (countEl) countEl.textContent = "";
    out.innerHTML = '<div class="item"><div class="meta"><div class="sub">Pesquise por número (ex.: 1) ou por palavra (ex.: Deus, alma, reencarnação).</div></div></div>';
  }

  btn?.addEventListener("click", e => { e.preventDefault(); search(); });
  [inputNum, inputTxt].forEach(inp =>
    inp?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); search(); } })
  );

  out.innerHTML = '<div class="item"><div class="meta"><div class="sub">Pesquise por número (ex.: 1) ou por palavra (ex.: Deus, alma, reencarnação).</div></div></div>';
}
