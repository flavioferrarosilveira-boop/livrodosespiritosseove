export function initVisitas(){
  const el = document.querySelector("#visitas");
  if(!el) return;
  const key="seove_visitas_local";
  const n = Number(localStorage.getItem(key)||"0") + 1;
  localStorage.setItem(key, String(n));
  el.textContent = `Visitas: ${n}`;
}
