/* ════════════════════════════════════════════════════════
   E-Vote OSIS — SMK SMTI Padang
   app.js — Semua logika aplikasi
   ════════════════════════════════════════════════════════ */

// ── FIREBASE CONFIG ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCEU5qh0VOJZXDPm9nFXjlQwFhsQrguQ14",
  authDomain:        "e-vote-11a75.firebaseapp.com",
  projectId:         "e-vote-11a75",
  storageBucket:     "e-vote-11a75.firebasestorage.app",
  messagingSenderId: "919994282732",
  appId:             "1:919994282732:web:99057c929600d693d82bc9",
  measurementId:     "G-SDV9Y4KNMN"
};

// Firebase menggunakan CDN (bukan ES Module)
const fbApp  = firebase.initializeApp(firebaseConfig);
const db_fs  = fbApp.firestore();
const docRef = db_fs.doc("evote/data");

// ── DATA DEFAULT ──────────────────────────────────────────────────────────────
const DP = [
  {
    id: 1,
    ketua: "Rizky Pratama",      ketua_kelas: "XI KI 2", ketua_photo: "",
    wakil: "Sari Indah Lestari", wakil_kelas: "XI TK 1", wakil_photo: "",
    visi: "Mewujudkan OSIS yang aktif, kreatif, dan berprestasi tinggi untuk SMK SMTI Padang",
    misi: "1. Meningkatkan kualitas kegiatan ekstrakurikuler\n2. Mempererat hubungan antar kelas dan angkatan\n3. Mendorong prestasi akademik dan non-akademik siswa",
    color: "#0d2b5e"
  },
  {
    id: 2,
    ketua: "Muhammad Fauzi", ketua_kelas: "XI KA 1", ketua_photo: "",
    wakil: "Nurul Hidayah",  wakil_kelas: "XII KI 1", wakil_photo: "",
    visi: "SMTI Padang maju bersama — solid, inovatif, dan bersatu dalam satu visi",
    misi: "1. Memperkuat komunikasi antara OSIS dan seluruh siswa\n2. Program beasiswa dan penghargaan berprestasi\n3. Inovasi digital untuk mendukung kegiatan sekolah",
    color: "#1a6b3a"
  },
  {
    id: 3,
    ketua: "Dani Saputra",     ketua_kelas: "XI TK 2", ketua_photo: "",
    wakil: "Fitri Handayani",  wakil_kelas: "X KI 1",  wakil_photo: "",
    visi: "Generasi SMTI berkarakter kuat, berbudaya luhur, dan berdaya saing tinggi",
    misi: "1. Mengembangkan budaya disiplin dan tanggung jawab\n2. Kegiatan sosial dan bakti lingkungan sekolah\n3. Membangun kolaborasi produktif dengan alumni SMTI",
    color: "#6b1a0d"
  }
];

const DV = [
  { nis: "001", name: "Budi Santoso",      kelas: "XII KI 1", pass: "budi123"   },
  { nis: "002", name: "Dewi Rahmawati",    kelas: "XII KI 1", pass: "dewi123"   },
  { nis: "003", name: "Ahmad Firdaus",     kelas: "XII TK 2", pass: "ahmad123"  },
  { nis: "004", name: "Maya Sari",         kelas: "XII KA 2", pass: "maya123"   },
  { nis: "005", name: "Rendi Kurniawan",   kelas: "XI KA 1",  pass: "rendi123"  },
  { nis: "006", name: "Putri Anggraini",   kelas: "X TK 1",   pass: "putri123"  },
  { nis: "007", name: "Hendra Wijaya",     kelas: "X KI 1",   pass: "hendra123" },
  { nis: "008", name: "Lina Marlina",      kelas: "XI KI 2",  pass: "lina123"   }
];

const defaultData = {
  paslon:  DP,
  voters:  DV,
  votes:   {},
  admins:  [{ username: "admin", pass: "admin123", role: "superadmin" }]
};

