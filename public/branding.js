'use strict';
window.sasBrandingReady = fetch('/api/config')
  .then(response => { if (!response.ok) throw new Error('Identitas tidak tersedia'); return response.json(); })
  .then(brand => {
    window.SAS_BRAND = brand;
    document.title = `${location.pathname.startsWith('/login') ? 'Masuk · ' : ''}${brand.appName}`;
    document.querySelectorAll('[data-brand]').forEach(el => {
      el.textContent = brand[el.dataset.brand] || '';
    });
    return brand;
  }).catch(() => {
    window.SAS_BRAND = { appName: 'Sistem Akuntansi Sekolah (SAS) Open Source',
      institutionName: 'Yayasan Pendidikan Contoh', schoolName: 'Sekolah SAS' };
    return window.SAS_BRAND;
  });
