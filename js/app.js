'use strict';
const C = window.APP_CONFIG || {};
if (!C.SUPABASE_URL || !C.SUPABASE_KEY) {
  console.error('Konfigurasi Supabase belum termuat. Pastikan js/config.js ada dan valid.');
}
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => (n < 0 ? '- ' : '') + 'Rp ' + Math.abs(Math.round(+n || 0)).toLocaleString('id-ID');
const fmtNominal = n => String(Math.abs(Math.round(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const parseNominal = n => Number(String(n).replace(/\D/g, '') || 0);
const p2 = n => String(n).padStart(2, '0');
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BLN_PENUH = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const sum = a => a.reduce((t, x) => t + (+x.nominal || 0), 0);
const tgl = d => d ? `${+d.slice(8, 10)} ${BLN[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '';
const IC = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  kategori: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  transaksi: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  hutang: '<path d="M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
  report: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/>',
  filter: '<path d="M4 5h16l-6.5 7v5l-3 2v-7z"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  password: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 00-1.8.1 1.7 1.7 0 00-.9 1.5v.2h-3.2v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8-.1l-.2.1-1.6-2.8.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H6v-3.2h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1 1.6-2.8.2.1a1.7 1.7 0 001.8-.1 1.7 1.7 0 00.9-1.5V3h3.2v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8.1l.2-.1 1.6 2.8-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.5 1h.2v3.2h-.2a1.7 1.7 0 00-1.5 1z"/>',
  wallet: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V6a2 2 0 012-2h13M16 14h5"/><circle cx="16" cy="14" r=".7"/>',
  income: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  expense: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  trend: '<path d="M4 17l6-6 4 4 6-8"/><path d="M14 7h6v6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  backup: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

let S = null, ME = null;
try { S = JSON.parse(localStorage.getItem('sb') || 'null'); } catch (e) { }
function setS(j) {
  S = j ? { a: j.access_token, r: j.refresh_token, e: Date.now() + (j.expires_in - 60) * 1000, u: j.user.id } : null;
  S ? localStorage.setItem('sb', JSON.stringify(S)) : localStorage.removeItem('sb');
}
async function authCall(path, body, method = 'POST', token) {
  const r = await fetch(C.SUPABASE_URL + '/auth/v1/' + path, {
    method, headers: { apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.msg || j.error_description || j.message || 'Permintaan gagal');
  return j;
}
async function tok() {
  if (!S) throw new Error('Belum login');
  if (Date.now() > S.e) {
    try { setS(await authCall('token?grant_type=refresh_token', { refresh_token: S.r })); } catch (e) { setS(null); location.reload(); }
  }
  return S.a;
}
async function api(path, o = {}) {
  const r = await fetch(C.SUPABASE_URL + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: { apikey: C.SUPABASE_KEY, Authorization: 'Bearer ' + await tok(), 'Content-Type': 'application/json', ...(o.prefer ? { Prefer: o.prefer } : {}), ...(o.range ? { Range: o.range } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const t = await r.text(); let j = null;
  try { j = t ? JSON.parse(t) : null; } catch (e) { }
  if (!r.ok) throw new Error(j && j.code === '23503' ? 'Data ini masih dipakai di tempat lain' : (j && j.message) || 'Permintaan gagal');
  return j;
}
async function all(path) {
  let out = [], i = 0;
  for (; ;) {
    const rows = await api(path, { range: i + '-' + (i + 999) });
    out = out.concat(rows);
    if (rows.length < 1000) return out;
    i += 1000;
  }
}

function modal(html) {
  closeModal();
  const d = document.createElement('div'); d.className = 'ov'; d.id = 'mod';
  d.innerHTML = `<div class="dlg">${html}</div>`; document.body.appendChild(d);
}
function closeModal() { const m = $('#mod'); if (m) m.remove(); }

function login(msg) {
  $('#app').innerHTML = `<div class="lg"><form id="lf" class="lbox"><div class="brand"><b>${ico('dashboard')}</b><div><small>SISTEM INFORMASI</small><h1>Keuangan</h1></div></div>${msg ? `<div class="alert">${esc(msg)}</div>` : ''}<label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="btn wide">Masuk</button></form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try {
      setS(await authCall('token?grant_type=password', { email: e.target.email.value.trim(), password: e.target.password.value }));
      ME = null; render();
    } catch (x) { login(x.message === 'Invalid login credentials' ? 'Email atau password salah' : x.message); }
  };
}
async function logout() {
  try { await authCall('logout', null, 'POST', S && S.a); } catch (e) { }
  setS(null); ME = null; location.hash = ''; location.reload();
}
async function backup() {
  const d = {};
  for (const t of ['kategori', 'bank', 'transaksi', 'hutang', 'piutang']) d[t] = await all(t + '?select=*&order=id');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }));
  a.download = 'backup-keuangan-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
}

