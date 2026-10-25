'use strict';
const express = require('express');
const auth = require('../auth');
const audit = require('../services/audit');
const { h, ip } = require('./helpers');
const { loginLimiter } = require('../middleware/rateLimiter');
const config = require('../config');

const router = express.Router();
router.use((req,res,next)=>{
  if (config.demoMode && !['GET','HEAD','OPTIONS'].includes(req.method)) return res.status(403).json({error:'Ruang demo hanya-baca; login sandi dan perubahan data tidak tersedia.'});
  next();
});

router.post('/login', loginLimiter, h(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await auth.authenticate(email, password);
  if (!user) {
    loginLimiter.recordFailure(req);
    res.status(401).json({ error: 'Email atau kata sandi salah.' });
    return;
  }
  loginLimiter.reset(req);
  req.session.userId = user.id;
  req.session.isDemo = false;
  await audit.log(user, 'login', 'user', user.id, null, ip(req));
  res.json({ user });
}));

// Jalur lama tidak boleh membuat akun atau sesi pada database utama.
router.post('/demo-login', (req,res)=>res.status(410).json({error:'Demo telah dipindahkan ke ruang terpisah.',demoUrl:'/demo/app'}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', h(async (req, res) => {
  if (config.demoMode) return res.json({user:await auth.getDemoUser(),isDemo:true});
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Belum masuk.' });
  const user = await auth.getUser(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Sesi tidak valid.' });
  res.json({ user, isDemo: !!req.session.isDemo });
}));

router.post('/change-password', auth.requireAuth, h(async (req) => {
  const { old_password, new_password } = req.body || {};
  await auth.changePassword(req.user.id, old_password, new_password);
  await audit.log(req.user, 'change_password', 'user', req.user.id, null, ip(req));
  return { ok: true };
}));

module.exports = router;
