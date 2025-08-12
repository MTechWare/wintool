// Simple sliding window rate limiter
// Usage:
//   const { checkRateLimit } = createRateLimiter({ windowMs: 60000, max: 30 });
//   if (!checkRateLimit('operation-key')) { /* deny */ }

function createRateLimiter({ windowMs = 60000, max = 30 } = {}) {
  const store = new Map();

  function checkRateLimit(operation) {
    const now = Date.now();
    const key = operation;

    if (!store.has(key)) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    const limit = store.get(key);
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return true;
    }

    if (limit.count >= max) {
      return false;
    }

    limit.count++;
    return true;
  }

  return { checkRateLimit };
}

module.exports = { createRateLimiter };