function shell(name, q, banks) {
  const adm = ME.level === 'administrator', cur = q.get('bank'), txPages = ['transaksi', 'hutang', 'piutang'];
  const A = (h, label, ic, on, sub) => `<a href="#/${h}" class="${on ? 'on' : ''}${sub ? ' sub' : ''}">${sub ? '' : ico(ic)}${label}</a>`;
  return `<div class="app"><aside class="side"><p class="logo">Warung Sukaria<small>Manajemen Keuangan</small></p>
${A('dashboard', 'Dashboard', 'dashboard', name === 'dashboard')}
${A('kategori', 'Data Kategori', 'kategori', name === 'kategori')}
<div class="nav-group${txPages.includes(name) ? ' open' : ''}">
<button class="nav-group-toggle${txPages.includes(name) ? ' on' : ''}" id="tx-toggle" type="button" aria-expanded="${txPages.includes(name)}" aria-controls="tx-submenu">${ico('transaksi')}<span>Data Transaksi</span>${ico('chevron')}</button>
<div class="nav-submenu" id="tx-submenu"${txPages.includes(name) ? '' : ' hidden'}>
${A('transaksi', 'Semua Transaksi', '', name === 'transaksi' && !cur, true)}
${A('hutang', 'Hutang', '', name === 'hutang', true)}
${A('piutang', 'Piutang', '', name === 'piutang', true)}
${banks.map(b => A('transaksi?bank=' + b.id, esc(b.nama), '', name === 'transaksi' && cur == b.id, true)).join('')}
</div></div>
${A('bank', 'Rekening Bank', 'bank', name === 'bank')}
${A('laporan', 'Laporan', 'report', name === 'laporan')}
${A('pengaturan', 'Pengaturan', 'settings', ['pengaturan', 'password'].includes(name))}
<button class="lnk" id="lo">${ico('logout')}Logout</button>
<div class="me"><b>${esc((ME.nama || '?')[0].toUpperCase())}</b><span>${esc(ME.nama)}<small>${esc(ME.level)}</small></span></div>
</aside><main id="main"></main></div>
<nav class="mobile-nav" aria-label="Navigasi mobile">
${A('dashboard', 'Ringkasan', 'dashboard', name === 'dashboard')}
${A('transaksi', 'Transaksi', 'transaksi', name === 'transaksi')}
<a href="#/transaksi?tambah=1" class="mobile-add" aria-label="Tambah transaksi" title="Tambah transaksi">${ico('add')}<span>Tambah</span></a>
${A('laporan', 'Laporan', 'report', name === 'laporan')}
<button id="more" type="button" aria-expanded="false">${ico('more')}<span>Lainnya</span></button>
</nav>`;
}

const PAGES = {};
async function render() {
  if (!S) return login();
  try {
    if (!ME) ME = (await api('profiles?select=nama,level&id=eq.' + S.u))[0];
    if (!ME || !['administrator', 'manajemen'].includes(ME.level)) {
      $('#app').innerHTML = `<div class="lg"><div class="lbox"><h1>Menunggu persetujuan</h1><p class="mut">Akun Anda belum diberi akses. Hubungi administrator.</p><button class="ghost" id="lo">Logout</button></div></div>`;
      $('#lo').onclick = logout; return;
    }
    const [name, qs] = (location.hash.slice(2) || 'dashboard').split('?'), q = new URLSearchParams(qs || '');
    const banks = await api('bank?select=id,nama&order=id');
    document.body.classList.toggle('print-report', name === 'laporan');
    $('#app').innerHTML = shell(name, q, banks);
    $('#lo').onclick = logout;
    if ($('#bk')) $('#bk').onclick = () => backup().catch(e => alert(e.message));
    $('#tx-toggle').onclick = () => {
      const open = $('#tx-toggle').getAttribute('aria-expanded') !== 'true';
      $('#tx-toggle').setAttribute('aria-expanded', String(open));
      $('#tx-toggle').classList.toggle('on', open);
      $('#tx-submenu').hidden = !open;
      $('.nav-group').classList.toggle('open', open);
    };
    $('#more').onclick = () => {
      const open = $('.side').classList.toggle('open');
      $('#more').setAttribute('aria-expanded', String(open));
      $('#more').classList.toggle('on', open);
    };
    $('.side').querySelectorAll('a').forEach(a => a.onclick = () => $('.side').classList.remove('open'));
    try { await (PAGES[name] || PAGES.dashboard)($('#main'), q, banks); } catch (e) { $('#main').innerHTML = `<div class="card">${esc(e.message)}</div>`; }
  } catch (e) { login('Gagal memuat: ' + e.message); }
}

