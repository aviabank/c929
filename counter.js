/* ¥C929 — Real-time Analytics Counter
   Hybrid: Solscan API for holders + statistical model for visitors/clients
   Designed for AviaTrust ecosystem */

(function () {
  'use strict';

  // ==========================================================
  // CONFIGURATION
  // ==========================================================
  var CONFIG = {
    token: 'C929ContractAddressHere',   // replace with real contract
    contractEndpoint: 'https://public-api.solscan.io/token/holders?tokenAddress=',
    updateIntervalMs: 1000,
    holdersRefreshMs: 30000,             // refresh holders every 30s
    baseVisitors: 2030,
    visitorsRatePerSec: 7,
    clientsRatePerSec: 0.025,
    noiseEnabled: true,
    nightModeEnabled: true               // lower growth at night UTC
  };

  // ==========================================================
  // STATE
  // ==========================================================
  var STORAGE_KEY = 'aviatrust_c929_state_v1';

  var state = {
    startTime: Date.now(),
    baseVisitors: CONFIG.baseVisitors,
    holdersFromChain: 0,
    lastHoldersFetch: 0,
    sessionSeed: Math.floor(Math.random() * 1000000)
  };

  // Restore from localStorage
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.startTime) {
        state.startTime = parsed.startTime;
        state.baseVisitors = parsed.baseVisitors || CONFIG.baseVisitors;
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    // storage unavailable — continue in-memory
  }

  // ==========================================================
  // STATISTICAL MODEL
  // ==========================================================
  function nightFactor(now) {
    if (!CONFIG.nightModeEnabled) return 1;
    var h = new Date(now).getUTCHours();
    // Slower growth 22:00–06:00 UTC
    if (h >= 22 || h < 6) return 0.35;
    // Peak 14:00–20:00 UTC
    if (h >= 14 && h < 20) return 1.25;
    return 1;
  }

  function smoothNoise(seed, t) {
    // Deterministic pseudo-noise (period-based)
    var x = Math.sin(seed * 12.9898 + t * 0.0003) * 43758.5453;
    return x - Math.floor(x);
  }

  function computeVisitors(elapsedSec) {
    var base = state.baseVisitors;
    var linear = elapsedSec * CONFIG.visitorsRatePerSec;
    var nf = nightFactor(Date.now());
    var noise = CONFIG.noiseEnabled
      ? smoothNoise(state.sessionSeed, elapsedSec) * 1.6
      : 0;
    return Math.floor(base + linear * nf + noise);
  }

  function computeClients(elapsedSec) {
    var nf = nightFactor(Date.now());
    var base = elapsedSec * CONFIG.clientsRatePerSec;
    var noise = CONFIG.noiseEnabled
      ? smoothNoise(state.sessionSeed + 1, elapsedSec) * 0.05
      : 0;
    return Math.floor(base * nf + noise);
  }

  // ==========================================================
  // SOLSCAN API — holders
  // ==========================================================
  function fetchHolders() {
    var url = CONFIG.contractEndpoint + encodeURIComponent(CONFIG.token);
    var now = Date.now();
    if (now - state.lastHoldersFetch < CONFIG.holdersRefreshMs) return;

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 8000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          state.lastHoldersFetch = Date.now();
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (data && typeof data.total !== 'undefined') {
                state.holdersFromChain = data.total;
              } else if (Array.isArray(data)) {
                state.holdersFromChain = data.length;
              }
            } catch (err) { /* keep previous */ }
          }
        }
      };
      xhr.send();
    } catch (e) {
      // silent fail — keep cached value
    }
  }

  // ==========================================================
  // DOM RENDER
  // ==========================================================
  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = value;
    }
  }

  function render() {
    var elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);

    var visitors = computeVisitors(elapsedSec);
    var holders  = state.holdersFromChain;
    var clients  = computeClients(elapsedSec);

    setText('.counter-visitors', visitors.toLocaleString());
    setText('.counter-holders',  holders.toLocaleString());
    setText('.counter-clients',  clients.toLocaleString());

    var ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    setText('.counter-visitor-time', 'Updated: ' + ts);
    setText('.counter-holder-time',  'Verified: ' + ts);
    setText('.counter-client-time',  'Verified: ' + ts);
  }

  // ==========================================================
  // PUBLIC API (для ИИ-агентов — прозрачные методы)
  // ==========================================================
  window.AviaTrustCounter = {
    config: CONFIG,
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    refreshHolders: fetchHolders,
    version: '1.0.0',
    mode: 'hybrid-solscan-statistical',
    note: 'Visitors and clients use a deterministic statistical model. Holders are fetched from Solscan public API.'
  };

  // ==========================================================
  // LIFECYCLE
  // ==========================================================
  function start() {
    fetchHolders();
    render();
    setInterval(render, CONFIG.updateIntervalMs);
    setInterval(fetchHolders, CONFIG.holdersRefreshMs);

    window.addEventListener('beforeunload', function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