// ── FIREBASE HELPERS ──────────────────────────────────────────────────────────
async function getDB() {
  try {
    const snap = await docRef.get();
    if (snap.exists) {
      const d = snap.data();
      // migrasi: adminPass lama → admins baru
      if (!d.admins) {
        d.admins = [{ username: "admin", pass: d.adminPass || "admin123", role: "superadmin" }];
        delete d.adminPass;
        await docRef.set(d);
      }
      // migrasi: nisn → nis
      if (d.voters && d.voters[0] && d.voters[0].nisn !== undefined && d.voters[0].nis === undefined) {
        d.voters = d.voters.map(v => ({ ...v, nis: v.nisn || "" }));
        await docRef.set(d);
      }
      return d;
    } else {
      await docRef.set(defaultData);
      return JSON.parse(JSON.stringify(defaultData));
    }
  } catch (e) {
    console.error("getDB error:", e);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

async function saveDB(d) {
  try { await docRef.set(d); }
  catch (e) { console.error("saveDB error:", e); alert("Gagal menyimpan ke database. Periksa koneksi internet."); }
}

// ── STATE GLOBAL ──────────────────────────────────────────────────────────────
let CU     = null;   // voter yang sedang login
let SP     = null;   // id paslon yang dipilih
let CAdmin = null;   // admin yang sedang login
let _resetPwTarget = null;

// ── COPYRIGHT OTOMATIS ────────────────────────────────────────────────────────
function setCopyrightYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll('.copyright-year').forEach(el => {
    el.textContent = year;
  });
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
window.showPage = function (id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
};

window.closeModal     = id => document.getElementById(id).classList.remove('open');
window.closeDropdowns = ()  => document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));

window.toggleDropdown = function (id) {
  const dd = document.getElementById(id);
  document.querySelectorAll('.dropdown').forEach(d => { if (d.id !== id) d.classList.remove('open'); });
  dd.classList.toggle('open');
};

document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-menu')) window.closeDropdowns();
});

// Render foto (img atau placeholder)
function pEl(src, sz) {
  return src && src.length > 10
    ? `<img src="${src}" class="photo-circle" style="width:${sz}px;height:${sz}px"/>`
    : `<div class="photo-placeholder" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .34)}px">👤</div>`;
}

function sanitize(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Enter key navigation
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const nxt = e.target.dataset.next;
  if (nxt) {
    e.preventDefault();
    const n = document.getElementById(nxt);
    if (n) { if (n.tagName === 'BUTTON') n.click(); else n.focus(); }
  }
});

// ── LOGIN SISWA ───────────────────────────────────────────────────────────────
window.doLogin = async function () {
  const btn = document.getElementById('btn-login');
  btn.textContent = "Memuat...";
  btn.disabled = true;

  const u  = document.getElementById('l-user').value.trim();
  const p  = document.getElementById('l-pass').value.trim();
  const al = document.getElementById('login-alert');
  al.style.display = 'none';

  const db    = await getDB();
  const voter = db.voters.find(v => v.name.toLowerCase() === u.toLowerCase() && v.pass === p);

  btn.textContent = "Masuk →";
  btn.disabled = false;

  if (!voter) {
    al.textContent = 'Nama atau password salah. Silakan coba lagi.';
    al.style.display = 'block';
    return;
  }

  CU = voter;
  const voted = db.votes[voter.nis];

  if (voted) {
    const pl = db.paslon.find(pp => pp.id === voted.paslonId);
    renderVotedPage(pl, voted.time);
    showPage('page-voted');
  } else {
    document.getElementById('v-name').textContent    = voter.name;
    document.getElementById('v-class').textContent   = voter.kelas + ' — NIS: ' + voter.nis;
    document.getElementById('v-initials').textContent = voter.name.split(' ').map(w => w[0]).slice(0, 2).join('');
    renderPaslonCards(db.paslon);
    showPage('page-vote');
  }
};