// ---------- Halaman daftar + form (transaksi, kategori, bank, hutang, piutang) ----------
const TG = ['tanggal', 'Tanggal', 'date'], NM = ['nominal', 'Nominal (Rp)', 'number'], KT = ['keterangan', 'Keterangan', 'text'];
const CF = {
  transaksi: {
    t: 'Data Transaksi', sel: 'transaksi?select=*,kategori(nama),bank(nama)&order=tanggal.desc,id.desc&limit=300',
    cols: [['Tanggal', r => tgl(r.tanggal)], ['Jenis', r => r.jenis], ['Kategori', r => r.kategori ? r.kategori.nama : '-'], ['Keterangan', r => r.keterangan], ['Rekening', r => r.bank ? r.bank.nama : '-'], ['Nominal', r => (r.jenis === 'Pemasukan' ? '+ ' : '- ') + rp(r.nominal), 'r']],
    f: [TG, ['jenis', 'Jenis', 'sel', () => [['Pemasukan', 'Pemasukan'], ['Pengeluaran', 'Pengeluaran']]], ['kategori_id', 'Kategori', 'sel', 'kategori'], NM, KT, ['bank_id', 'Rekening Bank', 'sel', 'bank']]
  },
  kategori: { t: 'Data Kategori', adm: 1, sel: 'kategori?select=*&order=id', cols: [['Nama Kategori', r => r.nama]], f: [['nama', 'Nama Kategori', 'text']] },
  bank: {
    t: 'Rekening Bank', adm: 1, sel: 'bank?select=*&order=id',
    cols: [['Nama', r => r.nama], ['Nomor', r => r.nomor], ['Pemilik', r => r.pemilik], ['Saldo', r => rp(r.saldo), 'r']],
    f: [['nama', 'Nama Bank', 'text'], ['nomor', 'Nomor Rekening', 'text'], ['pemilik', 'Pemilik', 'text'], ['saldo', 'Saldo (Rp)', 'number']]
  },
  hutang: { t: 'Hutang', sel: 'hutang?select=*&order=tanggal.desc,id.desc', cols: [['Tanggal', r => tgl(r.tanggal)], ['Keterangan', r => r.keterangan], ['Nominal', r => rp(r.nominal), 'r']], f: [TG, NM, KT] },
  piutang: { t: 'Piutang', sel: 'piutang?select=*&order=tanggal.desc,id.desc', cols: [['Tanggal', r => tgl(r.tanggal)], ['Keterangan', r => r.keterangan], ['Nominal', r => rp(r.nominal), 'r']], f: [TG, NM, KT] }
};
const OPSIONAL = ['keterangan', 'nomor', 'pemilik'];
async function crud(k, box, q) {
  const c = CF[k], w = !c.adm || ME.level === 'administrator';
  let path = c.sel; if (k === 'transaksi' && q.get('bank')) path += '&bank_id=eq.' + (parseInt(q.get('bank'), 10) || 0);
  const rows = await api(path);
  box.innerHTML = `<div class="top"><h1>${c.t}</h1>${w ? '<button class="btn" id="add">+ Tambah</button>' : ''}</div><div class="card tbl"><table><thead><tr>${c.cols.map(x => `<th class="${x[2] || ''}">${x[0]}</th>`).join('')}${w ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((r, i) => `<tr>${c.cols.map(x => `<td class="${x[2] || ''}">${esc(x[1](r))}</td>`).join('')}${w ? `<td class="act"><button data-e="${i}">Ubah</button><button data-d="${i}">Hapus</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="9">Belum ada data</td></tr>'}</tbody></table></div>${k === 'transaksi' && rows.length === 300 ? '<p class="mut">Menampilkan 300 transaksi terbaru.</p>' : ''}`;
  const form = async r => {
    const f = [];
    for (const [key, lab, type, src] of c.f) {
      const v = r ? r[key] : '', req = OPSIONAL.includes(key) ? '' : ' required';
      let inp;
      if (type === 'sel') {
        const o = typeof src === 'function' ? src() : (await api(src + '?select=id,nama&order=id')).map(x => [x.id, x.nama]);
        inp = `<select name="${key}"${req}><option value="">- Pilih -</option>${o.map(([a, b]) => `<option value="${esc(a)}"${String(a) === String(v) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
      } else if (type === 'number' && key === 'nominal') {
        inp = `<input name="${key}" type="text" inputmode="numeric" data-nominal value="${esc(v === '' ? '' : fmtNominal(v))}"${req}>`;
      } else inp = `<input name="${key}" type="${type}"${type === 'number' ? ' step="1"' : ''} value="${esc(v)}"${req}>`;
      f.push(`<label>${lab}${inp}</label>`);
    }
    modal(`<h2>${r ? 'Ubah' : 'Tambah'} ${c.t}</h2><form id="f">${f.join('')}<div class="end"><button type="button" class="ghost" id="x">Tutup</button><button class="btn">Simpan</button></div><p class="err" id="e"></p></form>`);
    $('#x').onclick = closeModal;
    $('#f').querySelectorAll('[data-nominal]').forEach(input => input.addEventListener('input', () => {
      const caret = input.selectionStart || 0;
      const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
      const digits = input.value.replace(/\D/g, '');
      const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      input.value = formatted;
      let next = 0, seen = 0;
      while (next < formatted.length && seen < digitsBefore) {
        if (/\d/.test(formatted[next])) seen++;
        next++;
      }
      input.setSelectionRange(next, next);
    }));
    $('#f').onsubmit = async ev => {
      ev.preventDefault(); const d = {};
      for (const [key, , type] of c.f) {
        const v = ev.target[key].value;
        d[key] = key === 'nominal' ? parseNominal(v) : type === 'number' || key.endsWith('_id') ? +v : v;
      }
      try { await api(c.sel.split('?')[0] + (r ? '?id=eq.' + r.id : ''), { method: r ? 'PATCH' : 'POST', body: d }); closeModal(); render(); } catch (e) { $('#e').textContent = e.message; }
    };
  };
  if (w) {
    $('#add').onclick = () => form(null);
    box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(rows[+b.dataset.e]));
    box.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!confirm('Hapus data ini?')) return;
      try { await api(c.sel.split('?')[0] + '?id=eq.' + rows[+b.dataset.d].id, { method: 'DELETE' }); render(); } catch (e) { alert(e.message); }
    });
    if (k === 'transaksi' && q.get('tambah')) { history.replaceState(null, '', '#/transaksi'); form(null); }
  }
}
['transaksi', 'kategori', 'bank', 'hutang', 'piutang'].forEach(k => PAGES[k] = (box, q) => crud(k, box, q));

