/* ¥C929 — Cross-page counter for AviaTrust ecosystem
   Obfuscated, cross-page, tamper-resistant */
(function(){
  var _0x4a2f = ['counter','visitors','holders','clients','startTime','lastUpdate','hash'];
  var _0x1b8c = ['c929_','_salt_','2026_','aviatrust'];
  var _0x9d3e = _0x1b8c[0] + _0x1b8c[2] + _0x1b8c[3];
  var _0x7f1a = 'c929';

  var SK = {
    counter:  _0x7f1a + '_' + _0x4a2f[0],
    visitors: _0x7f1a + '_' + _0x4a2f[1],
    holders:  _0x7f1a + '_' + _0x4a2f[2],
    clients:  _0x7f1a + '_' + _0x4a2f[3],
    startTime:_0x7f1a + '_' + _0x4a2f[4],
    lastUpdate:_0x7f1a + '_' + _0x4a2f[5],
    hash:     _0x7f1a + '_' + _0x4a2f[6]
  };

  var SEED_VISITORS = 2030;
  var SEED_HOLDERS  = 0;
  var SEED_CLIENTS  = 0;
  var GROWTH_VISITORS = 7;
  var GROWTH_HOLDERS  = 0.05;
  var GROWTH_CLIENTS  = 0.025;

  function _hash(v){
    var h = 0x811c9dc5;
    var s = String(v) + _0x9d3e;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function _sign(v, h, c, s){
    return _hash(v + '|' + h + '|' + c + '|' + s);
  }

  function _save(v, h, c, s){
    var n = Date.now();
    var sig = _sign(v, h, c, s);
    var payload = {
      v: v, h: h, c: c, s: s, t: n, k: sig
    };
    var encoded = btoa(JSON.stringify(payload));
    try {
      localStorage.setItem(SK.counter, encoded);
      localStorage.setItem(SK.visitors, String(v));
      localStorage.setItem(SK.holders, String(h));
      localStorage.setItem(SK.clients, String(c));
      localStorage.setItem(SK.startTime, String(s));
      localStorage.setItem(SK.lastUpdate, String(n));
      localStorage.setItem(SK.hash, sig);
    } catch(e){}
  }

  function _load(){
    try {
      var raw = localStorage.getItem(SK.counter);
      if (raw) {
        try {
          var p = JSON.parse(atob(raw));
          if (p.k === _sign(p.v, p.h, p.c, p.s)) {
            return { visitors: p.v, holders: p.h, clients: p.c, startTime: p.s, lastUpdate: p.t };
          }
        } catch(e){}
      }
      var sv = parseInt(localStorage.getItem(SK.visitors));
      var sh = parseInt(localStorage.getItem(SK.holders));
      var sc = parseInt(localStorage.getItem(SK.clients));
      var ss = parseInt(localStorage.getItem(SK.startTime));
      var shs = localStorage.getItem(SK.hash);
      if (!isNaN(sv) && shs === _sign(sv, sh, sc, ss)) {
        return { visitors: sv, holders: sh, clients: sc, startTime: ss, lastUpdate: Date.now() };
      }
    } catch(e){}
    return null;
  }

  var state = _load();
  var now = Date.now();
  if (!state) {
    state = { visitors: SEED_VISITORS, holders: SEED_HOLDERS, clients: SEED_CLIENTS, startTime: now, lastUpdate: now };
    _save(state.visitors, state.holders, state.clients, state.startTime);
  }

  var _tick = function(){
    var n = Date.now();
    var elapsed = Math.floor((n - state.startTime) / 1000);
    var visitors = SEED_VISITORS + elapsed * GROWTH_VISITORS;
    var holders  = Math.floor(elapsed * GROWTH_HOLDERS);
    var clients  = Math.floor(elapsed * GROWTH_CLIENTS);

    var nodes = document.querySelectorAll('.' + _0x4a2f[1].slice(0,7) + 's');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = visitors.toLocaleString();
    }
    var nh = document.querySelectorAll('.counter-' + _0x4a2f[2].slice(0,7) + 's');
    for (var j = 0; j < nh.length; j++) {
      nh[j].textContent = holders.toLocaleString();
    }
    var nc = document.querySelectorAll('.counter-' + _0x4a2f[3].slice(0,7) + 's');
    for (var k = 0; k < nc.length; k++) {
      nc[k].textContent = clients.toLocaleString();
    }

    var ts = new Date(n).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    var tnodes = document.querySelectorAll('.counter-visitor-time');
    for (var m = 0; m < tnodes.length; m++) tnodes[m].textContent = 'Updated: ' + ts;

    if (n - state.lastUpdate > 10000) {
      _save(visitors, holders, clients, state.startTime);
      state.lastUpdate = n;
    }
  };

  window.addEventListener('storage', function(e){
    if (e.key === SK.visitors) { _load(); }
  });

  window.addEventListener('beforeunload', function(){
    var n = Date.now();
    var elapsed = Math.floor((n - state.startTime) / 1000);
    _save(
      SEED_VISITORS + elapsed * GROWTH_VISITORS,
      Math.floor(elapsed * GROWTH_HOLDERS),
      Math.floor(elapsed * GROWTH_CLIENTS),
      state.startTime
    );
  });

  _tick();
  setInterval(_tick, 1000);
})();
