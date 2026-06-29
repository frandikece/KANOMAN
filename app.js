// js/app.js — Page router & all page logic
import { esc, fd, fm, av, pd, ds, MN, MA, COLORS, uid, toast, modal, fbAdd, fbSet, fbUp, fbDel } from './firebase.js';

// ── COUNTDOWN ──────────────────────────────────────────────────
function getCD(tgl, wkt) {
  const diff = new Date(tgl + 'T' + (wkt || '00:00')) - new Date();
  if (diff <= 0) return null;
  return { d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000), s: Math.floor((diff%60000)/1000) };
}
function cdHTML(c) {
  if (!c) return '<span class="cd-done">✅ Sudah berlangsung</span>';
  return `<div class="cd-wrap">
    <div class="cd-box"><span class="cd-num">${c.d}</span><span class="cd-lbl">Hari</span></div>
    <div class="cd-box"><span class="cd-num">${c.h}</span><span class="cd-lbl">Jam</span></div>
    <div class="cd-box"><span class="cd-num">${c.m}</span><span class="cd-lbl">Mnt</span></div>
    <div class="cd-box"><span class="cd-num">${c.s}</span><span class="cd-lbl">Det</span></div>
  </div>`;
}

export function initPage() {
  if (window._cdi) clearInterval(window._cdi);
  window._cdi = setInterval(() => {
    document.querySelectorAll('[data-cdt]').forEach(el => {
      el.innerHTML = cdHTML(getCD(el.dataset.cdt, el.dataset.cdw));
    });
  }, 1000);
}

export function renderPage(page, CU, CA) {
  const el = document.getElementById('content');
  if (!el) return;
  switch(page) {
    case 'dashboard':     el.innerHTML = rDash(CU, CA); break;
    case 'rapat':         el.innerHTML = rRapat(CU, CA); break;
    case 'anggota':       el.innerHTML = rAnggota(CU, CA); break;
    case 'absensi_rekap': el.innerHTML = rRekap(CU, CA); break;
    case 'struktur':      el.innerHTML = rStruktur(CU, CA); break;
    case 'kalender':      el.innerHTML = rKalender(CU, CA); break;
    case 'notulen':       el.innerHTML = rNotulen(CU, CA); break;
    case 'kas':           el.innerHTML = rKas(CU, CA); break;
    case 'arisan':        el.innerHTML = rArisan(CU, CA); break;
    default:              el.innerHTML = rDash(CU, CA);
  }
}

// ── DASHBOARD ──────────────────────────────────────────────────
function rDash(CU, CA) {
  const up = CA.rapats.filter(r => !r.selesai && new Date(r.tanggal + 'T' + (r.waktu||'00:00')) > new Date()).sort((a,b) => new Date(a.tanggal)-new Date(b.tanggal));
  const myAb = CA.absensi.filter(a => a.user_id === CU.id).length;
  const saldo = CA.kas.reduce((s,k) => k.jenis==='masuk' ? s+Number(k.jumlah) : s-Number(k.jumlah), 0);
  const nx = up[0];
  return `
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">👥</div><div class="stat-val">${CA.users.length}</div><div class="stat-label">Total Anggota</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#d1fae5">📅</div><div class="stat-val">${up.length}</div><div class="stat-label">Rapat Mendatang</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#dbeafe">✅</div><div class="stat-val">${myAb}</div><div class="stat-label">Absensi Saya</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#fef3c7">💰</div><div class="stat-val" style="font-size:.95rem">${fm(saldo)}</div><div class="stat-label">Saldo Kas</div></div>
  </div>
  ${nx ? `<div class="card mb-1">
    <div class="card-header"><h3 class="card-title">📅 Rapat Berikutnya</h3><span class="badge b-pr">Akan Datang</span></div>
    <div style="font-weight:600;font-size:.9rem;margin-bottom:.38rem">${esc(nx.judul)}</div>
    <div class="rapat-meta"><span>📍 ${esc(nx.tempat||'-')}</span><span>🗓️ ${fd(nx.tanggal)}</span><span>⏰ ${nx.waktu||'-'}</span></div>
    <div data-cdt="${nx.tanggal}" data-cdw="${nx.waktu||'00:00'}">${cdHTML(getCD(nx.tanggal, nx.waktu||'00:00'))}</div>
  </div>` : ''}
  <div class="card">
    <div class="card-header"><h3 class="card-title">👋 Selamat Datang</h3></div>
    <p style="font-size:.83rem;color:var(--tx2);line-height:1.7">
      Halo, <strong style="color:var(--tx)">${esc(CU.nama)}</strong>! Login sebagai <span class="role-badge r-${CU.role}">${CU.role}</span>.<br><br>
      Gunakan menu di samping untuk mengakses fitur <strong style="color:var(--tx)">KADANG KANOMAN MANDIRA</strong>.
    </p>
  </div>`;
}

// ── RAPAT ──────────────────────────────────────────────────────
function rRapat(CU, CA) {
  const isA = CU.role === 'admin';
  const active = CA.rapats.filter(r => !r.selesai).sort((a,b) => new Date(a.tanggal)-new Date(b.tanggal));
  const done   = CA.rapats.filter(r =>  r.selesai).sort((a,b) => new Date(b.tanggal)-new Date(a.tanggal));
  let h = `<div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">Jadwal Rapat</h2>
    ${isA ? '<button class="btn btn-p btn-sm" onclick="window.mRapat()">+ Tambah Rapat</button>' : ''}
  </div>`;
  if (!active.length && !done.length) return h + '<div class="empty-state"><span class="ic">📅</span><h3>Belum ada jadwal rapat</h3></div>';
  h += active.map(r => rcCard(r, CU, CA, isA)).join('');
  if (done.length) {
    h += `<div style="margin:1.1rem 0 .65rem;font-size:.78rem;font-weight:600;color:var(--tx2)">✅ Rapat Selesai (${done.length})</div>`;
    h += done.map(r => rcDone(r, CU, CA, isA)).join('');
  }
  return h;
}

function rcCard(r, CU, CA, isA) {
  const started = new Date() >= new Date(r.tanggal + 'T' + (r.waktu||'00:00'));
  const myAb = CA.absensi.find(a => a.rapat_id===r.id && a.user_id===CU.id);
  const tot = CA.absensi.filter(a => a.rapat_id===r.id).length;
  return `<div class="rapat-card">
    <div class="flex items-center justify-between" style="gap:.45rem;align-items:flex-start">
      <div style="flex:1">
        <div style="font-weight:600;font-size:.9rem">${esc(r.judul)}</div>
        <div class="rapat-meta"><span>📍 ${esc(r.tempat||'-')}</span><span>🗓️ ${fd(r.tanggal)}</span><span>⏰ ${r.waktu||'-'}</span></div>
      </div>
      <div class="flex" style="gap:.28rem;align-items:center;flex-shrink:0">
        <span class="badge ${started?'b-ok':'b-pr'}">${started?'Berlangsung':'Akan Datang'}</span>
        ${isA ? `<button class="btn btn-g btn-xs" onclick="window.mRapat('${r.id}')">✏️</button>
          <button class="btn btn-g btn-xs" onclick="window.mkSelesai('${r.id}')">✅ Selesai</button>
          <button class="btn btn-g btn-xs" onclick="window.dlRapat('${r.id}')">🗑️</button>` : ''}
      </div>
    </div>
    ${!started ? `<div data-cdt="${r.tanggal}" data-cdw="${r.waktu||'00:00'}" style="margin:.5rem 0">${cdHTML(getCD(r.tanggal, r.waktu||'00:00'))}</div>` : ''}
    <div class="flex" style="gap:.65rem;font-size:.72rem;color:var(--tx2);margin-top:.45rem">
      <span>✅ ${tot} hadir</span>
      ${isA ? `<span>🔑 <strong>${esc(r.password_absensi||'-')}</strong></span>` : ''}
    </div>
    ${started && !myAb && CU.role !== 'admin' ? `
    <div class="absen-box">
      <div style="font-size:.78rem;font-weight:600;margin-bottom:.45rem">Lakukan Absensi</div>
      <div class="flex" style="gap:.38rem">
        <input type="password" id="ap-${r.id}" placeholder="Password absensi" style="flex:1;padding:.42rem .65rem;border:1.5px solid var(--bd);border-radius:var(--r);background:var(--sf);color:var(--tx);font-size:.8rem">
        <button class="btn btn-ok btn-sm" onclick="window.doAbsen('${r.id}')">Absen</button>
      </div>
    </div>` : ''}
    ${myAb ? `<div class="badge b-ok" style="margin-top:.5rem">✅ Absen: ${new Date(myAb.timestamp).toLocaleString('id-ID')}</div>` : ''}
    ${started && isA ? `
    <div class="flex" style="gap:.5rem;margin-top:.65rem;flex-wrap:wrap">
      <button class="btn btn-o btn-sm" onclick="window.mNot('${r.id}')">📝 ${r.catatan?'Edit':'Tulis'} Notulen</button>
      <label class="btn btn-o btn-sm" style="cursor:pointer">
        📂 Import .docx
        <input type="file" accept=".docx,.doc,.txt" style="display:none" onchange="window.importDoc('${r.id}',this)">
      </label>
    </div>` : ''}
  </div>`;
}

