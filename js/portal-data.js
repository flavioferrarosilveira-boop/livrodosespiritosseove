import { loadJson } from "./app.js";
import { CONFIG } from "./firebase-config.js";

function isConfigured(){ return CONFIG && CONFIG.apiKey && CONFIG.projectId; }

export async function getMateriais(){
  if(!isConfigured()) return await loadJson("./data/materiais.json");
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getFirestore, collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = initializeApp(CONFIG);
  const db = getFirestore(app);
  const snap = await getDocs(query(collection(db,"materiais"), orderBy("createdAt","desc")));
  const items=[]; snap.forEach(d=>items.push(d.data()));
  return { items };
}

export async function getCalendario(){
  if(!isConfigured()) return await loadJson("./data/calendario.json");
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getFirestore, collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = initializeApp(CONFIG);
  const db = getFirestore(app);
  const snap = await getDocs(query(collection(db,"calendario"), orderBy("data","asc")));
  const aulas=[]; snap.forEach(d=>aulas.push(d.data()));
  return { aulas };
}
