import { loadJson, dayOfYear } from "./app.js";

export async function initMensagem(){
  const msgEl = document.querySelector("#mensagem-dia");
  if(!msgEl) return;
  const refEl = document.querySelector("#mensagem-ref");
  const linkEl = document.querySelector("#mensagem-link");

  const data = await loadJson("./data/evangelho_mensagens.json");
  const items = data?.items || [];
  if(!items.length){
    msgEl.textContent = "Mensagem indisponível no momento.";
    if(refEl) refEl.textContent = "";
    if(linkEl) linkEl.style.display="none";
    return;
  }
  const idx = (dayOfYear(new Date()) - 1) % items.length;
  const m = items[idx];

  msgEl.textContent = m.texto || "";
  if(refEl) refEl.textContent = `${m.titulo || ""}${m.fonte? " — "+m.fonte:""}`.trim();
  if(linkEl && m.link){
    linkEl.href = m.link;
    linkEl.style.display="";
  }else if(linkEl){
    linkEl.style.display="none";
  }
}
