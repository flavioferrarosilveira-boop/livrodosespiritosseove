import { escapeHtml } from "./app.js";

export function initCalendario(){
  const tbody = document.querySelector("#cal-table-body");
  if(!tbody) return;
  const aulas = (window.CAL_DATA || []);
  tbody.innerHTML="";
  const today = new Date().toISOString().slice(0,10);

  if(!aulas.length){
    tbody.innerHTML = '<tr><td colspan="3"><span class="small">Nenhuma aula cadastrada.</span></td></tr>';
    return;
  }
  for(const a of aulas){
    const tr=document.createElement("tr");
    if((a.data||"")===today) tr.classList.add("today");
    tr.innerHTML = `
      <td>${escapeHtml(a.data||"")}</td>
      <td>${escapeHtml(a.tema||"")}</td>
      <td>${escapeHtml(a.facilitador||"")}</td>`;
    tbody.appendChild(tr);
  }
}
