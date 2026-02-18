import { esc } from "./app.js";
import { getMateriais } from "./portal-data.js";

export async function renderMateriais(){
  const el=document.querySelector("#materiais-lista");
  if(!el) return;
  try{
    const data=await getMateriais();
    const items=Array.isArray(data?.items)?data.items:[];
    const visible=items.filter(x=>x?.public===true);
    if(!visible.length){ el.innerHTML='<div class="small">Ainda não há materiais publicados.</div>'; return; }
    el.innerHTML=visible.map(it=>`
      <div class="item">
        <div class="meta">
          <div class="title">${esc(it.titulo||"Material")}</div>
          <div class="sub">${esc(it.subtitulo||"")}</div>
        </div>
        <a class="button" href="${esc(it.url||"#")}" target="_blank" rel="noopener">Download</a>
      </div>`).join("");
  }catch(e){
    el.innerHTML='<div class="small">Não foi possível carregar os materiais.</div>';
    console.error(e);
  }
}