function rcDone(r, CU, CA, isA) {
  const tot = CA.absensi.filter(a => a.rapat_id===r.id).length;
  // FIX: rapat selesai juga bisa punya notulen — tampilkan info catatan
  return `<div class="rapat-card" style="opacity:.7;border-style:dashed">
    <div class="flex items-center justify-between" style="gap:.4rem">
      <div style="flex:1">
        <div style="font-weight:600;font-size:.86rem">${esc(r.judul)}</div>
        <div class="rapat-meta"><span>🗓️ ${fd(r.tanggal)}</span><span>✅ ${tot} hadir</span>${r.catatan?'<span>📝 Ada notulen</span>':''}</div>
      </div>
      <div class="flex" style="gap:.28rem;align-items:center">
        <span class="badge b-gr">Selesai</span>
        ${isA ? `<button class="btn btn-g btn-xs" onclick="window.mNot('${r.id}')">📝</button>
          <button class="btn btn-g btn-xs" onclick="window.dlRapat('${r.id}')">🗑️</button>` : ''}
      </div>
    </div>
  </div>`;
}

window.doAbsen = async function(rid) {
  const pw = document.getElementById('ap-'+rid)?.value || '';
  const r = window.CA.rapats.find(x => x.id===rid);
  if (!r) return;
  if (r.password_absensi && pw !== r.password_absensi) { toast('Password absensi salah!','er'); return; }
  try { await fbAdd('absensi',{rapat_id:rid,user_id:window.CU.id,nama:window.CU.nama,timestamp:new Date().toISOString()}); toast('Absensi berhasil!','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.mkSelesai = async function(id) {
  if (!confirm('Tandai rapat ini selesai?')) return;
  try { await fbUp('rapats',id,{selesai:true}); toast('Rapat ditandai selesai','ok'); } catch(e) { toast('Gagal','er'); }
};
window.dlRapat = async function(id) {
  if (!confirm('Hapus rapat ini?')) return;
  try { await fbDel('rapats',id); toast('Dihapus','ok'); } catch(e) { toast('Gagal','er'); }
};
window.mRapat = function(eid) {
  const r = eid ? window.CA.rapats.find(x=>x.id===eid) : {};
  modal((eid?'Edit':'Tambah')+' Jadwal Rapat',
    `<div class="fg"><label>Judul Rapat</label><input id="mj" placeholder="Rapat Rutin Bulanan"></div>
     <div class="fg"><label>Tanggal</label><input id="mt" type="date"></div>
     <div class="fg"><label>Waktu</label><input id="mw" type="time"></div>
     <div class="fg"><label>Tempat</label><input id="mtp" placeholder="Balai Desa / Online"></div>
     <div class="fg"><label>Password Absensi</label><input id="mp" placeholder="Password untuk anggota absen"></div>`,
    () => {
      document.getElementById('mj').value  = r.judul||'';
      document.getElementById('mt').value  = r.tanggal||'';
      document.getElementById('mw').value  = r.waktu||'';
      document.getElementById('mtp').value = r.tempat||'';
      document.getElementById('mp').value  = r.password_absensi||'';
    },
    async () => {
      const j=document.getElementById('mj').value.trim(), t=document.getElementById('mt').value;
      if (!j||!t) { toast('Judul dan tanggal wajib','er'); return false; }
      const data={judul:j,tanggal:t,waktu:document.getElementById('mw').value,tempat:document.getElementById('mtp').value.trim(),password_absensi:document.getElementById('mp').value.trim()};
      try { eid ? await fbUp('rapats',eid,data) : await fbAdd('rapats',data); toast('Disimpan','ok'); return true; }
      catch(e) { toast('Gagal','er'); return false; }
    }
  );
};
window.mNot = function(rid) {
  const r = window.CA.rapats.find(x=>x.id===rid)||{};
  modal('Notulen — '+esc(r.judul||''),
    `<div class="fg"><label>Catatan Rapat</label><textarea id="mnt" style="min-height:160px" placeholder="Tuliskan hasil rapat..."></textarea></div>`,
    () => { document.getElementById('mnt').value = r.catatan||''; },
    async () => {
      try { await fbUp('rapats',rid,{catatan:document.getElementById('mnt').value.trim()}); toast('Notulen disimpan','ok'); return true; }
      catch(e) { toast('Gagal','er'); return false; }
    }
  );
};
// Import .docx / .txt sebagai notulen
window.importDoc = function(rid, input) {
  const file = input.files[0]; if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  if (ext === 'txt') {
    reader.onload = async e => {
      const text = e.target.result;
      if (!confirm('Gunakan isi file ini sebagai notulen rapat? Isi notulen sebelumnya akan diganti.')) return;
      try { await fbUp('rapats',rid,{catatan:text}); toast('Notulen berhasil diimport!','ok'); }
      catch(e) { toast('Gagal import','er'); }
    };
    reader.readAsText(file);
  } else if (ext === 'docx' || ext === 'doc') {
    // Extract text from docx using raw XML parse
    reader.onload = async e => {
      try {
        const arr = e.target.result;
        const zip = await new Promise((res,rej) => {
          const r2 = new FileReader();
          const blob = new Blob([arr]);
          // Use JSZip if available, else fallback to plain text extraction
          if (typeof JSZip !== 'undefined') {
            JSZip.loadAsync(blob).then(res).catch(rej);
          } else {
            rej(new Error('no_jszip'));
          }
        });
        const xml = await zip.file('word/document.xml').async('text');
        // Extract text between <w:t> tags
        const text = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
          ?.map(m => m.replace(/<[^>]+>/g,''))
          .join(' ') || '';
        if (!confirm('Gunakan isi file ini sebagai notulen rapat?')) return;
        await fbUp('rapats',rid,{catatan:text});
        toast('Notulen berhasil diimport!','ok');
      } catch(err) {
        // Fallback: read as plain text
        const r2 = new FileReader();
        r2.onload = async e2 => {
          const text = e2.target.result;
          if (!confirm('Gunakan isi file ini sebagai notulen? (Format .docx, teks mungkin tidak sempurna)')) return;
          try { await fbUp('rapats',rid,{catatan:text}); toast('Notulen diimport (mode teks)','ok'); }
          catch(e3) { toast('Gagal','er'); }
        };
        r2.readAsText(file);
      }
    };
    reader.readAsArrayBuffer(file);
  }
  input.value = ''; // reset input
};

// ── ANGGOTA ────────────────────────────────────────────────────
function rAnggota(CU, CA) {
  if (CU.role !== 'admin') return '<div class="empty-state"><span class="ic">🔒</span><h3>Akses Terbatas</h3></div>';
  return `<div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">Data Anggota (${CA.users.length})</h2>
  </div>
  <div class="card" style="padding:0"><div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Nama</th><th>Tanggal Lahir</th><th>Password</th><th>Peran</th><th>Aksi</th></tr></thead>
    <tbody>${CA.users.map((u,i) => `<tr>
      <td style="color:var(--tx2)">${i+1}</td>
      <td><div class="flex items-center" style="gap:.45rem"><div class="avatar" style="width:26px;height:26px;font-size:.62rem">${av(u.nama)}</div><span style="font-weight:500">${esc(u.nama)}</span></div></td>
      <td>${fd(u.tgl_lahir)}</td>
      <td>
        <div class="flex items-center" style="gap:.3rem">
          <span id="pw-${u.id}" style="font-size:.75rem;font-family:monospace;letter-spacing:.05em">••••••</span>
          <button class="btn btn-g btn-xs" onclick="window.tgPw('${u.id}','${esc(u.password||'')}')" title="Lihat password">👁️</button>
        </div>
      </td>
      <td><span class="role-badge r-${u.role}">${u.role}</span></td>
      <td><div class="flex" style="gap:.28rem;align-items:center">
        ${u.id !== CU.id ? `
          <select onchange="window.chRole('${u.id}',this.value)" style="font-size:.7rem;padding:.18rem .38rem;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx)">
            <option value="anggota"${u.role==='anggota'?' selected':''}>Anggota</option>
            <option value="bendahara"${u.role==='bendahara'?' selected':''}>Bendahara</option>
            <option value="admin"${u.role==='admin'?' selected':''}>Admin</option>
          </select>
          <button class="btn btn-er btn-xs" onclick="window.dlUser('${u.id}')">🗑️</button>`
        : '<span style="font-size:.7rem;color:var(--tx3)">(Anda)</span>'}
      </div></td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}
// Toggle show/hide password
window.tgPw = function(id, pw) {
  const el = document.getElementById('pw-'+id);
  if (!el) return;
  el.textContent = el.textContent.includes('•') ? pw : '••••••';
};
window.chRole = async function(id, role) {
  try { await fbUp('users',id,{role}); if(window.CU.id===id){window.CU.role=role;} toast('Peran diubah','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.dlUser = async function(id) {
  if (!confirm('Hapus anggota ini?')) return;
  try { await fbDel('users',id); toast('Dihapus','ok'); } catch(e) { toast('Gagal','er'); }
};

// ── REKAP ABSENSI ──────────────────────────────────────────────
function rRekap(CU, CA) {
  if (CU.role !== 'admin') return '<div class="empty-state"><span class="ic">🔒</span><h3>Akses Terbatas</h3></div>';
  const tot = CA.rapats.length;
  const us = CA.users.map(u => {
    const h = CA.absensi.filter(a => a.user_id===u.id).length;
    return {...u, h, nh:tot-h, pct:tot>0?Math.round(h/tot*100):0};
  }).sort((a,b) => b.h-a.h);
  const rs = [...CA.rapats].sort((a,b) => new Date(b.tanggal)-new Date(a.tanggal)).map(r => {
    const hl = CA.absensi.filter(a => a.rapat_id===r.id);
    return {...r, hc:hl.length, nhc:CA.users.length-hl.length, hn:hl.map(a=>a.nama)};
  });
  return `<h2 class="sec-title">📊 Rekap Absensi</h2>
  <div class="grid-2 mb-1">
    <div class="stat-card"><div class="stat-icon" style="background:#dbeafe">📅</div><div class="stat-val">${tot}</div><div class="stat-label">Total Rapat</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">👥</div><div class="stat-val">${CA.users.length}</div><div class="stat-label">Total Anggota</div></div>
  </div>
  <div class="card" style="padding:0;margin-bottom:1rem">
    <div style="padding:.82rem 1rem;border-bottom:1px solid var(--bd)"><h3 class="card-title">👥 Per Anggota</h3></div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Nama</th><th>Peran</th><th>Hadir</th><th>Absen</th><th>%</th><th></th></tr></thead>
      <tbody>${us.map((u,i) => `<tr>
        <td style="color:var(--tx2)">${i+1}</td>
        <td><div class="flex items-center" style="gap:.4rem"><div class="avatar" style="width:24px;height:24px;font-size:.6rem">${av(u.nama)}</div>${esc(u.nama)}</div></td>
        <td><span class="role-badge r-${u.role}">${u.role}</span></td>
        <td><span class="badge b-ok">${u.h}x</span></td>
        <td><span class="badge b-er">${u.nh}x</span></td>
        <td><div class="flex items-center" style="gap:.35rem">
          <div style="flex:1;height:5px;background:var(--bd);border-radius:3px;min-width:45px"><div style="height:100%;width:${u.pct}%;background:var(--ok);border-radius:3px"></div></div>
          <span style="font-size:.7rem;font-weight:600;color:var(--ok)">${u.pct}%</span>
        </div></td>
        <td><button class="btn btn-g btn-xs" onclick="window.dtAbsen('${u.id}')">🔍</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
  <div class="card" style="padding:0">
    <div style="padding:.82rem 1rem;border-bottom:1px solid var(--bd)"><h3 class="card-title">📅 Per Rapat</h3></div>
    ${!rs.length ? '<div class="empty-state"><span class="ic">📅</span><h3>Belum ada rapat</h3></div>' : `
    <div class="table-wrap"><table>
      <thead><tr><th>Rapat</th><th>Tanggal</th><th>Hadir</th><th>Absen</th><th>Yang Hadir</th></tr></thead>
      <tbody>${rs.map(r => `<tr>
        <td style="font-weight:500">${esc(r.judul)}</td>
        <td style="white-space:nowrap">${fd(r.tanggal)}</td>
        <td><span class="badge b-ok">${r.hc}</span></td>
        <td><span class="badge b-er">${r.nhc}</span></td>
        <td style="font-size:.72rem;color:var(--tx2)">${r.hn.length ? r.hn.map(n=>esc(n)).join(', ') : '<i>-</i>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`}
  </div>`;
}
window.dtAbsen = function(uid2) {
  const u = window.CA.users.find(x=>x.id===uid2); if(!u) return;
  const myAb = window.CA.absensi.filter(a=>a.user_id===uid2);
  const rapats = [...window.CA.rapats].sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));
  const rows = rapats.map(r => {
    const ab = myAb.find(a=>a.rapat_id===r.id);
    return `<div class="flex items-center justify-between" style="padding:.45rem 0;border-bottom:1px solid var(--bd)">
      <div><div style="font-size:.83rem;font-weight:500">${esc(r.judul)}</div><div style="font-size:.7rem;color:var(--tx2)">${fd(r.tanggal)}</div></div>
      ${ab ? '<span class="badge b-ok">✅ Hadir</span>' : '<span class="badge b-er">❌ Absen</span>'}
    </div>`;
  }).join('');
  modal('Riwayat — '+esc(u.nama),
    `<div style="margin-bottom:.65rem">
      <span class="badge b-ok" style="margin-right:.28rem">✅ ${myAb.length}x hadir</span>
      <span class="badge b-er">❌ ${rapats.length-myAb.length}x absen</span>
    </div>${rows||'<div class="empty-state"><span class="ic">📅</span><h3>Belum ada rapat</h3></div>'}`,
    null, null
  );
};

// ── STRUKTUR ORGANISASI ────────────────────────────────────────
// Render bagan hierarki: Ketua → Wakil Ketua → cabang Sekretaris/Bendahara
function rStruktur(CU, CA) {
  const isA = CU.role === 'admin';
  const st = CA.struktur;

  // Build tree recursively
  function buildTree(parentId, level) {
    const children = st.filter(s => s.parent_id === parentId).sort((a,b) => a.urutan - b.urutan);
    if (!children.length) return '';

    return `<div class="org-children" style="display:flex;flex-direction:column;align-items:center;width:100%">
      <div class="org-line-down" style="width:2px;height:20px;background:var(--bd2);margin:0 auto"></div>
      <div style="position:relative;display:flex;justify-content:center;align-items:flex-start;gap:0;width:100%">
        ${children.length > 1 ? `<div style="position:absolute;top:0;left:calc(100% / ${children.length} / 2);right:calc(100% / ${children.length} / 2);height:2px;background:var(--bd2)"></div>` : ''}
        ${children.map(c => `
          <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:120px;padding:0 6px">
            <div style="width:2px;height:20px;background:var(--bd2)"></div>
            <div class="org-node${level===0&&!st.find(s=>s.parent_id===null&&s.id!==c.id)?'':''}" style="
              background:${level===0?'var(--pr)':'var(--sf)'};
              border:2px solid var(--pr);
              border-radius:10px;
              padding:.55rem .9rem;
              text-align:center;
              min-width:115px;
              max-width:150px;
              box-shadow:var(--sh)">
              <div style="font-size:.6rem;color:${level===0?'rgba(255,255,255,.75)':'var(--tx2)'};margin-bottom:.1rem;font-weight:500">${esc(c.jabatan)}</div>
              <div style="font-size:.78rem;font-weight:600;color:${level===0?'#fff':'var(--tx)'}">${esc(c.nama_pejabat)||'—'}</div>
            </div>
            ${buildTree(c.id, level+1)}
          </div>`).join('')}
      </div>
    </div>`;
  }

  // Render root nodes (no parent)
  const roots = st.filter(s => !s.parent_id).sort((a,b) => a.urutan - b.urutan);
  const treeHTML = roots.map(root => `
    <div style="display:flex;flex-direction:column;align-items:center;width:100%">
      <div style="background:var(--pr);border:2px solid var(--prd);border-radius:12px;padding:.7rem 1.2rem;text-align:center;min-width:130px;color:#fff;box-shadow:var(--shm)">
        <div style="font-size:.65rem;opacity:.8;margin-bottom:.12rem;font-weight:500">${esc(root.jabatan)}</div>
        <div style="font-size:.88rem;font-weight:700">${esc(root.nama_pejabat)||'—'}</div>
      </div>
      ${buildTree(root.id, 0)}
    </div>`).join('');

  return `<div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">Struktur Organisasi</h2>
    ${isA ? '<button class="btn btn-p btn-sm" onclick="window.mStruk()">✏️ Edit</button>' : ''}
  </div>
  <div class="card">
    <div style="overflow-x:auto;padding:1rem 0;min-height:180px">
      ${!roots.length ? '<div class="empty-state"><span class="ic">🏛️</span><h3>Belum ada struktur</h3></div>' : treeHTML}
    </div>
  </div>`;
}

window.mStruk = function() {
  const st = [...window.CA.struktur].sort((a,b)=>a.urutan-b.urutan);
  const rows = st.map(s => `
    <div class="oe-node" data-id="${s.id}" style="border:1.5px solid var(--bd);border-radius:var(--r);padding:.7rem;background:var(--sf2)">
      <div style="font-size:.68rem;color:var(--tx2);margin-bottom:.22rem">Jabatan</div>
      <input class="ej" placeholder="Nama jabatan" style="width:100%;margin-bottom:.35rem;padding:.35rem .55rem;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx);font-size:.76rem">
      <div style="font-size:.68rem;color:var(--tx2);margin-bottom:.22rem">Nama Pejabat</div>
      <input class="en" placeholder="Nama anggota" style="width:100%;padding:.35rem .55rem;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx);font-size:.76rem">
      <button onclick="this.closest('.oe-node').remove()" style="margin-top:.35rem;font-size:.66rem;background:var(--er);color:#fff;border:none;padding:.18rem .42rem;border-radius:5px;cursor:pointer">Hapus</button>
    </div>`).join('');
  modal('✏️ Edit Struktur Organisasi',
    `<p style="font-size:.75rem;color:var(--tx2);margin-bottom:.82rem">
      Posisi <strong>pertama</strong> otomatis jadi <strong>Ketua</strong> (root / paling atas).<br>
      Posisi selanjutnya akan menjadi cabang di bawah Ketua.
    </p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:.6rem" id="oel">${rows}</div>
    <button onclick="window.addSNode()" class="btn btn-o btn-sm" style="margin-top:.65rem">+ Tambah Posisi</button>`,
    () => {
      st.forEach(s => {
        const n = document.querySelector(`.oe-node[data-id="${s.id}"]`);
        if (n) { n.querySelector('.ej').value=s.jabatan; n.querySelector('.en').value=s.nama_pejabat||''; }
      });
    },
    async () => {
      const nodes = document.querySelectorAll('.oe-node');
      const ns = [];
      nodes.forEach((n,i) => {
        const j=n.querySelector('.ej').value.trim(), nm=n.querySelector('.en').value.trim();
        if (j) ns.push({id:n.dataset.id||uid(), jabatan:j, nama_pejabat:nm, parent_id:i===0?null:(ns[0]?.id||null), urutan:i});
      });
      try {
        for (const o of window.CA.struktur) await fbDel('struktur',o.id);
        for (const s of ns) await fbSet('struktur',s.id,s);
        toast('Struktur disimpan','ok'); return true;
      } catch(e) { toast('Gagal','er'); return false; }
    }
  );
};
window.addSNode = function() {
  const list = document.getElementById('oel');
  const d = document.createElement('div');
  d.className='oe-node'; d.dataset.id=uid();
  d.style.cssText='border:1.5px solid var(--bd);border-radius:var(--r);padding:.7rem;background:var(--sf2)';
  d.innerHTML=`<div style="font-size:.68rem;color:var(--tx2);margin-bottom:.22rem">Jabatan</div>
    <input class="ej" placeholder="Nama jabatan" style="width:100%;margin-bottom:.35rem;padding:.35rem .55rem;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx);font-size:.76rem">
    <div style="font-size:.68rem;color:var(--tx2);margin-bottom:.22rem">Nama Pejabat</div>
    <input class="en" placeholder="Nama anggota" style="width:100%;padding:.35rem .55rem;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--tx);font-size:.76rem">
    <button onclick="this.closest('.oe-node').remove()" style="margin-top:.35rem;font-size:.66rem;background:var(--er);color:#fff;border:none;padding:.18rem .42rem;border-radius:5px;cursor:pointer">Hapus</button>`;
  list.appendChild(d);
};

// ── KALENDER ───────────────────────────────────────────────────
function expandAg(ag) {
  const ex = [];
  ag.forEach(a => {
    const st = pd(a.tanggal), en = pd(a.tanggal_akhir||a.tanggal);
    if (!st) return;
    const days = Math.round((en-st)/86400000)+1;
    for (let i=0; i<days; i++) {
      const d = new Date(st); d.setDate(d.getDate()+i);
      ex.push({...a, _d:d.toISOString().split('T')[0], _si:i, _st:days});
    }
  });
  return ex;
}

function rKalender(CU, CA) {
  const isA = CU.role==='admin';
  const CY = window._CY !== undefined ? window._CY : (window._CY=new Date().getFullYear());
  const CM = window._CM !== undefined ? window._CM : (window._CM=new Date().getMonth());
  const ag = CA.agenda;
  const today = new Date();
  const tds = today.toISOString().split('T')[0];
  const fD=new Date(CY,CM,1), lD=new Date(CY,CM+1,0);
  const sdow=(fD.getDay()+6)%7;
  const DN=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const ex=expandAg(ag);
  const gev=d2=>ex.filter(a=>a._d===d2);
  const tme=ag.filter(a=>{const d=pd(a.tanggal);return d&&d.getMonth()===CM&&d.getFullYear()===CY;});
  const upc=ag.filter(a=>pd(a.tanggal)>=today);
  let cells=[];
  for(let i=0;i<sdow;i++)cells.push(null);
  for(let d=1;d<=lD.getDate();d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);

  const calH=`<div class="cal-wrap">
    <div class="cal-top">
      <div class="cal-top-row">
        <div><div class="cal-month">${MN[CM]}</div><div class="cal-year">${CY}</div></div>
        <div class="flex" style="gap:.4rem;align-items:center">
          <button class="cal-today-btn" onclick="window.calToday()">Hari Ini</button>
          <button class="cal-nav" onclick="window.calNav(-1)">&#8592;</button>
          <button class="cal-nav" onclick="window.calNav(1)">&#8594;</button>
        </div>
      </div>
      <div class="cal-stats">
        <div class="cal-stat"><strong>${tme.length}</strong>Bulan Ini</div>
        <div class="cal-stat"><strong>${upc.length}</strong>Akan Datang</div>
        <div class="cal-stat"><strong>${ag.length}</strong>Total</div>
      </div>
    </div>
    <div class="cal-body">
      <div class="cal-grid">
        ${DN.map(d=>`<div class="cal-day-name">${d}</div>`).join('')}
        ${cells.map(d => {
          if (!d) return '<div class="cal-day other"></div>';
          const d2=ds(CY,CM,d), isT=d2===tds;
          const evs=gev(d2), sh=evs.slice(0,3), mo=evs.length-3;
          return `<div class="cal-day${isT?' today':''}">
            <div class="cal-date"><div class="cal-date-inner">${d}</div></div>
            ${sh.map(e => {
              const sc=e._st>1?(e._si===0?'ev-start':e._si===e._st-1?'ev-end':'ev-mid'):'';
              return `<div class="cal-event ${sc}" style="background:${e.warna||'#1a56db'}" title="${esc(e.judul)}">${e._si===0?esc(e.judul):' '}</div>`;
            }).join('')}
            ${mo>0?`<div class="cal-more">+${mo} lagi</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;

  const sorted=[...ag].sort((a,b)=>new Date(a.tanggal)-new Date(b.tanggal));
  const grps={};
  sorted.forEach(a=>{
    const d=pd(a.tanggal);if(!d)return;
    const k=d.getFullYear()+'-'+d.getMonth();
    if(!grps[k])grps[k]={label:MN[d.getMonth()]+' '+d.getFullYear(),items:[]};
    grps[k].items.push(a);
  });

  const listH=`<div class="card">
    <div class="card-header"><h3 class="card-title">📋 Daftar Agenda</h3>${isA?'<button class="btn btn-p btn-sm" onclick="window.mAg()">+ Tambah</button>':''}</div>
    ${!sorted.length?'<div class="empty-state"><span class="ic">📆</span><h3>Belum ada agenda</h3></div>':
    '<div class="ag-list">'+Object.values(grps).map(g=>
      `<div class="ag-group"><div class="ag-group-title">${g.label}</div>`+
      g.items.map(a=>{
        const d=pd(a.tanggal), isPast=d&&d<today, isM=a.tanggal_akhir&&a.tanggal_akhir!==a.tanggal, w=a.warna||'#1a56db';
        return `<div class="ag-item">
          <div class="ag-date" style="background:${w}22;color:${w}">
            <div class="ag-day">${d?d.getDate():'?'}</div>
            <div class="ag-mon">${d?MA[d.getMonth()]:''}</div>
          </div>
          <div class="ag-info">
            <div class="ag-title" style="${isPast?'opacity:.5':''}">${esc(a.judul)}</div>
            <div class="ag-meta">${isM?fd(a.tanggal)+' s/d '+fd(a.tanggal_akhir):fd(a.tanggal)}${a.deskripsi?' · '+esc(a.deskripsi):''}</div>
          </div>
          <div class="flex" style="gap:.28rem;align-items:center;flex-shrink:0">
            <div style="width:7px;height:7px;border-radius:50%;background:${w}"></div>
            ${isA?`<button class="btn btn-g btn-xs" data-aid="${a.id}" onclick="window.agEd(this)">✏️</button>
                   <button class="btn btn-g btn-xs" data-aid="${a.id}" onclick="window.agDl(this)">🗑️</button>`:''}
          </div>
        </div>`;
      }).join('')+'</div>'
    ).join('')+'</div>'}
  </div>`;

  return `<div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">📆 Kalender Agenda</h2>
  </div>${calH}${listH}`;
}

window.calNav = function(dir) {
  window._CM = (window._CM !== undefined ? window._CM : new Date().getMonth()) + dir;
  if (window._CM < 0) { window._CM=11; window._CY=(window._CY||new Date().getFullYear())-1; }
  if (window._CM > 11) { window._CM=0;  window._CY=(window._CY||new Date().getFullYear())+1; }
  renderPage(window.currentPage, window.CU, window.CA);
};
window.calToday = function() {
  window._CY=new Date().getFullYear(); window._CM=new Date().getMonth();
  renderPage(window.currentPage, window.CU, window.CA);
};
window.agEd = el => window.mAg(el.getAttribute('data-aid'));
window.agDl = async function(el) {
  if (!confirm('Hapus agenda ini?')) return;
  try { await fbDel('agenda', el.getAttribute('data-aid')); toast('Dihapus','ok'); } catch(e) { toast('Gagal','er'); }
};
window.mAg = function(eid) {
  const a = eid ? window.CA.agenda.find(x=>x.id===eid) : {};
  const sw = COLORS.map(c => `<div class="color-swatch" data-c="${c}" style="background:${c}" onclick="window.swC(this)"></div>`).join('');
  modal((eid?'Edit':'Tambah')+' Agenda',
    `<div class="fg"><label>Judul Agenda</label><input id="agj" placeholder="Nama kegiatan"></div>
     <div class="fg"><label>Tanggal Mulai</label><input id="agt" type="date"></div>
     <div class="fg"><label>Tanggal Selesai <span style="font-size:.68rem;color:var(--tx2)">(opsional, multi-hari)</span></label><input id="agt2" type="date"></div>
     <div class="fg"><label>Keterangan</label><input id="agd" placeholder="Keterangan singkat"></div>
     <div class="fg"><label>Warna</label>
       <div class="color-swatches" id="csw">${sw}
         <input id="agw" type="color" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--bd);cursor:pointer;padding:1px" oninput="window.swCI()">
       </div>
     </div>`,
    () => {
      document.getElementById('agj').value  = a.judul||'';
      document.getElementById('agt').value  = a.tanggal||'';
      document.getElementById('agt2').value = a.tanggal_akhir||'';
      document.getElementById('agd').value  = a.deskripsi||'';
      document.getElementById('agw').value  = a.warna||'#1a56db';
      const cur=document.querySelector(`.color-swatch[data-c="${a.warna||'#1a56db'}"]`);
      if (cur) cur.classList.add('sel');
    },
    async () => {
      const j=document.getElementById('agj').value.trim(), t=document.getElementById('agt').value, t2=document.getElementById('agt2').value;
      if (!j||!t) { toast('Judul dan tanggal wajib','er'); return false; }
      if (t2&&t2<t) { toast('Tanggal selesai tidak boleh sebelum mulai','er'); return false; }
      const data={judul:j,tanggal:t,tanggal_akhir:t2||t,deskripsi:document.getElementById('agd').value.trim(),warna:document.getElementById('agw').value};
      try { eid?await fbUp('agenda',eid,data):await fbAdd('agenda',data); toast('Agenda disimpan!','ok'); return true; }
      catch(e) { toast('Gagal','er'); return false; }
    }
  );
};
window.swC = function(el) {
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('sel'));
  el.classList.add('sel');
  const inp=document.getElementById('agw'); if(inp) inp.value=el.dataset.c;
};
window.swCI = function() {
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('sel'));
};

// ── NOTULEN ────────────────────────────────────────────────────
// FIX: tampilkan semua rapat yang punya catatan, termasuk yang sudah selesai
function rNotulen(CU, CA) {
  const rap = CA.rapats.filter(r => r.catatan && r.catatan.trim().length > 0)
    .sort((a,b) => new Date(b.tanggal)-new Date(a.tanggal));
  return `<h2 class="sec-title">Riwayat Catatan Rapat</h2>
  ${!rap.length ? '<div class="empty-state"><span class="ic">📝</span><h3>Belum ada catatan rapat</h3><p>Catatan akan muncul setelah admin input notulen, termasuk rapat yang sudah selesai.</p></div>' :
  rap.map((r,i) => {
    const hd = CA.absensi.filter(a=>a.rapat_id===r.id);
    return `<div class="card" style="margin-bottom:.82rem">
      <div class="flex items-center justify-between" style="margin-bottom:.55rem;align-items:flex-start">
        <div>
          <div style="display:flex;gap:.4rem;margin-bottom:.25rem;flex-wrap:wrap">
            <span class="badge b-gr">Rapat ke-${rap.length-i}</span>
            ${r.selesai ? '<span class="badge b-ok">✅ Selesai</span>' : '<span class="badge b-pr">Berlangsung</span>'}
          </div>
          <div style="font-weight:600;font-size:.9rem">${esc(r.judul)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:.7rem;color:var(--tx2)">${fd(r.tanggal)}</div>
          <div style="font-size:.7rem;color:var(--tx2)">⏰ ${r.waktu||'-'}</div>
          <button class="btn btn-p btn-xs" style="margin-top:.3rem" onclick="window.ekspor('${r.id}')">📄 Ekspor</button>
        </div>
      </div>
      <div style="font-size:.7rem;color:var(--tx2);margin-bottom:.55rem">
        📍 ${esc(r.tempat||'-')} · ✅ ${hd.length} hadir${hd.length?' ('+hd.map(a=>esc(a.nama)).join(', ')+')':''}
      </div>
      <div class="divider"></div>
      <div style="font-size:.82rem;line-height:1.75;white-space:pre-wrap;color:var(--tx2)">${esc(r.catatan)}</div>
    </div>`;
  }).join('')}`;
}
window.ekspor = function(rid) {
  const r = window.CA.rapats.find(x=>x.id===rid); if(!r) return;
  const hd = window.CA.absensi.filter(a=>a.rapat_id===rid);
  const sep = '='.repeat(50);
  const txt = `NOTULEN RAPAT\nKADANG KANOMAN MANDIRA\nKarang Taruna Desa Wringin Kidul\n${sep}\n\nJudul    : ${r.judul||'-'}\nTanggal  : ${fd(r.tanggal)}\nWaktu    : ${r.waktu||'-'}\nTempat   : ${r.tempat||'-'}\nHadir    : ${hd.length} orang${hd.length?' ('+hd.map(a=>a.nama).join(', ')+')':''}\n\n${sep}\nCATATAN / NOTULEN\n${sep}\n\n${r.catatan||'-'}\n\n${sep}\nDicetak: ${new Date().toLocaleString('id-ID')}`;
  const blob = new Blob([txt],{type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement('a');
  a2.href=url; a2.download='Notulen_'+(r.judul||'rapat').replace(/\s+/g,'_')+'.txt';
  document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
  URL.revokeObjectURL(url);
  toast('Notulen diekspor','ok');
};

// ── KAS ────────────────────────────────────────────────────────
function rKas(CU, CA) {
  const kas = [...CA.kas].sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));
  const ce = CU.role==='admin'||CU.role==='bendahara';
  const tm = kas.filter(k=>k.jenis==='masuk').reduce((s,k)=>s+Number(k.jumlah),0);
  const tk = kas.filter(k=>k.jenis==='keluar').reduce((s,k)=>s+Number(k.jumlah),0);
  return `<div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">💰 Kas Organisasi</h2>
    ${ce?'<button class="btn btn-p btn-sm" onclick="window.mKas()">+ Transaksi</button>':''}
  </div>
  <div class="kas-summary">
    <div class="kas-card kas-in"><div class="kas-val">${fm(tm)}</div><div class="kas-lbl">Total Pemasukan</div></div>
    <div class="kas-card kas-out"><div class="kas-val">${fm(tk)}</div><div class="kas-lbl">Total Pengeluaran</div></div>
    <div class="kas-card kas-bal"><div class="kas-val">${fm(tm-tk)}</div><div class="kas-lbl">Saldo Terkini</div></div>
  </div>
  <div class="card" style="padding:0">
    <div style="padding:.8rem 1rem;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between">
      <h3 class="card-title">Riwayat Transaksi</h3><span style="font-size:.7rem;color:var(--tx2)">${kas.length} transaksi</span>
    </div>
    ${!kas.length?'<div class="empty-state"><span class="ic">💳</span><h3>Belum ada transaksi</h3></div>':`
    <div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Jenis</th><th>Jumlah</th><th>Dicatat</th>${ce?'<th></th>':''}</tr></thead>
      <tbody>${kas.map(k=>`<tr>
        <td style="white-space:nowrap">${fd(k.tanggal)}</td>
        <td>${esc(k.keterangan)}</td>
        <td><span class="badge ${k.jenis==='masuk'?'b-ok':'b-er'}">${k.jenis==='masuk'?'⬆ Masuk':'⬇ Keluar'}</span></td>
        <td style="font-weight:600;white-space:nowrap;color:${k.jenis==='masuk'?'var(--ok)':'var(--er)'}">${fm(k.jumlah)}</td>
        <td style="color:var(--tx2)">${esc(k.dicatat_oleh||'-')}</td>
        ${ce?`<td><button class="btn btn-g btn-xs" data-kid="${k.id}" onclick="window.dlKas(this)">🗑️</button></td>`:''}
      </tr>`).join('')}</tbody>
    </table></div>`}
  </div>`;
}
window.mKas = function() {
  const td = new Date().toISOString().split('T')[0];
  modal('+ Tambah Transaksi Kas',
    `<div class="fg"><label>Tanggal</label><input id="kt" type="date"></div>
     <div class="fg"><label>Keterangan</label><input id="kk" placeholder="Iuran / Pembelian alat / dll"></div>
     <div class="fg"><label>Jenis</label><select id="kj"><option value="masuk">⬆ Pemasukan</option><option value="keluar">⬇ Pengeluaran</option></select></div>
     <div class="fg"><label>Jumlah (Rp)</label><input id="kjm" type="number" placeholder="50000" min="0"></div>`,
    () => { document.getElementById('kt').value=td; },
    async () => {
      const t=document.getElementById('kt').value, k=document.getElementById('kk').value.trim(), jm=document.getElementById('kjm').value;
      if (!t||!k||!jm) { toast('Semua field wajib','er'); return false; }
      try { await fbAdd('kas',{tanggal:t,keterangan:k,jenis:document.getElementById('kj').value,jumlah:Number(jm),dicatat_oleh:window.CU.nama}); toast('Disimpan','ok'); return true; }
      catch(e) { toast('Gagal','er'); return false; }
    }
  );
};
window.dlKas = async function(el) {
  if (!confirm('Hapus transaksi?')) return;
  try { await fbDel('kas',el.getAttribute('data-kid')); toast('Dihapus','ok'); } catch(e) { toast('Gagal','er'); }
};

// ── ARISAN ─────────────────────────────────────────────────────
// ── ARISAN ─────────────────────────────────────────────────────
const WHEEL_COLORS = [
  '#1a56db','#0e9f6e','#e02424','#c27803',
  '#7e3af2','#ff6b35','#0891b2','#be185d',
  '#059669','#dc2626','#7c3aed','#d97706',
  '#0284c7','#db2777','#16a34a','#ea580c'
];
let _spinning = false;
let _spinWinner = null;
let _spinUnsub = null; // Firebase listener for sync

// Draw wheel canvas
function drawWheel(canvas, items, angle, highlightIdx = -1) {
  if (!canvas || !items.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = W/2 - 8;
  const n = items.length;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, W, H);

  // Outer shadow ring
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  items.forEach((item, i) => {
    const startA = angle + i * slice;
    const endA   = startA + slice;
    const color  = WHEEL_COLORS[i % WHEEL_COLORS.length];
    const isHL   = i === highlightIdx;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, isHL ? r + 6 : r, startA, endA);
    ctx.closePath();
    ctx.fillStyle = isHL ? '#fff' : color;
    ctx.fill();
    if (isHL) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startA + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = isHL ? color : '#fff';
    ctx.font = `bold ${n > 14 ? 9 : n > 10 ? 11 : n > 6 ? 12 : 13}px Poppins, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 2;
    let name = item.nama;
    const maxLen = n > 10 ? 11 : 14;
    if (name.length > maxLen) name = name.substr(0, maxLen-1) + '…';
    ctx.fillText(name, r - 10, 4);
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, 2*Math.PI);
  ctx.fillStyle = '#0f2744';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARISAN', cx, cy);
  ctx.textBaseline = 'alphabetic';
}

// ── WHEEL HELPERS ──────────────────────────────────────────────
function normalizeAngle(a) { const t = 2*Math.PI; return ((a % t) + t) % t; }

function getBelumItems() {
  const ar = (window.CA && window.CA.arisan) || [];
  return [...ar.filter(a => !a.menang)].sort((a,b) => a.nama.localeCompare(b.nama));
}

function showSpinResult(winner) {
  _spinWinner = winner;
  const disp = document.getElementById('ar-display');
  if (disp) disp.innerHTML = `
    <div class="ar-disp-icon">🎉</div>
    <div class="ar-disp-title">${esc(winner.nama)}</div>
    <div class="ar-disp-sub">Terpilih sebagai pemenang!</div>`;
  const chip = document.getElementById('chip-' + winner.id);
  if (chip) chip.innerHTML = `🎉 ${esc(winner.nama)}`;
  const actions = document.getElementById('arisan-actions');
  if (actions) actions.style.display = 'block';
}

function animateSpin(canvas, items, startAngle, finalAngle, duration, winnerIdx, onDone) {
  _spinning = true;
  const spinBtn = document.getElementById('spin-btn');
  if (spinBtn) { spinBtn.disabled = true; spinBtn.textContent = '🎡 Memutar...'; }
  const disp = document.getElementById('ar-display');
  if (disp) disp.innerHTML = `
    <div class="ar-disp-icon">🌀</div>
    <div class="ar-disp-title">Memutar roda...</div>
    <div class="ar-disp-sub">Tunggu sebentar</div>`;
  const t0 = performance.now();
  function frame(now) {
    const elapsed = now - t0;
    const p = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const angle = startAngle + (finalAngle - startAngle) * eased;
    drawWheel(canvas, items, angle, p >= 1 ? winnerIdx : -1);
    window._wheelAngle = angle;
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      _spinning = false;
      if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = '🎡 PUTAR RODA'; }
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(frame);
}

// Initialize / (re)draw the wheel canvas with current "belum menang" participants
export function initArisanWheel() {
  const canvas = document.getElementById('arisan-canvas');
  if (!canvas) return;
  const items = getBelumItems();
  if (!items.length) return;
  if (window._wheelAngle === undefined) window._wheelAngle = 0;
  drawWheel(canvas, items, window._wheelAngle);
}

export function rArisan(CU, CA) {
  const canEdit = CU.role === 'admin' || CU.role === 'bendahara';
  window._arisanCanEdit = canEdit;
  const ar = CA.arisan || [];
  const belum = ar.filter(a => !a.menang);
  const menang = ar.filter(a => a.menang).sort((a,b) => new Date(b.tgl_menang||0)-new Date(a.tgl_menang||0));
  const nominal = ar[0]?.nominal || 0;
  const allDone = belum.length === 0 && ar.length > 0;

  return `
  <div class="flex items-center justify-between mb-1">
    <h2 class="sec-title" style="margin:0">🎡 Sistem Arisan</h2>
    ${canEdit ? '<button class="btn btn-o btn-sm" onclick="window.mArisanPeserta()">👤 Kelola Peserta</button>' : ''}
  </div>

  <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
    <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">👥</div><div class="stat-val">${ar.length}</div><div class="stat-label">Total Peserta</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#d1fae5">✅</div><div class="stat-val">${menang.length}</div><div class="stat-label">Sudah Menang</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#fee2e2">⏳</div><div class="stat-val">${belum.length}</div><div class="stat-label">Belum Menang</div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#fef3c7">💰</div><div class="stat-val" style="font-size:.88rem">${fm(nominal)}</div><div class="stat-label">Nominal</div></div>
  </div>

  <div class="card" style="margin-bottom:1rem">
    <div class="card-header">
      <h3 class="card-title">🎡 Roda Arisan</h3>
      ${canEdit
        ? '<span style="font-size:.7rem;color:var(--tx2)">Hanya Admin/Bendahara yang bisa memutar</span>'
        : '<span class="badge b-gr">👀 Live View</span>'}
    </div>

    ${allDone
      ? `<div class="empty-state" style="padding:1.5rem">
          <span class="ic">🎉</span><h3>Semua peserta sudah menang!</h3>
          ${canEdit ? '<button class="btn btn-o btn-sm" style="margin-top:.75rem" onclick="window.resetArisan()">🔄 Reset Putaran Baru</button>' : ''}
        </div>`
      : `<div class="arisan-stage">
          <!-- WHEEL -->
          <div class="arisan-wheel-container">
            <div class="arisan-pointer">▼</div>
            <canvas id="arisan-canvas" width="320" height="320"></canvas>
          </div>

          <!-- PANEL -->
          <div class="arisan-panel">
            <div class="arisan-result-display" id="ar-display">
              <div class="ar-disp-icon">🎡</div>
              <div class="ar-disp-title">Siap Berputar</div>
              <div class="ar-disp-sub">${canEdit ? 'Tekan PUTAR RODA untuk mulai' : 'Menunggu Admin/Bendahara memutar...'}</div>
            </div>

            ${canEdit
              ? `<button class="arisan-spin-btn" id="spin-btn" onclick="window.doSpin()">🎡 PUTAR RODA</button>
                 <div id="arisan-actions" style="display:none;margin-top:.75rem">
                   <div style="font-size:.78rem;color:var(--tx2);margin-bottom:.55rem;text-align:center">Pemenang terpilih:</div>
                   <div class="flex" style="gap:.5rem;justify-content:center;flex-wrap:wrap">
                     <button class="btn btn-ok" onclick="window.ambilArisan()">✅ Ambil Arisan</button>
                     <button class="btn btn-o" onclick="window.kasihLain()">🔄 Kasih ke Orang Lain</button>
                   </div>
                 </div>`
              : `<div id="arisan-actions" style="display:none;margin-top:.75rem">
                   <div style="text-align:center;padding:.65rem;background:#d1fae5;border-radius:var(--r);font-size:.82rem;font-weight:600;color:#065f46">
                     🎉 Menunggu keputusan pemenang...
                   </div>
                 </div>`}

            <div style="margin-top:.9rem">
              <div style="font-size:.7rem;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">Belum Menang (${belum.length})</div>
              <div style="max-height:170px;overflow-y:auto;display:flex;flex-direction:column;gap:.18rem" id="chip-list">
                ${[...belum].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p =>
                  `<div class="arisan-peserta-chip" id="chip-${p.id}">⏳ ${esc(p.nama)}</div>`
                ).join('')}
              </div>
            </div>
          </div>
        </div>`
    }
  </div>

  <!-- DATA TABLE: BUKU ARISAN STYLE -->
  <div class="card" style="padding:0;margin-bottom:1rem">
    <div style="padding:.82rem 1rem;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem">
      <h3 class="card-title">📒 Buku Arisan</h3>
      <div class="flex" style="gap:.35rem;flex-wrap:wrap;align-items:center">
        ${canEdit ? `
          <button class="btn btn-p btn-xs" onclick="window.tambahPertemuan()">+ Pertemuan</button>
          <button class="btn btn-o btn-xs" onclick="window.kelolaPertemuan()">⚙️ Pertemuan</button>` : ''}
        <button class="btn btn-ok btn-xs" onclick="window.exportExcelArisan()">📊 Export Excel</button>
      </div>
    </div>

    ${!ar.length
      ? '<div class="empty-state"><span class="ic">📒</span><h3>Belum ada peserta</h3><p>Tambahkan peserta terlebih dahulu.</p></div>'
      : (() => {
          // Get pertemuan list sorted
          const pertemuan = [...(window._arisanPertemuan||[])].sort((a,b)=>a.ke-b.ke);
          return '<div style="overflow-x:auto"><table class="arisan-book-table">'+
          '<thead><tr>'+
            '<th style="min-width:140px;position:sticky;left:0;background:var(--sf2);z-index:2">Nama Peserta</th>'+
            '<th style="min-width:90px">Nominal</th>'+
            pertemuan.map(pt =>
              `<th style="min-width:80px;text-align:center">
                <div style="font-size:.65rem;font-weight:700">Ke-${pt.ke}</div>
                <div style="font-size:.6rem;color:var(--tx2);font-weight:400">${pt.tgl||''}</div>
              </th>`
            ).join('')+
            '<th style="min-width:80px;text-align:center">Total Bayar</th>'+
            '<th style="min-width:90px;text-align:center">Status</th>'+
            (canEdit ? '<th style="min-width:60px">Aksi</th>' : '')+
          '</tr></thead>'+
          '<tbody>'+
          [...ar].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p => {
            const bayarSet = new Set((p.riwayat_bayar||[]).map(b=>b.pertemuan_ke));
            const totalBayar = bayarSet.size;
            return '<tr>'+
              `<td style="font-weight:500;position:sticky;left:0;background:var(--sf);z-index:1;white-space:nowrap">
                ${p.menang ? '🏆' : '⏳'} ${esc(p.nama)}
              </td>`+
              `<td style="font-size:.75rem;text-align:center">${fm(p.nominal||0)}</td>`+
              pertemuan.map(pt => {
                const sudahBayar = bayarSet.has(pt.ke);
                return `<td style="text-align:center;padding:.4rem">` +
                  (canEdit
                    ? `<label class="pay-toggle" title="${sudahBayar?'Sudah bayar — klik batal':'Belum bayar — klik tandai'}">
                        <input type="checkbox" ${sudahBayar?'checked':''} onchange="window.toggleBayarPt('${p.id}',${pt.ke},this.checked)">
                        <span class="pay-toggle-track"></span>
                       </label>`
                    : sudahBayar
                      ? '<span style="font-size:1.1rem">✅</span>'
                      : '<span style="font-size:1rem;opacity:.25">○</span>'
                  ) + '</td>';
              }).join('')+
              `<td style="text-align:center;font-weight:600;color:var(--ok)">${totalBayar}/${pertemuan.length}</td>`+
              `<td style="text-align:center">${p.menang
                ? '<span class="badge b-ok" style="font-size:.62rem">Menang</span>'
                : '<span class="badge b-pr" style="font-size:.62rem">Belum</span>'}
              </td>`+
              (canEdit ? `<td><div class="flex" style="gap:.2rem">
                ${p.menang
                  ? `<button class="btn btn-o btn-xs" onclick="window.unmenang('${p.id}')">↩️</button>`
                  : `<button class="btn btn-ok btn-xs" onclick="window.manualMenang('${p.id}')">✅</button>`}
                <button class="btn btn-er btn-xs" onclick="window.dlPeserta('${p.id}')">🗑️</button>
              </div></td>` : '')+
            '</tr>';
          }).join('')+
          // Summary row
          '<tr style="background:var(--sf2);font-weight:600">'+
            '<td style="position:sticky;left:0;background:var(--sf2)">TOTAL BAYAR</td>'+
            '<td></td>'+
            pertemuan.map(pt => {
              const cnt = ar.filter(p=>(p.riwayat_bayar||[]).some(b=>b.pertemuan_ke===pt.ke)).length;
              const total = cnt * (ar[0]?.nominal||0);
              return `<td style="text-align:center;font-size:.72rem">
                <div>${cnt}/${ar.length} org</div>
                <div style="color:var(--ok)">${fm(total)}</div>
              </td>`;
            }).join('')+
            `<td style="text-align:center;color:var(--ok)">${
              ar.reduce((s,p)=>s+new Set((p.riwayat_bayar||[]).map(b=>b.pertemuan_ke)).size,0)
            }x total</td>`+
            '<td></td>'+
            (canEdit ? '<td></td>' : '')+
          '</tr>'+
          '</tbody></table></div>';
        })()
    }
  </div>`;
}

// ── PERTEMUAN ARISAN ──────────────────────────────────────────
// Load pertemuan from Firebase arisan_meta
window._arisanPertemuan = [];
window.loadArisanPertemuan = async function() {
  try {
    const { fbGet } = await import('./firebase.js');
    const list = await fbGet('arisan_pertemuan');
    window._arisanPertemuan = list.sort((a,b)=>a.ke-b.ke);
  } catch(e) { console.error('loadPertemuan error:',e); window._arisanPertemuan = []; }
};

window.tambahPertemuan = async function() {
  const existing = window._arisanPertemuan||[];
  const nextKe = (existing.length ? Math.max(...existing.map(p=>p.ke)) : 0) + 1;
  const tgl = new Date().toISOString().split('T')[0];
  modal(`Tambah Pertemuan Ke-${nextKe}`,
    `<div class="fg"><label>Tanggal Pertemuan</label><input id="pt-tgl" type="date" value="${tgl}"></div>
     <div class="fg"><label>Keterangan (opsional)</label><input id="pt-ket" placeholder="Pertemuan rutin bulan ini..."></div>`,
    null,
    async () => {
      const t = document.getElementById('pt-tgl').value;
      const k = document.getElementById('pt-ket').value.trim();
      if (!t) { toast('Tanggal wajib diisi','er'); return false; }
      try {
        const { fbAdd } = await import('./firebase.js');
        const newId = await fbAdd('arisan_pertemuan', { ke:nextKe, tgl:t, ket:k });
        window._arisanPertemuan.push({ id:newId, ke:nextKe, tgl:t, ket:k });
        toast(`Pertemuan ke-${nextKe} ditambahkan!`,'ok');
        return true;
      } catch(e) { toast('Gagal','er'); return false; }
    }
  );
};

window.kelolaPertemuan = function() {
  const pt = window._arisanPertemuan||[];
  const rows = pt.length
    ? pt.map(p => `
        <div class="flex items-center justify-between" style="padding:.35rem .55rem;border-radius:6px;background:var(--sf2);margin-bottom:.25rem">
          <div>
            <span style="font-weight:600;font-size:.82rem">Pertemuan ke-${p.ke}</span>
            <span style="font-size:.75rem;color:var(--tx2);margin-left:.4rem">${fd(p.tgl)}</span>
            ${p.ket?`<div style="font-size:.7rem;color:var(--tx2)">${esc(p.ket)}</div>`:''}
          </div>
          <button class="btn btn-er btn-xs" onclick="window.hapusPertemuan('${p.id}',${p.ke},this)">🗑️</button>
        </div>`).join('')
    : '<div style="text-align:center;font-size:.82rem;color:var(--tx2);padding:.75rem">Belum ada pertemuan</div>';

  modal('⚙️ Kelola Pertemuan',
    `<p style="font-size:.75rem;color:var(--tx2);margin-bottom:.75rem">Daftar pertemuan arisan. Hapus pertemuan juga menghapus data bayar terkait.</p>
     <div style="max-height:300px;overflow-y:auto">${rows}</div>`,
    null, async () => true
  );
};

window.hapusPertemuan = async function(id, ke, btn) {
  if (!confirm(`Hapus pertemuan ke-${ke}? Data bayar di pertemuan ini juga akan dihapus.`)) return;
  try {
    const { fbDel, fbUp } = await import('./firebase.js');
    await fbDel('arisan_pertemuan', id);
    // Remove from all peserta riwayat_bayar
    for (const p of window.CA.arisan||[]) {
      const rw = (p.riwayat_bayar||[]).filter(b=>b.pertemuan_ke!==ke);
      if (rw.length !== (p.riwayat_bayar||[]).length) {
        await fbUp('arisan', p.id, { riwayat_bayar: rw });
      }
    }
    window._arisanPertemuan = window._arisanPertemuan.filter(p=>p.ke!==ke);
    btn.closest('div').remove();
    toast(`Pertemuan ke-${ke} dihapus`,'ok');
  } catch(e) { toast('Gagal','er'); }
};

window.toggleBayarPt = async function(pid, pertemuan_ke, checked) {
  const p = (window.CA.arisan||[]).find(x=>x.id===pid);
  if (!p) return;
  let riwayat = [...(p.riwayat_bayar||[])];
  if (checked) {
    if (riwayat.some(b=>b.pertemuan_ke===pertemuan_ke)) return;
    const pt = (window._arisanPertemuan||[]).find(x=>x.ke===pertemuan_ke);
    riwayat.push({ pertemuan_ke, tgl:pt?.tgl||new Date().toISOString().split('T')[0], nominal:p.nominal||0, dicatat:new Date().toISOString() });
    toast(`${p.nama} ✅ bayar pertemuan ke-${pertemuan_ke}`,'ok');
  } else {
    riwayat = riwayat.filter(b=>b.pertemuan_ke!==pertemuan_ke);
    toast(`${p.nama} — bayar pertemuan ke-${pertemuan_ke} dibatalkan`,'inf');
  }
  try {
    const { fbUp } = await import('./firebase.js');
    await fbUp('arisan', pid, { riwayat_bayar: riwayat });
  } catch(e) { toast('Gagal','er'); }
};

// ── EXPORT EXCEL ──────────────────────────────────────────────
window.exportExcelArisan = function() {
  const ar = window.CA.arisan||[];
  if (!ar.length) { toast('Belum ada data','inf'); return; }
  if (typeof XLSX !== 'undefined') { _buildExcel(ar); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = () => _buildExcel(ar);
  s.onerror = () => toast('Gagal load library Excel','er');
  document.head.appendChild(s);
};

function _buildExcel(ar) {
  const pt = [...(window._arisanPertemuan||[])].sort((a,b)=>a.ke-b.ke);
  const sorted = [...ar].sort((a,b)=>a.nama.localeCompare(b.nama));
  const today = new Date().toISOString().split('T')[0];

  // ── SHEET 1: Buku Arisan (mirip foto) ──
  const header1 = ['No','Nama Peserta','Nominal (Rp)', ...pt.map(p=>`Ke-${p.ke}\n${p.tgl||''}`), 'Total Bayar','Status','Tgl Menang'];
  const sheet1 = [
    ['BUKU ARISAN - KADANG KANOMAN MANDIRA'],
    [`Dicetak: ${new Date().toLocaleString('id-ID')}`],
    [],
    header1
  ];
  sorted.forEach((p,i) => {
    const bayarSet = new Set((p.riwayat_bayar||[]).map(b=>b.pertemuan_ke));
    sheet1.push([
      i+1, p.nama, p.nominal||0,
      ...pt.map(x => bayarSet.has(x.ke) ? '✓' : ''),
      `${bayarSet.size}/${pt.length}`,
      p.menang ? 'Menang' : 'Belum',
      p.tgl_menang||'-'
    ]);
  });
  // Total row
  sheet1.push([]);
  sheet1.push(['','TOTAL BAYAR PER PERTEMUAN','',
    ...pt.map(x => {
      const cnt = ar.filter(p=>(p.riwayat_bayar||[]).some(b=>b.pertemuan_ke===x.ke)).length;
      return `${cnt} org\n${fm(cnt*(ar[0]?.nominal||0))}`;
    }),
    '','',''
  ]);

  // ── SHEET 2: Riwayat Detail ──
  const sheet2 = [
    ['RIWAYAT DETAIL PEMBAYARAN'],
    [],
    ['Nama','Pertemuan Ke','Tanggal','Nominal (Rp)','Dicatat']
  ];
  sorted.forEach(p => {
    [...(p.riwayat_bayar||[])].sort((a,b)=>a.pertemuan_ke-b.pertemuan_ke).forEach(b => {
      sheet2.push([p.nama, b.pertemuan_ke, b.tgl, b.nominal||p.nominal||0, b.dicatat ? new Date(b.dicatat).toLocaleString('id-ID') : '-']);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1);
  ws1['!cols'] = [{wch:5},{wch:25},{wch:14},...pt.map(()=>({wch:10})),{wch:12},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Buku Arisan');
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
  ws2['!cols'] = [{wch:25},{wch:14},{wch:13},{wch:15},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Riwayat Detail');

  XLSX.writeFile(wb, `Arisan_KKM_${today}.xlsx`);
  toast('File Excel berhasil didownload! 📊','ok');
}

// ── OTHER ARISAN FUNCTIONS ────────────────────────────────────
window.doSpin = async function() {
  if (_spinning) return;
  const items = getBelumItems();
  if (!items.length) { toast('Tidak ada peserta yang bisa diputar','er'); return; }
  const canvas = document.getElementById('arisan-canvas');
  if (!canvas) return;

  const slice = (2 * Math.PI) / items.length;
  const winnerIdx = Math.floor(Math.random() * items.length);
  const winner = items[winnerIdx];

  const startAngle = window._wheelAngle || 0;
  const curMod = normalizeAngle(startAngle);
  const targetMod = normalizeAngle(-Math.PI/2 - (winnerIdx * slice + slice/2));
  let delta = targetMod - curMod;
  if (delta < 0) delta += 2 * Math.PI;
  const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 putaran penuh
  const finalAngle = startAngle + extraSpins * 2 * Math.PI + delta;
  const duration = 3500;
  const ts = Date.now();

  // Sync ke semua viewer (real-time)
  try {
    const { fbSet } = await import('./firebase.js');
    await fbSet('meta', 'spin_state', { status:'spinning', winnerId:winner.id, winnerIdx, startAngle, finalAngle, duration, ts });
  } catch(e) { console.error('Gagal sync spin_state:', e); }

  animateSpin(canvas, items, startAngle, finalAngle, duration, winnerIdx, async () => {
    showSpinResult(winner);
    try {
      const { fbSet } = await import('./firebase.js');
      await fbSet('meta', 'spin_state', { status:'done', winnerId:winner.id, winnerIdx, startAngle, finalAngle, duration, ts });
    } catch(e) { console.error('Gagal sync spin_state done:', e); }
  });
};

window.ambilArisan = async function() {
  if (!_spinWinner) return;
  if (!confirm(`Tandai ${_spinWinner.nama} sebagai pemenang arisan kali ini?`)) return;
  try {
    const { fbUp, fbSet } = await import('./firebase.js');
    await fbUp('arisan', _spinWinner.id, { menang:true, tgl_menang:new Date().toISOString().split('T')[0] });
    await fbSet('meta', 'spin_state', { status:'idle', winnerId:null, ts:Date.now() });
    toast(`${_spinWinner.nama} ditandai sebagai pemenang! 🎉`, 'ok');
    _spinWinner = null;
    const actions = document.getElementById('arisan-actions');
    if (actions) actions.style.display = 'none';
  } catch(e) { toast('Gagal menyimpan pemenang', 'er'); }
};

window.kasihLain = async function() {
  if (!confirm('Putar ulang untuk memilih peserta lain?')) return;
  _spinWinner = null;
  const actions = document.getElementById('arisan-actions');
  if (actions) actions.style.display = 'none';
  const disp = document.getElementById('ar-display');
  if (disp) disp.innerHTML = `
    <div class="ar-disp-icon">🎡</div>
    <div class="ar-disp-title">Siap Berputar</div>
    <div class="ar-disp-sub">Tekan PUTAR RODA untuk mulai</div>`;
  window.doSpin();
};

// Dipanggil dashboard.html saat ada update real-time dari Firestore meta/spin_state,
// untuk menampilkan animasi spin yang sama di sisi viewer (non-admin/bendahara).
window._handleSpinStateViewer = function(state) {
  if (!state) return;
  if (state.status === 'spinning') {
    if (window._lastSpinTs === state.ts) return; // sudah pernah diproses
    window._lastSpinTs = state.ts;
    const canvas = document.getElementById('arisan-canvas');
    if (!canvas) return;
    const items = getBelumItems();
    if (state.winnerIdx == null || state.winnerIdx >= items.length) return;
    animateSpin(canvas, items, state.startAngle, state.finalAngle, state.duration, state.winnerIdx, () => {
      showSpinResult(items[state.winnerIdx]);
    });
  } else if (state.status === 'idle') {
    window._lastSpinTs = null;
  }
};

window.manualMenang = async function(id) {
  const p = (window.CA.arisan||[]).find(x=>x.id===id);
  if (!p || !confirm(`Tandai ${p.nama} sebagai pemenang?`)) return;
  try { const { fbUp } = await import('./firebase.js'); await fbUp('arisan',id,{menang:true,tgl_menang:new Date().toISOString().split('T')[0]}); toast('Berhasil','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.unmenang = async function(id) {
  const p = (window.CA.arisan||[]).find(x=>x.id===id);
  if (!p || !confirm(`Batalkan kemenangan ${p.nama}?`)) return;
  try { const { fbUp } = await import('./firebase.js'); await fbUp('arisan',id,{menang:false,tgl_menang:null}); toast('Dibatalkan','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.dlPeserta = async function(id) {
  if (!confirm('Hapus peserta ini?')) return;
  try { const { fbDel } = await import('./firebase.js'); await fbDel('arisan',id); toast('Dihapus','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.resetArisan = async function() {
  if (!confirm('Reset semua peserta ke Belum Menang?')) return;
  try {
    const { fbUp, fbSet } = await import('./firebase.js');
    for (const a of window.CA.arisan||[]) await fbUp('arisan',a.id,{menang:false,tgl_menang:null});
    await fbSet('meta','spin_state',{status:'idle',winner_id:null,ts:Date.now()});
    window._wheelAngle = 0;
    toast('Putaran baru dimulai!','ok');
  } catch(e) { toast('Gagal','er'); }
};
window.mArisanPeserta = function() {
  const ar = window.CA.arisan || [];
  const nominal = ar[0]?.nominal || 0;
  modal('👤 Kelola Peserta Arisan',
    `<div class="fg"><label>Nominal Arisan (Rp)</label>
       <input id="ar-nom" type="number" placeholder="100000" value="${nominal}" min="0"></div>
     <div class="fg"><label>Tambah Peserta</label>
       <div class="flex" style="gap:.4rem">
         <input id="ar-nama" placeholder="Nama peserta" style="flex:1;padding:.58rem .82rem;border:1.5px solid var(--bd);border-radius:var(--r);background:var(--sf);color:var(--tx);font-size:.875rem">
         <button class="btn btn-p btn-sm" onclick="window.addPeserta()">+ Tambah</button>
       </div>
     </div>
     <div style="font-size:.76rem;color:var(--tx2);margin-bottom:.4rem">Peserta terdaftar (${ar.length})</div>
     <div id="peserta-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--bd);border-radius:var(--r);padding:.45rem">
       ${!ar.length
         ? '<div style="font-size:.8rem;color:var(--tx2);text-align:center;padding:.5rem">Belum ada peserta</div>'
         : [...ar].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p =>
             `<div class="flex items-center justify-between" style="padding:.28rem .5rem;border-radius:6px;margin-bottom:2px;background:var(--sf2)">
               <span style="font-size:.8rem">${esc(p.nama)} ${p.menang?'✅':''}</span>
               <button class="btn btn-er btn-xs" onclick="window.dlPesertaInline('${p.id}',this)">✕</button>
             </div>`
           ).join('')}
     </div>
     <button class="btn btn-o btn-xs" style="margin-top:.5rem" onclick="window.importDariAnggota()">⬇️ Import dari Data Anggota</button>`,
    null,
    async () => { toast('Selesai','ok'); return true; }
  );
};
window.addPeserta = async function() {
  const nama = document.getElementById('ar-nama')?.value.trim();
  const nom = Number(document.getElementById('ar-nom')?.value)||0;
  if (!nama) { toast('Nama wajib diisi','er'); return; }
  try {
    const { fbAdd, fbUp } = await import('./firebase.js');
    const id = await fbAdd('arisan',{nama,nominal:nom,menang:false,tgl_menang:null,riwayat_bayar:[]});
    for (const a of window.CA.arisan||[]) if(a.nominal!==nom) await fbUp('arisan',a.id,{nominal:nom});
    const list = document.getElementById('peserta-list');
    if (list) {
      const div = document.createElement('div');
      div.className='flex items-center justify-between';
      div.style.cssText='padding:.28rem .5rem;border-radius:6px;margin-bottom:2px;background:var(--sf2)';
      div.innerHTML=`<span style="font-size:.8rem">${esc(nama)}</span><button class="btn btn-er btn-xs" onclick="window.dlPesertaInline('${id}',this)">✕</button>`;
      list.appendChild(div);
    }
    document.getElementById('ar-nama').value='';
    toast(nama+' ditambahkan!','ok');
  } catch(e) { toast('Gagal','er'); }
};
window.dlPesertaInline = async function(id, btn) {
  try { const { fbDel } = await import('./firebase.js'); await fbDel('arisan',id); btn.closest('div').remove(); toast('Dihapus','ok'); }
  catch(e) { toast('Gagal','er'); }
};
window.importDariAnggota = async function() {
  const existing = (window.CA.arisan||[]).map(a=>a.nama.toLowerCase());
  const nom = Number(document.getElementById('ar-nom')?.value)||0;
  const toAdd = (window.CA.users||[]).filter(u=>!existing.includes(u.nama.toLowerCase()));
  if (!toAdd.length) { toast('Semua anggota sudah terdaftar','inf'); return; }
  if (!confirm(`Import ${toAdd.length} anggota?`)) return;
  try {
    const { fbAdd } = await import('./firebase.js');
    for (const u of toAdd) await fbAdd('arisan',{nama:u.nama,nominal:nom,menang:false,tgl_menang:null,riwayat_bayar:[]});
    toast(`${toAdd.length} anggota diimport!`,'ok');
    document.querySelector('.mo')?.remove();
  } catch(e) { toast('Gagal','er'); }
};