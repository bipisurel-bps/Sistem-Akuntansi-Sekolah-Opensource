'use strict';
// Tautan bookmark aplikasi lama tetap menuju ruang kerja, bukan halaman produk.
if (location.hash.startsWith('#/')) location.replace('/app' + location.hash);
const menu = document.querySelector('.menu-toggle');
if (menu) {
  menu.hidden=false;document.documentElement.classList.add('js-nav');
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.querySelector('#navigation').classList.toggle('is-open',open);});
  document.querySelectorAll('#navigation a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');document.querySelector('#navigation').classList.remove('is-open');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');document.querySelector('#navigation').classList.remove('is-open');menu.focus();}});
}
const scenarios={
  kas:{label:'Saldo kas & bank',value:'Rp48.750.000',note:'Posisi dana pada ilustrasi sekolah',title:'Transaksi terbaru',badge:'Jejak tercatat',footer:'Setiap catatan memiliki alur pemeriksaan.',
    rows:[['↙','Sumbangan pendidikan','Penerimaan · Kas operasional','+ Rp1.500.000'],['↗','Bahan ajar kelas','Pengeluaran · Sudah disetujui','− Rp750.000']]},
  spp:{label:'Sisa tagihan pada contoh siswa',value:'Rp150.000',note:'Tagihan Rp500.000 · Dibayar Rp350.000',title:'Rincian pembayaran contoh',badge:'Cicilan tercatat',footer:'Riwayat pembayaran membantu menelusuri sisa tagihan.',
    rows:[['↙','Pembayaran pertama','Contoh siswa · 5 Oktober','Rp200.000'],['↙','Pembayaran kedua','Contoh siswa · 12 Oktober','Rp150.000']]},
  laporan:{label:'Kas pada laporan ilustrasi',value:'Rp48.750.000',note:'Saldo awal Rp32.000.000 + arus bersih Rp16.750.000',title:'Ringkasan arus kas contoh',badge:'Bisa ditelusuri',footer:'Angka ilustrasi ini bukan data keuangan sekolah pengguna.',
    rows:[['↙','Total penerimaan','Ilustrasi periode Oktober','Rp22.500.000'],['↗','Total pengeluaran','Ilustrasi periode Oktober','Rp5.750.000']]}
};
const tabs=[...document.querySelectorAll('[data-preview]')];
function selectTab(tab){
  const s=scenarios[tab.dataset.preview];
  tabs.forEach(t=>{t.setAttribute('aria-selected',String(t===tab));t.tabIndex=t===tab?0:-1;});
  const panel=document.querySelector('#preview-panel');panel.setAttribute('aria-labelledby',tab.id);
  for(const [id,key] of [['preview-label','label'],['preview-value','value'],['preview-note','note'],['preview-list-title','title'],['preview-badge','badge'],['preview-footer-text','footer']]) document.getElementById(id).textContent=s[key];
  document.querySelector('#preview-rows').replaceChildren(...s.rows.map(row=>{
    const el=document.createElement('div');el.className='preview-row';
    const icon=document.createElement('span');icon.className='transaction-icon'+(row[0]==='↗'?' expense':'');icon.textContent=row[0];
    const text=document.createElement('div'), title=document.createElement('b'), note=document.createElement('small'), value=document.createElement('strong');
    title.textContent=row[1];note.textContent=row[2];value.textContent=row[3];text.append(title,note);el.append(icon,text,value);return el;
  }));
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectTab(tab));
  tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});
});
let returnFocus;
function openDialog(id,trigger){const d=document.getElementById(id);returnFocus=trigger;if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');d.querySelector('input,button')?.focus();}
function closeDialog(d){if(typeof d.close==='function')d.close();else d.removeAttribute('open');returnFocus?.focus();}
document.querySelectorAll('[data-open-demo]').forEach(b=>b.addEventListener('click',()=>openDialog('demo-dialog',b)));
document.querySelectorAll('[data-open-help]').forEach(b=>b.addEventListener('click',()=>openDialog('help-dialog',b)));
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});d.addEventListener('close',()=>returnFocus?.focus());});
const form=document.getElementById('demo-form'),result=document.getElementById('demo-result'),error=document.getElementById('demo-error');
const rupiah=n=>'Rp'+(n/100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
form.addEventListener('submit',e=>{
  e.preventDefault();error.hidden=true;result.hidden=true;
  const raw=document.getElementById('demo-amount').value.trim();
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)){error.textContent='Gunakan nominal rupiah yang benar, misalnya 500.000.';error.hidden=false;return;}
  const [rp,cents='']=raw.replaceAll('.','').split(',');
  const amount=Number(rp)*100+Number(cents.padEnd(2,'0'));
  if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000000){error.textContent='Isi nominal lebih dari nol, maksimum Rp1.000.000.000 untuk simulasi.';error.hidden=false;return;}
  const receipt=document.getElementById('demo-kind').value==='receipt';
  const debit=receipt?'Kas operasional':'Beban operasional sekolah';
  const credit=receipt?'Sumbangan tidak terikat':'Kas operasional';
  // Seluruh label di bawah adalah konstanta; nominal dirender dari angka tervalidasi.
  result.innerHTML=`<table><caption>Contoh jurnal ${receipt?'penerimaan':'pengeluaran'}</caption><thead><tr><th>Akun</th><th>Debit</th><th>Kredit</th></tr></thead><tbody><tr><td>${debit}</td><td>${rupiah(amount)}</td><td>—</td></tr><tr><td>${credit}</td><td>—</td><td>${rupiah(amount)}</td></tr></tbody></table><p class="balanced-notice">✓ Seimbang. Total debit = total kredit = ${rupiah(amount)}.</p><p>Di aplikasi, transaksi kas diajukan untuk diperiksa dan disetujui sebelum masuk laporan. Di sini Anda hanya melihat simulasinya.</p>`;
  result.hidden=false;
});
document.getElementById('demo-reset').addEventListener('click',()=>{form.reset();result.hidden=true;error.hidden=true;document.getElementById('demo-amount').focus();});
fetch('/api/product').then(r=>{if(!r.ok)throw new Error('Informasi belum tersedia');return r.json();}).then(p=>{
  if(!p.supportEmail)return;
  const box=document.getElementById('help-contact');box.replaceChildren();
  const text=document.createElement('p');text.textContent='Ceritakan nama sekolah, kebutuhan instalasi, serta apakah sudah memiliki server. Kirim permintaan awal ke:';
  const link=document.createElement('a');link.textContent=p.supportEmail;link.href='mailto:'+encodeURIComponent(p.supportEmail)+'?subject='+encodeURIComponent('Permintaan bantuan instalasi SAS');box.append(text,link);
}).catch(()=>{});
if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.08});
  document.documentElement.classList.add('reveal-enabled');document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
}