// ── LOGIN ADMIN ───────────────────────────────────────────────────────────────
window.doAdminLogin = async function () {
  const u  = document.getElementById('a-user').value.trim();
  const p  = document.getElementById('a-pass').value.trim();
  const al = document.getElementById('adm-alert');
  al.style.display = 'none';

  const db  = await getDB();
  const adm = db.admins.find(a => a.username === u && a.pass === p);

  if (!adm) {
    al.textContent = 'Username atau password admin salah.';
    al.style.display = 'block';
    return;
  }

  CAdmin = adm;
  document.getElementById('admin-username-label').textContent =
    adm.username + ' (' + (adm.role === 'superadmin' ? 'Superadmin' : 'Admin') + ')';

  document.getElementById('tab-superadmin').style.display =
    adm.role === 'superadmin' ? '' : 'none';

  await renderAdmin();
  showPage('page-admin');
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
window.doLogout = function () {
  CU = null; SP = null; CAdmin = null;
  ['l-user', 'l-pass', 'a-user', 'a-pass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('login-alert').style.display = 'none';
  document.getElementById('adm-alert').style.display   = 'none';
  showPage('page-login');
};

// ── RENDER KARTU PASLON ───────────────────────────────────────────────────────
function renderPaslonCards(paslons) {
  document.getElementById('paslon-grid').innerHTML = paslons.map(pl => `
    <div class="paslon-card" id="pc-${pl.id}" onclick="window.selectPaslon(${pl.id})">
      <div class="paslon-header" style="background:${pl.color}">
        <div class="paslon-nomor">${pl.id}</div>
        <div class="paslon-header-title">Pasangan Calon Nomor ${pl.id}</div>
      </div>
      <div class="paslon-body">
        <div class="paslon-photos">
          <div class="photo-wrap">
            ${pEl(pl.ketua_photo, 82)}
            <div class="photo-role">Ketua</div>
          </div>
          <div class="photo-wrap">
            ${pEl(pl.wakil_photo, 82)}
            <div class="photo-role">Wakil</div>
          </div>
        </div>
        <div class="paslon-info">
          <div style="margin-bottom:8px">
            <div class="paslon-name-item">${sanitize(pl.ketua)} <span>(${sanitize(pl.ketua_kelas)})</span></div>
            <div class="paslon-name-item">${sanitize(pl.wakil)} <span>(${sanitize(pl.wakil_kelas)})</span></div>
          </div>
          <div class="paslon-visi">"${sanitize(pl.visi)}"</div>
          <div class="paslon-misi">${sanitize(pl.misi)}</div>
          <div class="check-indicator" style="background:${pl.color}">✓ &nbsp;Dipilih</div>
        </div>
      </div>
    </div>`).join('');
}

window.selectPaslon = async function (id) {
  SP = id;
  document.querySelectorAll('.paslon-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('pc-' + id).classList.add('selected');
  const db = await getDB();
  const pl = db.paslon.find(p => p.id === id);
  const btn = document.getElementById('btn-vote');
  btn.textContent = `✓ Kirim Suara untuk Paslon ${id}: ${pl.ketua} & ${pl.wakil}`;
  btn.disabled = false;
};

window.openConfirm = async function () {
  if (!SP) return;
  const db = await getDB();
  const pl = db.paslon.find(p => p.id === SP);
  document.getElementById('modal-paslon-name').textContent = `Paslon ${pl.id}: ${pl.ketua} & ${pl.wakil}`;
  document.getElementById('modal-confirm').classList.add('open');
};

window.submitVote = async function () {
  closeModal('modal-confirm');
  const db = await getDB();
  if (db.votes[CU.nis]) return;
  db.votes[CU.nis] = { paslonId: SP, time: new Date().toLocaleString('id-ID') };
  await saveDB(db);
  const pl = db.paslon.find(p => p.id === SP);
  renderVotedPage(pl, db.votes[CU.nis].time);
  showPage('page-voted');
};

function renderVotedPage(pl, time) {
  document.getElementById('voted-nomor').textContent = pl.id;
  document.getElementById('voted-names').textContent = pl.ketua + ' & ' + pl.wakil;
  document.getElementById('voted-time').textContent  = 'Waktu: ' + time;
  document.getElementById('voted-photos').innerHTML  =
    `<div style="text-align:center">${pEl(pl.ketua_photo, 64)}<div style="font-size:10px;color:#64748b;margin-top:5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Ketua</div></div>` +
    `<div style="text-align:center">${pEl(pl.wakil_photo, 64)}<div style="font-size:10px;color:#64748b;margin-top:5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Wakil</div></div>`;
}

// ── TAB ADMIN ─────────────────────────────────────────────────────────────────
window.switchTab = async function (id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  if (id === 't-result')     await renderAdminResult();
  if (id === 't-paslon')     await renderPaslonEdit();
  if (id === 't-voters')     await renderVotersTable();
  if (id === 't-akun')       await renderAkunTable();
  if (id === 't-superadmin') await renderAdminsTable();
};

async function renderAdmin() { await renderAdminResult(); await renderPaslonEdit(); }

// ── HASIL VOTING ──────────────────────────────────────────────────────────────
async function renderAdminResult() {
  const db  = await getDB();
  const tv  = db.voters.length;
  const ts  = Object.keys(db.votes).length;
  const pct = tv ? Math.round(ts / tv * 100) : 0;

  document.getElementById('adm-stats').innerHTML =
    `<div class="stat-card"><div class="stat-val">${tv}</div><div class="stat-lbl">Total Pemilih</div></div>` +
    `<div class="stat-card"><div class="stat-val">${ts}</div><div class="stat-lbl">Sudah Memilih</div></div>` +
    `<div class="stat-card"><div class="stat-val">${pct}%</div><div class="stat-lbl">Partisipasi</div></div>`;

  const cnt = {};
  db.paslon.forEach(p => cnt[p.id] = 0);
  Object.values(db.votes).forEach(v => { if (cnt[v.paslonId] !== undefined) cnt[v.paslonId]++; });

  document.getElementById('adm-bars').innerHTML = db.paslon.map(pl => {
    const v = cnt[pl.id];
    const p = ts ? Math.round(v / ts * 100) : 0;
    return `<div class="bar-wrap">
      <div class="bar-label">
        <span><strong>Paslon ${pl.id}:</strong> ${sanitize(pl.ketua)} &amp; ${sanitize(pl.wakil)}</span>
        <span style="font-weight:700">${v} suara (${p}%)</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${p}%;background:${pl.color}">${p > 12 ? p + '%' : ''}</div>
      </div>
    </div>`;
  }).join('');
}

// ── EDIT PASLON & FOTO ────────────────────────────────────────────────────────
async function renderPaslonEdit() {
  const db = await getDB();
  document.getElementById('paslon-edit-area').innerHTML = db.paslon.map(pl => `
    <div class="paslon-edit-card">
      <div class="paslon-edit-header">
        <div class="paslon-edit-num" style="background:${pl.color}">${pl.id}</div>
        <span style="font-size:15px;font-weight:700;color:var(--slate-900)">Pasangan Calon ${pl.id}</span>
      </div>
      <div class="two-col" style="margin-bottom:18px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--slate-500);margin-bottom:10px;text-transform:uppercase;letter-spacing:.07em">Calon Ketua</div>
          <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:14px">
            <div class="photo-upload-circle" onclick="document.getElementById('ph-${pl.id}-ketua').click()" title="Klik untuk upload foto">
              ${pl.ketua_photo ? `<img src="${pl.ketua_photo}"/>` : '<span>📷</span>'}
              <div class="photo-upload-overlay">✏️</div>
            </div>
            <div style="font-size:11px;color:var(--slate-500);margin-top:6px;text-align:center">Klik untuk upload foto</div>
            <input type="file" id="ph-${pl.id}-ketua" accept="image/*" style="display:none" onchange="window.handlePhoto(this,${pl.id},'ketua')"/>
          </div>
          <div class="fg" style="margin-bottom:8px"><label>Nama Ketua</label><input id="ed-${pl.id}-kname" value="${sanitize(pl.ketua)}"/></div>
          <div class="fg" style="margin:0"><label>Kelas</label><input id="ed-${pl.id}-kkelas" value="${sanitize(pl.ketua_kelas)}"/></div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--slate-500);margin-bottom:10px;text-transform:uppercase;letter-spacing:.07em">Calon Wakil Ketua</div>
          <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:14px">
            <div class="photo-upload-circle" onclick="document.getElementById('ph-${pl.id}-wakil').click()" title="Klik untuk upload foto">
              ${pl.wakil_photo ? `<img src="${pl.wakil_photo}"/>` : '<span>📷</span>'}
              <div class="photo-upload-overlay">✏️</div>
            </div>
            <div style="font-size:11px;color:var(--slate-500);margin-top:6px;text-align:center">Klik untuk upload foto</div>
            <input type="file" id="ph-${pl.id}-wakil" accept="image/*" style="display:none" onchange="window.handlePhoto(this,${pl.id},'wakil')"/>
          </div>
          <div class="fg" style="margin-bottom:8px"><label>Nama Wakil</label><input id="ed-${pl.id}-wname" value="${sanitize(pl.wakil)}"/></div>
          <div class="fg" style="margin:0"><label>Kelas</label><input id="ed-${pl.id}-wkelas" value="${sanitize(pl.wakil_kelas)}"/></div>
        </div>
      </div>
      <div class="fg"><label>Visi</label><input id="ed-${pl.id}-visi" value="${sanitize(pl.visi)}"/></div>
      <div class="fg" style="margin:0"><label>Misi (satu poin per baris)</label><textarea id="ed-${pl.id}-misi" rows="4">${sanitize(pl.misi)}</textarea></div>
    </div>`).join('');
}

window.handlePhoto = async function (input, pid, role) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async function (e) {
    const data = e.target.result;
    // Update tampilan lingkaran
    const circle = input.previousElementSibling.previousElementSibling;
    circle.innerHTML = `<img src="${data}"/><div class="photo-upload-overlay">✏️</div>`;
    // Simpan ke database
    const db = await getDB();
    const pl = db.paslon.find(p => p.id == pid);
    if (pl) { pl[role + '_photo'] = data; await saveDB(db); }
  };
  r.readAsDataURL(f);
};

window.savePaslon = async function () {
  const db = await getDB();
  db.paslon.forEach(pl => {
    pl.ketua       = document.getElementById('ed-' + pl.id + '-kname').value;
    pl.ketua_kelas = document.getElementById('ed-' + pl.id + '-kkelas').value;
    pl.wakil       = document.getElementById('ed-' + pl.id + '-wname').value;
    pl.wakil_kelas = document.getElementById('ed-' + pl.id + '-wkelas').value;
    pl.visi        = document.getElementById('ed-' + pl.id + '-visi').value;
    pl.misi        = document.getElementById('ed-' + pl.id + '-misi').value;
  });
  await saveDB(db);
  const al = document.getElementById('paslon-save-alert');
  al.textContent = '✓ Data paslon berhasil disimpan!';
  al.className   = 'alert alert-ok';
  al.style.display = 'block';
  setTimeout(() => al.style.display = 'none', 3000);
};

// ── DATA PEMILIH ──────────────────────────────────────────────────────────────
async function renderVotersTable(filter = '') {
  const db = await getDB();
  const q  = (filter || '').toLowerCase();
  const list = q
    ? db.voters.filter(v => v.name.toLowerCase().includes(q) || v.kelas.toLowerCase().includes(q) || (v.nis || '').toLowerCase().includes(q))
    : db.voters;
  document.getElementById('voters-tbody').innerHTML = list.map((v, i) => {
    const voted = db.votes[v.nis];
    return `<tr>
      <td>${i + 1}</td>
      <td>${sanitize(v.name)}</td>
      <td>${sanitize(v.kelas)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${sanitize(v.nis || '')}</td>
      <td><span class="badge ${voted ? 'badge-y' : 'badge-n'}">${voted ? '✓ Sudah' : 'Belum'}</span></td>
    </tr>`;
  }).join('');
}
window.filterVoters = q => renderVotersTable(q);

// ── AKUN SISWA ────────────────────────────────────────────────────────────────
async function renderAkunTable(filter = '') {
  const db = await getDB();
  const q  = (filter || '').toLowerCase();
  const list = q
    ? db.voters.filter(v => v.name.toLowerCase().includes(q) || v.kelas.toLowerCase().includes(q) || (v.nis || '').toLowerCase().includes(q))
    : db.voters;
  document.getElementById('akun-tbody').innerHTML = list.map((v, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${sanitize(v.name)}</td>
      <td>${sanitize(v.kelas)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${sanitize(v.nis || '')}</td>
      <td><div class="pw-cell"><span id="pw-${sanitize(v.nis || i)}" data-show="0">••••••••</span><button class="pw-toggle" onclick="window.togglePw('${sanitize(v.nis || i)}','${sanitize(v.pass || '')}')" title="Tampilkan">👁</button></div></td>
      <td><button class="btn-sm btn-warn" onclick="window.openResetPw('${sanitize(v.nis || '')}','${sanitize(v.name)}')">🔑 Reset</button></td>
      <td><button class="btn-sm btn-del" onclick="window.hapusAkun('${sanitize(v.nis || '')}')">Hapus</button></td>
    </tr>`).join('');
}
window.filterAkun = q => renderAkunTable(q);

window.togglePw = function (nis, pw) {
  const el = document.getElementById('pw-' + nis);
  if (!el) return;
  el.dataset.show = el.dataset.show === '0' ? '1' : '0';
  el.textContent  = el.dataset.show === '1' ? pw : '••••••••';
};

window.openResetPw = function (nis, name) {
  _resetPwTarget = nis;
  document.getElementById('modal-reset-name').textContent = name;
  document.getElementById('modal-new-pw').value = '';
  document.getElementById('modal-reset-pw').classList.add('open');
  setTimeout(() => document.getElementById('modal-new-pw').focus(), 100);
};

window.confirmResetPw = async function () {
  const npw = document.getElementById('modal-new-pw').value.trim();
  if (!npw) { alert('Password tidak boleh kosong.'); return; }
  const db = await getDB();
  const v  = db.voters.find(vv => vv.nis === _resetPwTarget);
  if (v) { v.pass = npw; await saveDB(db); }
  closeModal('modal-reset-pw');
  await renderAkunTable(document.getElementById('search-akun').value);
};

window.addAkun = async function () {
  const name  = document.getElementById('an-name').value.trim();
  const kelas = document.getElementById('an-kelas').value.trim();
  const nis   = document.getElementById('an-nis').value.trim();
  const pw    = document.getElementById('an-pw').value.trim();
  const al    = document.getElementById('akun-alert');
  al.style.display = 'none';

  if (!name || !kelas || !nis || !pw) {
    al.textContent = 'Semua kolom wajib diisi.';
    al.className   = 'alert alert-err';
    al.style.display = 'block';
    return;
  }
  const db = await getDB();
  if (db.voters.find(v => v.nis === nis)) {
    al.textContent = 'NIS sudah terdaftar.';
    al.className   = 'alert alert-err';
    al.style.display = 'block';
    return;
  }
  db.voters.push({ nis, name, kelas, pass: pw });
  await saveDB(db);
  ['an-name', 'an-kelas', 'an-nis', 'an-pw'].forEach(id => document.getElementById(id).value = '');
  al.textContent = '✓ Akun berhasil ditambahkan!';
  al.className   = 'alert alert-ok';
  al.style.display = 'block';
  setTimeout(() => al.style.display = 'none', 2500);
  await renderAkunTable();
  document.getElementById('an-name').focus();
};

window.hapusAkun = async function (nis) {
  if (!confirm('Hapus akun ini?')) return;
  const db = await getDB();
  db.voters     = db.voters.filter(v => v.nis !== nis);
  delete db.votes[nis];
  await saveDB(db);
  await renderAkunTable(document.getElementById('search-akun').value);
};

window.hapusSemuaAkun = async function () {
  closeModal('modal-hapus-semua');
  const db = await getDB();
  db.voters = [];
  db.votes  = {};
  await saveDB(db);
  await renderAkunTable();
};

// ── IMPORT EXCEL ──────────────────────────────────────────────────────────────
window.importExcel = async function (input) {
  const file = input.files[0];
  if (!file) return;
  const al = document.getElementById('akun-alert');
  try {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload  = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const ab   = await file.arrayBuffer();
    const wb   = window.XLSX.read(ab, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
    const db   = await getDB();
    let added = 0, skipped = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 4) continue;
      const [name, kelas, nis, pass] = [
        String(r[0] || '').trim(), String(r[1] || '').trim(),
        String(r[2] || '').trim(), String(r[3] || '').trim()
      ];
      if (!name || !kelas || !nis || !pass) { skipped++; continue; }
      if (db.voters.find(v => v.nis === nis)) { skipped++; continue; }
      db.voters.push({ nis, name, kelas, pass });
      added++;
    }
    await saveDB(db);
    al.textContent   = `✓ Import selesai: ${added} akun ditambahkan, ${skipped} dilewati.`;
    al.className     = 'alert alert-ok';
    al.style.display = 'block';
    await renderAkunTable();
  } catch (e) {
    al.textContent   = 'Gagal import: ' + e.message;
    al.className     = 'alert alert-err';
    al.style.display = 'block';
  }
  input.value = '';
};

// ── KELOLA ADMIN ──────────────────────────────────────────────────────────────
async function renderAdminsTable() {
  const db = await getDB();
  document.getElementById('admins-tbody').innerHTML = db.admins.map((a, i) => {
    const isSelf = CAdmin && a.username === CAdmin.username;
    const canDel = !isSelf && a.role !== 'superadmin';
    return `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:600">${sanitize(a.username)}</td>
      <td><span class="badge ${a.role === 'superadmin' ? 'badge-y' : 'badge-n'}">${a.role === 'superadmin' ? '👑 Superadmin' : 'Admin'}</span></td>
      <td>${canDel ? `<button class="btn-sm btn-del" onclick="window.hapusAdmin('${sanitize(a.username)}')">Hapus</button>` : '<span style="font-size:12px;color:var(--slate-400)">—</span>'}</td>
    </tr>`;
  }).join('');
}

window.addAdmin = async function () {
  const u  = document.getElementById('new-adm-user').value.trim();
  const p  = document.getElementById('new-adm-pw').value.trim();
  const al = document.getElementById('admins-alert');
  al.style.display = 'none';
  if (!u || !p) {
    al.textContent = 'Username dan password wajib diisi.';
    al.className   = 'alert alert-err';
    al.style.display = 'block';
    return;
  }
  const db = await getDB();
  if (db.admins.find(a => a.username === u)) {
    al.textContent = 'Username sudah digunakan.';
    al.className   = 'alert alert-err';
    al.style.display = 'block';
    return;
  }
  db.admins.push({ username: u, pass: p, role: 'admin' });
  await saveDB(db);
  document.getElementById('new-adm-user').value = '';
  document.getElementById('new-adm-pw').value   = '';
  al.textContent   = '✓ Admin baru berhasil ditambahkan!';
  al.className     = 'alert alert-ok';
  al.style.display = 'block';
  setTimeout(() => al.style.display = 'none', 2500);
  await renderAdminsTable();
};

window.hapusAdmin = async function (username) {
  if (!confirm('Hapus akun admin "' + username + '"?')) return;
  const db = await getDB();
  db.admins = db.admins.filter(a => a.username !== username);
  await saveDB(db);
  await renderAdminsTable();
};

// ── RESET VOTING ──────────────────────────────────────────────────────────────
window.doReset = async function () {
  closeModal('modal-reset');
  const db = await getDB();
  db.votes = {};
  await saveDB(db);
  await renderAdmin();
};

// ── GANTI PASSWORD ADMIN ──────────────────────────────────────────────────────
window.changeAdminPw = async function () {
  const p  = document.getElementById('new-pw').value.trim();
  const al = document.getElementById('pw-alert');
  if (!p || p.length < 6) {
    al.textContent = 'Password minimal 6 karakter.';
    al.className   = 'alert alert-err';
    al.style.display = 'block';
    return;
  }
  const db  = await getDB();
  const adm = db.admins.find(a => a.username === CAdmin.username);
  if (adm) { adm.pass = p; }
  await saveDB(db);
  CAdmin.pass = p;
  document.getElementById('new-pw').value = '';
  al.textContent   = '✓ Password berhasil diubah!';
  al.className     = 'alert alert-ok';
  al.style.display = 'block';
  setTimeout(() => al.style.display = 'none', 3000);
};

// ── ENTER KEY: halaman login ──────────────────────────────────────────────────
document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });
document.getElementById('l-user').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
document.getElementById('a-pass').addEventListener('keydown', e => { if (e.key === 'Enter') window.doAdminLogin(); });
document.getElementById('a-user').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('a-pass').focus(); });
document.getElementById('modal-new-pw').addEventListener('keydown', e => { if (e.key === 'Enter') window.confirmResetPw(); });

// ── INISIALISASI ──────────────────────────────────────────────────────────────
setCopyrightYear();

// ══════════════════════════════════════════════════════════════════════════════
// EXPOSE SEMUA FUNGSI KE WINDOW — agar bisa dipanggil dari onclick di HTML
// ══════════════════════════════════════════════════════════════════════════════

// UI & Navigation
window.showPage        = showPage;
window.closeModal      = closeModal;
window.closeDropdowns  = closeDropdowns;
window.toggleDropdown  = toggleDropdown;

// Login & Logout
window.doLogin         = doLogin;
window.doAdminLogin    = doAdminLogin;
window.doLogout        = doLogout;

// Voting
window.selectPaslon    = selectPaslon;
window.openConfirm     = openConfirm;
window.submitVote      = submitVote;

// Admin
window.switchTab       = switchTab;
window.renderAdmin     = renderAdmin;

// Paslon
window.renderPaslonEdit = renderPaslonEdit;
window.handlePhoto     = handlePhoto;
window.savePaslon      = savePaslon;

// Voters & Akun
window.renderVotersTable = renderVotersTable;
window.filterVoters    = filterVoters;
window.renderAkunTable = renderAkunTable;
window.filterAkun      = filterAkun;
window.togglePw        = togglePw;
window.openResetPw     = openResetPw;
window.confirmResetPw  = confirmResetPw;
window.addAkun         = addAkun;
window.hapusAkun       = hapusAkun;
window.hapusSemuaAkun  = hapusSemuaAkun;
window.importExcel     = importExcel;

// Admin Management
window.addAdmin        = addAdmin;
window.hapusAdmin      = hapusAdmin;

// Settings
window.doReset         = doReset;
window.changeAdminPw   = changeAdminPw;
