'use strict';
const path = require('path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');

const config = {
  root: ROOT,
  appName: process.env.APP_NAME || 'Sistem Akuntansi Sekolah (SAS) Open Source',
  institutionName: process.env.INSTITUTION_NAME || 'Yayasan Pendidikan Contoh',
  schoolName: process.env.SCHOOL_NAME || 'Sekolah SAS',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '127.0.0.1',
  sessionSecret: process.env.SESSION_SECRET || 'sas-dev-secret-ganti-di-produksi',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true' ? 1 : false,
  demoMode: process.env.APP_DEMO_MODE === 'true',
  basePath: process.env.APP_BASE_PATH || '',
  // PostgreSQL (backend produksi multi-user)
  databaseUrl: process.env.DATABASE_URL || 'postgres://sas:sas_local_password@127.0.0.1:5432/sas',
  isProd: process.env.NODE_ENV === 'production',
};

if (config.basePath && !/^\/[a-zA-Z0-9_-]+$/.test(config.basePath)) throw new Error('APP_BASE_PATH harus berupa satu segmen, misalnya /demo.');
if (config.demoMode && config.basePath !== '/demo') throw new Error('Instalasi demo harus menggunakan APP_BASE_PATH=/demo.');
if (config.isProd && !config.demoMode && (!process.env.SESSION_SECRET || config.sessionSecret.length < 32 || config.sessionSecret.includes('local-demo-only'))) {
  throw new Error('SESSION_SECRET wajib minimal 32 karakter pada produksi.');
}

module.exports = config;