PAGES.laporan = async (box, q, banks) => {
  const now = new Date(), yearParam = Number.parseInt(q.get('y') || '', 10), monthParam = Number.parseInt(q.get('m') || '', 10);
  const Y = Number.isInteger(yearParam) && yearParam >= 1900 && yearParam <= 2100 ? yearParam : now.getFullYear();
  const M = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
  const bankParam = Number.parseInt(q.get('bank') || '', 10), kategoriParam = Number.parseInt(q.get('kategori') || '', 10);
  const bankId = banks.some(b => +b.id === bankParam) ? bankParam : 0;
  const categories = await api('kategori?select=id,nama&order=id');
  const kategoriId = categories.some(k => +k.id === kategoriParam) ? kategoriParam : 0;
  const jenis = ['Pemasukan', 'Pengeluaran'].includes(q.get('jenis')) ? q.get('jenis') : '';
  const a = `${Y}-${p2(M)}-01`, b = M === 12 ? `${Y + 1}-01-01` : `${Y}-${p2(M + 1)}-01`;
  let path = `transaksi?select=*,kategori(nama),bank(nama)&tanggal=gte.${a}&tanggal=lt.${b}&order=tanggal.desc,id.desc`;
  if (bankId) path += '&bank_id=eq.' + bankId;
  if (kategoriId) path += '&kategori_id=eq.' + kategoriId;
  if (jenis) path += '&jenis=eq.' + jenis;
  const rows = await all(path);
  const masuk = rows.filter(r => r.jenis === 'Pemasukan').reduce((n, r) => n + (+r.nominal || 0), 0);
  const keluar = rows.filter(r => r.jenis === 'Pengeluaran').reduce((n, r) => n + (+r.nominal || 0), 0);
  const first = await api('transaksi?select=tanggal&order=tanggal.asc&limit=1');
  const firstYear = first[0] ? +first[0].tanggal.slice(0, 4) : now.getFullYear();
  const y0 = Math.min(firstYear, Y), y1 = Math.max(now.getFullYear(), Y);
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y1 - i)
    .map(y => `<option value="${y}"${y === Y ? ' selected' : ''}>${y}</option>`).join('');
  const months = BLN_PENUH.map((m, i) => `<option value="${i + 1}"${i + 1 === M ? ' selected' : ''}>${m}</option>`).join('');
  const bankOptions = banks.map(k => `<option value="${esc(k.id)}"${+k.id === bankId ? ' selected' : ''}>${esc(k.nama)}</option>`).join('');
  const kategoriOptions = categories.map(k => `<option value="${esc(k.id)}"${+k.id === kategoriId ? ' selected' : ''}>${esc(k.nama)}</option>`).join('');
  box.innerHTML = `<div class="top report-top"><div><h1>Laporan Keuangan</h1><p class="mut">Ringkasan transaksi · ${BLN_PENUH[M - 1]} ${Y}</p></div><button class="btn" id="print" type="button">Cetak / PDF</button></div>
<form id="rf" class="card report-filter"><div class="report-filters">
<label class="report-field month">Bulan<select name="m">${months}</select></label>
<label class="report-field year">Tahun<select name="y">${years}</select></label>
<label class="report-field">Rekening<select name="bank"><option value="">Semua rekening</option>${bankOptions}</select></label>
<label class="report-field">Jenis<select name="jenis"><option value="">Semua jenis</option><option${jenis === 'Pemasukan' ? ' selected' : ''}>Pemasukan</option><option${jenis === 'Pengeluaran' ? ' selected' : ''}>Pengeluaran</option></select></label>
<label class="report-field">Kategori<select name="kategori"><option value="">Semua kategori</option>${kategoriOptions}</select></label>
</div><div class="report-actions"><button class="btn" type="submit">${ico('filter')} Terapkan</button></div></form>
<div class="report-totals"><div class="card"><p class="k">Total Pemasukan</p><p class="v pos">${rp(masuk)}</p></div><div class="card"><p class="k">Total Pengeluaran</p><p class="v neg">${rp(keluar)}</p></div><div class="card"><p class="k">Selisih</p><p class="v">${rp(masuk - keluar)}</p></div></div>
<div class="card tbl report-table"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Rekening</th><th class="r">Nominal</th></tr></thead><tbody>${rows.map(r => `<tr><td>${tgl(r.tanggal)}</td><td>${esc(r.jenis)}</td><td>${esc(r.kategori ? r.kategori.nama : '-')}</td><td>${esc(r.keterangan || '-')}</td><td>${esc(r.bank ? r.bank.nama : '-')}</td><td class="r ${r.jenis === 'Pemasukan' ? 'pos' : 'neg'}">${r.jenis === 'Pemasukan' ? '+ ' : '− '}${rp(r.nominal)}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada transaksi pada periode ini.</td></tr>'}</tbody></table></div>`;
  $('#print').onclick = () => window.print();
  $('#rf').onsubmit = e => {
    e.preventDefault();
    const f = e.target, params = new URLSearchParams({ m: f.m.value, y: f.y.value });
    if (f.bank.value) params.set('bank', f.bank.value);
    if (f.jenis.value) params.set('jenis', f.jenis.value);
    if (f.kategori.value) params.set('kategori', f.kategori.value);
    location.hash = '#/laporan?' + params.toString();
  };
};

