import { normalizeText, escapeHtml } from "./app.js";

export function initLivro(){
  const out = document.querySelector("#le-resultados");
  if(!out) return;

  const inputNum = document.querySelector("#le-numero");
  const inputTxt = document.querySelector("#le-texto");
  const btn = document.querySelector("#le-buscar");

  const items = (window.LE_DATA || []);

  function render(list){
    out.innerHTML="";
    if(!list.length){
      out.innerHTML = '<div class="item"><div class="meta"><div class="sub">Nenhum resultado.</div></div></div>';
      return;
    }
    for(const it of list.slice(0,60)){
      const div=document.createElement("div");
      div.className="item";
      div.innerHTML = `
        <div class="meta">
          <div class="title">Pergunta ${escapeHtml(it.numero)}</div>
          <div class="sub"><b>${escapeHtml(it.pergunta||"")}</b></div>
          ${it.resposta? `<div class="sub">${escapeHtml(it.resposta||"")}</div>`:""}
        </div>`;
      out.appendChild(div);
    }
  }

  function search(){
    const num=(inputNum?.value||"").trim();
    const txt=normalizeText((inputTxt?.value||"").trim());
    if(num){
      const n=parseInt(num,10);
      return render(items.filter(x=>Number(x.numero)===n));
    }
    if(txt){
      return render(items.filter(x=>{
        const hay=normalizeText(`${x.pergunta||""} ${x.resposta||""}`);
        return hay.includes(txt);
      }));
    }
    render([]);
  }

  btn?.addEventListener("click",(e)=>{e.preventDefault();search();});
  [inputNum,inputTxt].forEach(inp=>inp?.addEventListener("keydown",(e)=>{if(e.key==="Enter"){e.preventDefault();search();}}));

  out.innerHTML = '<div class="item"><div class="meta"><div class="sub">Pesquise por número (ex.: 1) ou por palavra (ex.: Deus).</div></div></div>';
}
