'use strict';
// Form dipertahankan di memori saat kembali ke langkah sebelumnya; tidak menyimpan data siswa di localStorage.
const openingDrafts = new Map();
async function viewOpening(unitId) {
  const allowedUnits = state.units.filter(u => u.aktif && (state.user.role === 'admin' || !state.user.unit_id || u.id === state.user.unit_id));
  const selected = allowedUnits.find(u => u.id === +unitId) || allowedUnits.find(u => u.id === state.user.unit_id) ||
    allowedUnits.find(u => u.kode === state.unit) || allowedUnits.find(u => !u.is_yayasan) || allowedUnits[0];
  if (!selected) { $('#main').innerHTML = '<div class="err-box">Buat unit sekolah di Master Data terlebih dahulu.</div>'; return; }
  const info = await api.get('/api/opening?unit_id=' + selected.id);
  const options = allowedUnits.map(u => `<option value="${u.id}" ${u.id === selected.id ? 'selected' : ''}>${esc(u.nama)}</option>`).join('');
  $('#main').innerHTML = `<section class="opening-wrap">
    <div class="opening-heading"><span class="pill">PANDUAN AWAL</span><h1 class="page">Mulai pembukuan sekolah</h1>
    <p class="subtle">Belum pernah membuat jurnal? Isi saldo yang benar-benar dimiliki sekolah. SAS membantu menyusun jurnal pembukanya.</p></div>
    <label for="openingUnit">Sekolah / unit</label><select class="inp" id="openingUnit">${options}</select>
    <div id="openingBody" style="margin-top:20px;"></div></section>`;
  $('#openingUnit').addEventListener('change', e => viewOpening(+e.target.value).catch(e => toast(e.message, 'err')));
  if (info.blocked) {
    const setup = info.setup;
    $('#openingBody').innerHTML = `<div class="card pad"><h2>${setup ? 'Pengaturan awal sudah tersimpan' : 'Unit ini sudah memiliki jurnal'}</h2>
      <p>${setup ? `Tanggal mulai: <b>${fmtDate(setup.tanggal)}</b>. ${setup.journal_id ? `Status jurnal: ${esc(STATUS[setup.status] || setup.status)}.` : 'Sekolah mulai tanpa saldo; tidak ada jurnal bernilai nol yang dibuat.'}` : 'Panduan saldo awal hanya untuk unit tanpa jurnal. Data demo dan transaksi yang sudah ada tidak akan ditimpa.'}</p>
      <p class="subtle">${setup?.status === 'pending' ? 'Saldo baru masuk laporan setelah bendahara/admin menyetujui jurnal. Jika perlu revisi, tolak jurnalnya lalu isi panduan kembali.' : 'Untuk koreksi saldo yang sudah digunakan, mintalah pendampingan bendahara. Jangan menambahkan saldo awal lagi.'}</p>
      ${setup?.journal_id ? `<a class="btn primary" href="#/jurnal/${setup.journal_id}">Lihat jurnal pembuka</a>` : '<a class="btn primary" href="#/kasbank">Buka Kas &amp; Bank</a>'}
      <a class="btn" href="#/master/unit">Master Data</a></div>`;
    return;
  }
  let d = openingDrafts.get(selected.id);
  if (!d) {
    const now = new Date();
    d = { unit_id: selected.id, tanggal: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
      balances: [], receivables: [], unrestricted: '', restricted: '0', step: 0 };
    openingDrafts.set(selected.id, d);
  }
  const payload = () => ({ unit_id: d.unit_id, tanggal: d.tanggal, balances: d.balances,
    receivables: d.receivables, unrestricted: d.unrestricted, restricted: d.restricted });
  const error = e => { const el = $('#openingError'); if (el) { el.textContent = e.message; el.classList.remove('hidden'); el.focus(); } };
  function frame(content) {
    $('#openingBody').innerHTML = `<ol class="opening-steps" aria-label="Langkah pengaturan">${['Tanggal mulai', 'Saldo yang dimiliki', 'Periksa & ajukan'].map((s,i) => `<li ${i===d.step ? 'aria-current="step"' : ''}>${i+1}. ${s}</li>`).join('')}</ol>
      <div id="openingError" class="err-box hidden" role="alert" tabindex="-1"></div><div class="card pad" id="openingContent">${content}</div>`;
    $('#openingContent').querySelector('h2')?.focus();
  }
  function render() {
    if (d.step === 0) {
      frame(`<h2 tabindex="-1">Kapan sekolah mulai mencatat di SAS?</h2><p>Tidak perlu memasukkan seluruh transaksi lama. Gunakan saldo tepat sebelum transaksi pertama pada tanggal ini.</p>
        <div class="field"><label for="openingDate">Tanggal mulai pembukuan</label><input class="inp" type="date" min="1900-01-01" id="openingDate" value="${esc(d.tanggal)}" required></div>
        <div class="opening-note"><b>Siapkan bukti yang tersedia</b><ul><li>Uang tunai dan saldo rekening bank.</li><li>Sisa tagihan siswa, daftar utang, serta nilai aset sekolah.</li><li>Dana dengan pembatasan dari pemberi dana, jika ada.</li></ul>
        Jika belum tahu suatu saldo, periksa bukti atau minta bantuan bendahara; jangan mengisinya dengan angka perkiraan hanya agar seimbang.</div>
        <p class="subtle">Untuk sekolah yang benar-benar belum mempunyai aset maupun kewajiban, saldo nol diperbolehkan.</p>
        <div class="opening-actions"><button class="btn primary" id="openingNext">Lanjut isi saldo</button></div>`);
      $('#openingNext').onclick = () => {
        const input = $('#openingDate'); if (!input.reportValidity()) return;
        d.tanggal = input.value; d.step = 1; render();
      };
    } else if (d.step === 1) {
      const fields = type => info.accounts.filter(a => a.tipe === type).map(a => {
        const val = d.balances.find(b => b.account_id === a.id)?.amount || '';
        return `<div class="field"><label for="openingAcc${a.id}">${esc(a.nama)} <small>(${esc(a.kode)})${a.is_kontra ? ' · pengurang aset' : ''}</small></label>
          <input class="inp mono" id="openingAcc${a.id}" data-opening-account="${a.id}" inputmode="decimal" placeholder="0" value="${esc(val)}"></div>`;
      }).join('');
      frame(`<h2 tabindex="-1">Isi saldo dalam rupiah</h2><p>Kosong berarti tidak ada saldo. Contoh penulisan: <b>1.250.000,00</b>. Saldo ini bukan pendapatan atau belanja baru.</p>
        <details open><summary>Aset: uang dan harta sekolah</summary><div class="opening-fields">${fields('aset')}</div></details>
        <details><summary>Utang dan kewajiban yang belum dibayar</summary><div class="opening-fields">${fields('liabilitas')}</div></details>
        <details><summary>Sisa piutang SPP per siswa</summary><p>Hanya sisa tagihan untuk layanan pendidikan sebelum tanggal mulai yang pendapatannya sudah diakui. Tagihan masa depan dibuat lewat Piutang SPP.</p>
          <p class="subtle">Tambahkan siswa di Master Siswa jika belum tersedia. Perubahan tanggal mulai tidak mengubah bukti jatuh tempo.</p>
          <div id="openingReceivables"></div><button class="btn sm" id="openingAddStudent" ${info.students.length ? '' : 'disabled'}>+ Tambah piutang siswa</button>
          <a href="#/piutang/siswa" class="btn sm">Buka Master Siswa</a></details>
        <div class="opening-note">Piutang harus dirinci per siswa agar dapat dibayar kemudian. CKPN awal dan pendapatan SPP diterima di muka memerlukan pengaturan terperinci dengan pendampingan; keduanya tidak diisi sebagai angka agregat di panduan ini.</div>
        <h3>Posisi awal sekolah (aset neto)</h3><p class="subtle">Aset neto adalah aset dikurangi kewajiban, bukan uang baru. Pisahkan bagian yang penggunaannya dibatasi pemberi dana berdasarkan bukti.</p>
        <div class="opening-fields"><div class="field"><label for="openingRestricted">Dengan pembatasan</label><input class="inp mono" id="openingRestricted" inputmode="decimal" value="${esc(d.restricted)}"></div>
        <div class="field"><label for="openingUnrestricted">Tanpa pembatasan (boleh negatif bila defisit)</label><input class="inp mono" id="openingUnrestricted" inputmode="decimal" value="${esc(d.unrestricted)}" placeholder="Isi setelah diperiksa"></div></div>
        <button class="btn sm" id="openingCalculate">Hitung aset neto tanpa pembatasan dari saldo di atas</button>
        <p class="note">Hasil perhitungan tetap perlu diperiksa bendahara; bukan pengganti bukti saldo.</p>
        <div class="opening-actions"><button class="btn" id="openingBack">Kembali</button><button class="btn primary" id="openingReview">Periksa jurnal pembuka</button></div>`);
      $('[data-opening-account]') && document.querySelectorAll('[data-opening-account]').forEach(input => input.oninput = () => {
        const id = +input.dataset.openingAccount; const existing = d.balances.find(b => b.account_id === id);
        if (existing) existing.amount = input.value; else d.balances.push({ account_id:id, amount:input.value });
      });
      $('#openingRestricted').oninput = e => d.restricted = e.target.value;
      $('#openingUnrestricted').oninput = e => d.unrestricted = e.target.value;
      function rows() {
        $('#openingReceivables').innerHTML = d.receivables.map((r,i) => `<div class="opening-receivable">
          <div class="field"><label for="ors${i}">Siswa</label><select class="inp" id="ors${i}"><option value="">Pilih siswa</option>${info.students.map(s=>`<option value="${s.id}" ${s.id===+r.student_id?'selected':''}>${esc(s.nim)} — ${esc(s.nama)}</option>`).join('')}</select></div>
          <div class="field"><label for="ora${i}">Sisa tagihan (Rp)</label><input class="inp mono" inputmode="decimal" id="ora${i}" value="${esc(r.amount)}"></div>
          <div class="field"><label for="ord${i}">Jatuh tempo lama</label><input class="inp" type="date" max="${esc(d.tanggal)}" id="ord${i}" value="${esc(r.jatuh_tempo)}"></div>
          <button class="btn sm" id="orr${i}" aria-label="Hapus piutang siswa ${i+1}">Hapus</button></div>`).join('');
        d.receivables.forEach((r,i) => {
          $('#ors'+i).onchange=e=>r.student_id=+e.target.value;
          $('#ora'+i).oninput=e=>r.amount=e.target.value;
          $('#ord'+i).onchange=e=>r.jatuh_tempo=e.target.value;
          $('#orr'+i).onclick=()=>{d.receivables.splice(i,1);rows();};
        });
      }
      rows(); $('#openingAddStudent').onclick=()=>{d.receivables.push({student_id:'',amount:'',jatuh_tempo:d.tanggal});rows();};
      $('#openingCalculate').onclick=async()=>{
        try { const p=await api.post('/api/opening/preview',{...payload(),unrestricted:'0'});
          d.unrestricted=fmtNum(p.assets-p.liabilities-p.restricted); $('#openingUnrestricted').value=d.unrestricted;
        } catch(e){error(e);}
      };
      $('#openingBack').onclick=()=>{d.step=0;render();};
      $('#openingReview').onclick=async e=>{
        e.target.disabled=true;
        try{const p=await api.post('/api/opening/preview',payload()); d.step=2;review(p);}catch(err){error(err);e.target.disabled=false;}
      };
    }
  }
  function review(p) {
    frame(`<h2 tabindex="-1">Periksa sebelum diajukan</h2><p>Saldo tepat sebelum transaksi pertama pada <b>${fmtDate(p.tanggal)}</b>. ${p.empty?'Semua saldo nol: SAS mencatat tanggal mulai tanpa membuat jurnal kosong.':'SAS akan membentuk jurnal berikut untuk diperiksa bendahara/admin.'}</p>
      <div class="opening-totals"><div>Aset<b>${fmtRp(p.assets)}</b></div><div>Kewajiban<b>${fmtRp(p.liabilities)}</b></div><div>Aset neto<b>${fmtRp(p.unrestricted+p.restricted)}</b></div></div>
      <div class="${p.balanced?'ok-box':'err-box'}" role="status">${p.balanced?'Seimbang — aset = kewajiban + aset neto.':'Belum seimbang. Selisih debit–kredit: '+fmtRp(p.difference)+'. Kembali dan periksa sumber saldonya.'}</div>
      ${p.lines.length?`<div class="tbl-wrap"><table class="tbl"><caption class="subtle">Pratinjau jurnal pembuka · belum masuk laporan</caption><thead><tr><th>Akun</th><th>Debit</th><th>Kredit</th></tr></thead><tbody>${p.lines.map(l=>`<tr><td>${esc(l.akun_kode)} · ${esc(l.akun_nama)}</td><td class="mono">${fmtRp(l.debit)}</td><td class="mono">${fmtRp(l.kredit)}</td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td>${fmtRp(p.totalDebit)}</td><td>${fmtRp(p.totalKredit)}</td></tr></tfoot></table></div>`:''}
      <p class="subtle">Rincian piutang: ${p.receivables.length} siswa. Piutang dan rekening awal baru disiapkan setelah jurnal disetujui. Saldo awal tidak dihitung sebagai pendapatan SPP tahun berjalan.</p>
      <label class="opening-confirm"><input type="checkbox" id="openingConfirm"> Saya sudah memeriksa bukti saldo, rincian siswa, dan pembatasan dana. Data ini adalah saldo awal, bukan transaksi baru.</label>
      <div class="opening-actions"><button class="btn" id="openingEdit">Kembali perbaiki</button><button class="btn primary" id="openingSubmit" disabled>${p.empty?'Mulai tanpa saldo':'Ajukan jurnal pembuka'}</button></div>`);
    $('#openingEdit').onclick=()=>{d.step=1;render();};
    $('#openingConfirm').onchange=e=>$('#openingSubmit').disabled=!e.target.checked||!p.balanced;
    $('#openingSubmit').onclick=async e=>{
      e.target.disabled=true;
      try{const result=await api.post('/api/opening/submit',{...payload(),confirmed:true}); openingDrafts.delete(selected.id);
        toast(result.empty?'Tanggal mulai tersimpan. Silakan catat transaksi pertama.':'Jurnal pembuka diajukan. Tunggu persetujuan bendahara/admin.','ok'); await viewOpening(selected.id);
      }catch(err){error(err);e.target.disabled=false;}
    };
  }
  if(d.step===2)d.step=1;
  render();
}