// ---------- Dashboard ----------
function chart(lab, inc, exp) {
  const W = 760, H = 250, L = 56, B = 28, T = 10, n = lab.length, step = (W - L) / n, bw = Math.min(14, step / 3);
  const max = Math.max(1, ...inc, ...exp), mag = 10 ** Math.floor(Math.log10(max)), top = Math.ceil(max / mag) * mag, ph = H - B - T;
  const k = v => v >= 1e6 ? (v / 1e6).toLocaleString('id-ID') + ' jt' : v >= 1e3 ? (v / 1e3).toLocaleString('id-ID') + ' rb' : String(v);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Grafik pemasukan dan pengeluaran">`;
  for (let i = 0; i <= 4; i++) { const y = T + ph - ph * i / 4; s += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#EEF1F5"/><text x="${L - 8}" y="${y + 4}" font-size="11" fill="#475569" text-anchor="end">${k(top * i / 4)}</text>`; }
  lab.forEach((l, i) => {
    const x = L + i * step + step / 2, hi = inc[i] / top * ph, he = exp[i] / top * ph;
    s += `<rect x="${x - bw - 1}" y="${T + ph - hi}" width="${bw}" height="${hi}" rx="${bw / 2}" fill="#0E7490"/><rect x="${x + 1}" y="${T + ph - he}" width="${bw}" height="${he}" rx="${bw / 2}" fill="#EA580C"/>`;
    if (n <= 12 || i % 5 === 0) s += `<text x="${x}" y="${H - 8}" font-size="11" fill="#475569" text-anchor="middle">${l}</text>`;
  });
  return s + '</svg>';
}
PAGES.dashboard = async (box, q) => {
  const now = new Date(), per = q.get('p') === 'tahun' ? 'tahun' : 'bulan', Y = +q.get('y') || now.getFullYear(), M = +q.get('m') || now.getMonth() + 1;
  const a = per === 'bulan' ? `${Y}-${p2(M)}-01` : `${Y}-01-01`, b = per === 'bulan' ? (M === 12 ? `${Y + 1}-01-01` : `${Y}-${p2(M + 1)}-01`) : `${Y + 1}-01-01`;
  const [first, tx, bk, hu, pi, rec, note] = await Promise.all([
    api('transaksi?select=tanggal&order=tanggal.asc&limit=1'), all(`transaksi?select=tanggal,jenis,nominal&tanggal=gte.${a}&tanggal=lt.${b}`),
    api('bank?select=nama,saldo&order=id'), all('hutang?select=nominal'), all('piutang?select=nominal'),
    api('transaksi?select=*,bank(nama)&order=tanggal.desc,id.desc&limit=3'), api('catatan?select=isi&user_id=eq.' + S.u)]);
  const y0 = first[0] ? +first[0].tanggal.slice(0, 4) : now.getFullYear(), y1 = Math.max(now.getFullYear(), Y);
  const n = per === 'bulan' ? new Date(Y, M, 0).getDate() : 12;
  const lab = per === 'bulan' ? Array.from({ length: n }, (_, i) => i + 1) : BLN, inc = Array(n).fill(0), exp = Array(n).fill(0);
  let I = 0, E = 0;
  tx.forEach(t => { const i = (per === 'bulan' ? +t.tanggal.slice(8, 10) : +t.tanggal.slice(5, 7)) - 1, v = +t.nominal || 0; if (t.jenis === 'Pemasukan') { inc[i] += v; I += v; } else { exp[i] += v; E += v; } });
  const lbl = per === 'bulan' ? BLN[M - 1] + ' ' + Y : 'Tahun ' + Y;
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y1 - i).map(y => `<option${y === Y ? ' selected' : ''}>${y}</option>`).join('');
  const months = BLN_PENUH.map((m, i) => `<option value="${i + 1}"${i + 1 === M ? ' selected' : ''}>${m}</option>`).join('');
  box.innerHTML = `<div class="top"><div><h1>Ringkasan Kas</h1><p class="mut">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
<div class="ctl"><div class="seg"><a href="#/dashboard?p=tahun&y=${Y}" class="${per === 'tahun' ? 'on' : ''}">Tahunan</a><a href="#/dashboard?p=bulan&y=${Y}&m=${M}" class="${per === 'bulan' ? 'on' : ''}">Bulanan</a></div>
<div class="period-selectors ${per === 'bulan' ? 'month-view' : 'year-view'}">${per === 'bulan' ? `<select id="sm" class="month" aria-label="Bulan">${months}</select>` : ''}<select id="sy" class="year" aria-label="Tahun">${years}</select><button class="filter-btn" id="apply-period" type="button" aria-label="Terapkan filter cashflow" title="Terapkan filter">${ico('filter')}<span>Terapkan</span></button></div>
<a class="btn desktop-add" href="#/transaksi?tambah=1">+ Transaksi baru</a></div></div>
<div class="kpi"><div class="card hero"><p class="k"><span class="kpi-icon">${ico('wallet')}</span>Saldo Kas</p><p class="v">${rp(bk.reduce((t, x) => t + +x.saldo, 0))}</p><p class="s">Total semua rekening dan cash</p></div>
<div class="card"><p class="k"><span class="kpi-icon">${ico('income')}</span>Pemasukan</p><p class="v pos">${rp(I)}</p><p class="s">${lbl}</p></div>
<div class="card"><p class="k"><span class="kpi-icon orange">${ico('expense')}</span>Pengeluaran</p><p class="v neg">${rp(E)}</p><p class="s">${lbl}</p></div>
<div class="card"><p class="k"><span class="kpi-icon">${ico('trend')}</span>Laba Bersih</p><p class="v">${rp(I - E)}</p><p class="s">Pemasukan − pengeluaran</p></div></div>
<div class="grid"><div><div class="card"><h2>Cash flow ${per === 'bulan' ? lbl : 'bulanan · ' + lbl}</h2><div class="lg2"><span><i style="background:#0E7490"></i>Pemasukan</span><span><i style="background:#EA580C"></i>Pengeluaran</span></div>${chart(lab, inc, exp)}</div>
<div class="card recent-card" style="margin-top:16px"><h2>Transaksi terbaru</h2>${rec.map(r => `<div class="row recent-row"><span class="tx-icon${r.jenis === 'Pengeluaran' ? ' out' : ''}">${ico(r.jenis === 'Pengeluaran' ? 'expense' : 'income')}</span><span class="recent-detail">${esc(r.keterangan || 'Tanpa keterangan')}<small>${tgl(r.tanggal)} · ${esc(r.bank ? r.bank.nama : '-')}</small></span><strong class="${r.jenis === 'Pemasukan' ? 'pos' : 'neg'}">${r.jenis === 'Pemasukan' ? '+' : '−'} ${rp(r.nominal)}</strong></div>`).join('') || '<p class="mut">Belum ada transaksi.</p>'}</div></div>
<div><div class="card"><h2>Saldo</h2>${bk.map(x => `<div class="row"><span>${esc(x.nama)}</span><strong>${rp(x.saldo)}</strong></div>`).join('')}<div class="row"><span>Hutang</span><strong class="neg">${rp(sum(hu))}</strong></div><div class="row"><span>Piutang</span><strong class="pos">${rp(sum(pi))}</strong></div></div>
<div class="note"><h2>Pesanan</h2><textarea id="nt" aria-label="Pesanan yang akan datang" placeholder="Tulis pesanan yang akan datang…">${esc(note[0] ? note[0].isi : '')}</textarea></div></div></div>`;
  $('#apply-period').onclick = () => {
    const selectedYear = parseInt($('#sy').value, 10), selectedMonth = $('#sm') ? parseInt($('#sm').value, 10) : M;
    location.hash = `#/dashboard?p=${per}&y=${selectedYear}&m=${selectedMonth}`;
  };
  let tm; $('#nt').oninput = e => { clearTimeout(tm); tm = setTimeout(() => api('catatan?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: S.u, isi: e.target.value } }).catch(() => { }), 800); };
};

PAGES.pengaturan = box => {
  box.innerHTML = `<div class="top"><h1>Pengaturan</h1></div><form id="pf" class="card settings-card"><h2>Ganti Password</h2><label>Password baru<input name="p" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn">Simpan Password</button><p id="pm" class="mut"></p></form>${ME.level === 'administrator' ? `<section class="card settings-card"><h2>Backup Data</h2><p class="mut">Unduh salinan data kategori, rekening, transaksi, hutang, dan piutang dalam format JSON. Simpan file dengan aman.</p><button class="ghost" id="bk" type="button">${ico('backup')}Unduh Backup</button></section>` : ''}`;
  $('#pf').onsubmit = async e => { e.preventDefault(); try { await authCall('user', { password: e.target.p.value }, 'PUT', await tok()); $('#pm').textContent = 'Password berhasil diganti.'; e.target.reset(); } catch (x) { $('#pm').textContent = x.message; } };
};
PAGES.password = PAGES.pengaturan;

window.addEventListener('hashchange', render);
render();
