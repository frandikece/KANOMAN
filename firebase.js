import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIfNTC1K55ljJ27YteUp7yGlmgn4zmlbU",
  authDomain: "kanoman-mandira.firebaseapp.com",
  projectId: "kanoman-mandira",
  storageBucket: "kanoman-mandira.firebasestorage.app",
  messagingSenderId: "436258919418",
  appId: "1:436258919418:web:3663367d61b9c15353ca43"
};

const fbapp = initializeApp(firebaseConfig);
export const db = getFirestore(fbapp);

// ── FIRESTORE HELPERS ──────────────────────────────────────────
export const fbGet  = async col => (await getDocs(collection(db, col))).docs.map(d => ({ id: d.id, ...d.data() }));
export const fbAdd  = async (col, data) => (await addDoc(collection(db, col), { ...data, _t: serverTimestamp() })).id;
export const fbSet  = (col, id, data)   => setDoc(doc(db, col, id), data, { merge: true });
export const fbUp   = (col, id, data)   => updateDoc(doc(db, col, id), data);
export const fbDel  = (col, id)         => deleteDoc(doc(db, col, id));
export const fbSub  = (col, cb)         => onSnapshot(collection(db, col), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

// ── SHARED UTILS ───────────────────────────────────────────────
export const uid    = () => Math.random().toString(36).substr(2, 9);
export const esc    = s  => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export const fd     = d  => d ? new Date(d).toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" }) : "-";
export const fm     = n  => "Rp " + Number(n || 0).toLocaleString("id-ID");
export const av     = n  => n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase() : "?";
export const pd     = s  => s ? new Date(s + "T00:00:00") : null;
export const ds     = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
export const MN     = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const MA     = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
export const COLORS = ["#1a56db","#0e9f6e","#e02424","#c27803","#7e3af2","#ff6b35","#0891b2","#be185d"];

// ── SESSION ────────────────────────────────────────────────────
export const getSession  = () => { try { return JSON.parse(localStorage.getItem("kkm_ses")); } catch { return null; } };
export const saveSession = u  => localStorage.setItem("kkm_ses", JSON.stringify(u));
export const clearSession = () => localStorage.removeItem("kkm_ses");

// ── TOAST ──────────────────────────────────────────────────────
export function toast(msg, type = "inf") {
  const icons = { ok:"✅", er:"❌", inf:"ℹ️" };
  const el = document.createElement("div");
  el.className = "tst " + type;
  el.innerHTML = `<span>${icons[type]||"ℹ️"}</span><span>${esc(msg)}</span>`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── MODAL ──────────────────────────────────────────────────────
export function modal(title, body, onAfter, onSave) {
  document.querySelector(".mo")?.remove();
  const hasFoot = onSave !== null && onSave !== undefined;
  const el = document.createElement("div");
  el.className = "mo";
  el.innerHTML = `
    <div class="md">
      <div class="mh"><h3>${title}</h3><button class="xb" onclick="this.closest('.mo').remove()">✕</button></div>
      <div class="mb">${body}</div>
      ${hasFoot ? `<div class="mf">
        <button class="btn bo" onclick="this.closest('.mo').remove()">Batal</button>
        <button class="btn bp" id="msb" onclick="window._msave()">Simpan</button>
      </div>` : ""}
    </div>`;
  document.body.appendChild(el);
  window._msave = async () => {
    const btn = document.getElementById("msb");
    if (!btn || !onSave) return;
    btn.disabled = true; btn.textContent = "Menyimpan...";
    const ok = await onSave();
    if (ok) document.querySelector(".mo")?.remove();
    else { btn.disabled = false; btn.textContent = "Simpan"; }
  };
  if (onAfter) setTimeout(onAfter, 0);
}

// ── THEME ──────────────────────────────────────────────────────
export function applyTheme() {
  const dk = localStorage.getItem("dk") === "1";
  document.documentElement.setAttribute("data-theme", dk ? "dark" : "light");
  return dk;
}
export function toggleTheme() {
  const dk = localStorage.getItem("dk") === "1";
  localStorage.setItem("dk", dk ? "0" : "1");
  applyTheme();
  return !dk;
}

// ── INIT DEFAULTS ──────────────────────────────────────────────
export async function initDefaults() {
  const users = await fbGet("users");
  if (!users.length) {
    await fbSet("users", "admin_def",  { nama:"Administrator",  tgl_lahir:"2000-01-01", password:"admin123",      role:"admin" });
    await fbSet("users", "bend_def",   { nama:"Bendahara Utama",tgl_lahir:"2000-01-02", password:"bendahara123",  role:"bendahara" });
  }
  const st = await fbGet("struktur");
  if (!st.length) {
    const defs = [
      { id:"s1", jabatan:"Ketua",          nama_pejabat:"", parent_id:null, urutan:0 },
      { id:"s2", jabatan:"Wakil Ketua",    nama_pejabat:"", parent_id:"s1", urutan:0 },
      { id:"s3", jabatan:"Sekretaris 1",   nama_pejabat:"", parent_id:"s1", urutan:1 },
      { id:"s4", jabatan:"Sekretaris 2",   nama_pejabat:"", parent_id:"s1", urutan:2 },
      { id:"s5", jabatan:"Bendahara 1",    nama_pejabat:"", parent_id:"s1", urutan:3 },
      { id:"s6", jabatan:"Bendahara 2",    nama_pejabat:"", parent_id:"s1", urutan:4 },
      { id:"s7", jabatan:"Anggota Bid. I", nama_pejabat:"", parent_id:"s3", urutan:0 },
      { id:"s8", jabatan:"Anggota Bid. II",nama_pejabat:"", parent_id:"s3", urutan:1 },
    ];
    for (const s of defs) await fbSet("struktur", s.id, s);
  }
}
