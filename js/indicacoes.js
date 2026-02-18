import { escapeHtml } from "./app.js";

export function initIndicacoes(){
  const list = document.querySelector("#ind-list");
  if(!list) return;
  const items = (window.IND_DATA || []);
  list.innerHTML="";
  for(const it of items){
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <div class="meta">
        <div class="title">${escapeHtml(it.titulo||"")}</div>
        <div class="sub"><a href="${escapeHtml(it.url||"#")}" target="_blank" rel="noopener">${escapeHtml(it.url||"")}</a></div>
      </div>`;
    list.appendChild(div);
  }
}
