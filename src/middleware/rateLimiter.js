'use strict';

/**
 * In-memory sliding-window rate limiter for sensitive endpoints (e.g. login).
 * Zero external dependencies. Automatically resets on successful action.
 */
class RateLimiter {
  constructor({ windowMs = 15 * 60 * 1000, max = 10, message = 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi nanti.' } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map(); // ip -> [timestamps]

    const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  _getKey(req) {
    // Express menghitung req.ip sesuai trust proxy; jangan percaya header mentah.
    const raw = req.ip || req.socket?.remoteAddress || 'unknown';
    return raw.replace(/^::ffff:/, ''); // normalisasi ipv4-mapped
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter(t => now - t < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Bypass saat menjalankan tes otomatis
      if (process.env.NODE_ENV === 'test') return next();

      const key = this._getKey(req);
      const now = Date.now();
      const timestamps = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
      this.hits.set(key, timestamps);

      if (timestamps.length >= this.max) {
        const oldest = timestamps[0];
        const retryAfterSec = Math.max(1, Math.ceil((this.windowMs - (now - oldest)) / 1000));
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          error: this.message,
          retryAfter: retryAfterSec,
        });
      }
      next();
    };
  }

  recordFailure(req) {
    if (process.env.NODE_ENV === 'test') return;
    const key = this._getKey(req);
    const now = Date.now();
    const timestamps = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
    timestamps.push(now);
    this.hits.set(key, timestamps);
  }

  reset(req) {
    const key = this._getKey(req);
    this.hits.delete(key);
  }
}

const loginLimiterInstance = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Terlalu banyak percobaan masuk yang gagal dari alamat ini. Silakan coba lagi dalam 15 menit.',
});

const loginLimiter = loginLimiterInstance.middleware();
loginLimiter.recordFailure = (req) => loginLimiterInstance.recordFailure(req);
loginLimiter.reset = (req) => loginLimiterInstance.reset(req);

module.exports = { RateLimiter, loginLimiter };
