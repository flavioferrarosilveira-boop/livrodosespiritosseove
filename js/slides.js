import { escapeHtml } from "./app.js";

export function initSlides(){
  const list = document.querySelector("#slides-list");
  if(!list) return;
  const items = (window.SLIDES_DATA || []);
  list.innerHTML="";
  if(!items.length){
    list.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhum material cadastrado ainda.</div></div></div>';
    return;
  }
  for(const it of items){
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(it.titulo||"Material")}</div>
        ${it.descricao? `<div class="sub">${escapeHtml(it.descricao)}</div>`:""}
        <div class="sub"><a href="${escapeHtml(it.url||"#")}" target="_blank" rel="noopener">Abrir / Download</a></div>
      </div>`;
    list.appendChild(div);
  }
}
