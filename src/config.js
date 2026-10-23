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
  // PostgreSQL (backend produksi multi-user)
  databaseUrl: process.env.DATABASE_URL || 'postgres://sas:sas_local_password@127.0.0.1:5432/sas',
  isProd: process.env.NODE_ENV === 'production',
};

if (config.isProd && (!process.env.SESSION_SECRET || config.sessionSecret.length < 32 || config.sessionSecret.includes('local-demo-only'))) {
  throw new Error('SESSION_SECRET wajib minimal 32 karakter pada produksi.');
}

module.exports = config;
