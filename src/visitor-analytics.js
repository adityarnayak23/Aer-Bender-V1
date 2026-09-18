// =========================================================================
// 📊 VisitorAnalytics: Lightweight Anonymous Visit & Unique Visitor Counter
// =========================================================================
// Tracks total visits and unique visitors without storing any PII.
// Backed by resilient cloud KV endpoints with local caching & instant display.

class VisitorAnalytics {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'https://countapi.mileshilliard.com/api/v1';
    this.totalKey = options.totalKey || 'aerbender-app-total-visits-v1';
    this.uniqueKey = options.uniqueKey || 'aerbender-app-unique-visits-v1';

    this.totalEl = options.totalElement || null;
    this.uniqueEl = options.uniqueElement || null;
    this.stampBtn = options.stampBtn || null;

    this.storagePrefix = 'aer_bender_analytics_';
    this.cachedTotal = 0;
    this.cachedUnique = 0;
    this.isInitialized = false;

    // Load initial values from localStorage cache
    try {
      if (typeof localStorage !== 'undefined') {
        this.cachedTotal = parseInt(localStorage.getItem(this.storagePrefix + 'total') || '0', 10);
        this.cachedUnique = parseInt(localStorage.getItem(this.storagePrefix + 'unique') || '0', 10);
      }
    } catch (e) {}
  }

  // Resolve DOM elements if not passed directly in options
  resolveElements() {
    if (typeof document === 'undefined') return;
    if (!this.totalEl) this.totalEl = document.getElementById('totalVisitsCount');
    if (!this.uniqueEl) this.uniqueEl = document.getElementById('uniqueVisitsCount');
    if (!this.stampBtn) this.stampBtn = document.getElementById('creatorStampBtn');
  }

  // Initialize tracking on page load
  async init() {
    this.resolveElements();
    this.updateUI(this.cachedTotal, this.cachedUnique);

    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Detect if this is a brand new unique visitor to Aer Bender
    let isNewVisitor = false;
    try {
      if (typeof localStorage !== 'undefined') {
        const storedVisitorId = localStorage.getItem(this.storagePrefix + 'visitor_id');
        if (!storedVisitorId) {
          isNewVisitor = true;
          const newId = 'ab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem(this.storagePrefix + 'visitor_id', newId);
        }
      }
    } catch (e) {
      isNewVisitor = false;
    }

    // 2. Prevent duplicate visit increments on fast page refreshes within the same browser session
    let isNewVisitSession = true;
    try {
      if (typeof sessionStorage !== 'undefined') {
        const sessionActive = sessionStorage.getItem(this.storagePrefix + 'session_active');
        if (sessionActive) {
          isNewVisitSession = false;
        } else {
          sessionStorage.setItem(this.storagePrefix + 'session_active', String(Date.now()));
        }
      }
    } catch (e) {
      isNewVisitSession = true;
    }

    // 3. Fetch/increment counters from cloud API
    await this.syncCounts(isNewVisitSession, isNewVisitor);
  }

  // Sync counts with cloud API
  async syncCounts(incrementTotal = false, incrementUnique = false) {
    try {
      const totalPromise = incrementTotal
        ? this.hit(this.totalKey)
        : this.get(this.totalKey);

      const uniquePromise = incrementUnique
        ? this.hit(this.uniqueKey)
        : this.get(this.uniqueKey);

      const [totalRes, uniqueRes] = await Promise.all([totalPromise, uniquePromise]);

      if (typeof totalRes === 'number' && totalRes > 0) {
        this.cachedTotal = totalRes;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.storagePrefix + 'total', String(totalRes));
          }
        } catch (e) {}
      }

      if (typeof uniqueRes === 'number' && uniqueRes > 0) {
        this.cachedUnique = uniqueRes;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.storagePrefix + 'unique', String(uniqueRes));
          }
        } catch (e) {}
      }

      this.updateUI(this.cachedTotal, this.cachedUnique);
    } catch (err) {
      console.warn('VisitorAnalytics: Sync notice (using cached counts):', err);
      // Ensure at least 1 count displayed if fresh local instance
      if (!this.cachedTotal) this.cachedTotal = 1;
      if (!this.cachedUnique) this.cachedUnique = 1;
      this.updateUI(this.cachedTotal, this.cachedUnique);
    }
  }

  // Refresh counts without incrementing (e.g. when opening Get in Touch modal)
  async refresh() {
    this.resolveElements();
    this.updateUI(this.cachedTotal, this.cachedUnique);
    await this.syncCounts(false, false);
  }

  // Hit endpoint: increments and returns new value
  async hit(key) {
    try {
      const res = await fetch(`${this.apiUrl}/hit/${encodeURIComponent(key)}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data && typeof data.value === 'number') ? data.value : null;
    } catch (e) {
      return null;
    }
  }

  // Get endpoint: returns current value without incrementing
  async get(key) {
    try {
      const res = await fetch(`${this.apiUrl}/get/${encodeURIComponent(key)}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        // If key not yet created, initialize it with hit
        return await this.hit(key);
      }
      const data = await res.json();
      if (data && typeof data.value === 'number') {
        return data.value;
      }
      if (data && data.error === 'Key not found') {
        return await this.hit(key);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Format numbers cleanly with thousand separators
  formatCount(n) {
    if (n == null || isNaN(n) || n <= 0) return '—';
    return Number(n).toLocaleString();
  }

  // Update DOM elements
  updateUI(total, unique) {
    this.resolveElements();

    if (this.totalEl) {
      this.totalEl.textContent = this.formatCount(total);
    }
    if (this.uniqueEl) {
      this.uniqueEl.textContent = this.formatCount(unique);
    }

    if (this.stampBtn && total > 0) {
      const formattedTotal = this.formatCount(total);
      const formattedUnique = this.formatCount(unique);
      this.stampBtn.setAttribute(
        'title',
        `Meet the creator & get in touch • Visits: ${formattedTotal} | Unique: ${formattedUnique}`
      );
    }
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.VisitorAnalytics = VisitorAnalytics;
}

// Export for Node test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisitorAnalytics;
}
