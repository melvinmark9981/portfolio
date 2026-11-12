/* eslint-disable */
/*
 * Swarm Rebuild engine — ported from the standalone swarm-rebuild.js demo.
 *
 * A crew of cursor "agents" scans the page, hides every layer (without moving the
 * layout), then rebuilds each layer as the visitor scrolls: boxes are framed and
 * filled, text is typed in. Afterwards the agents stay and follow the mouse.
 *
 * Imported lazily by components/SwarmRebuild.tsx; only runs for visitors who are
 * eligible (desktop, no reduced-motion, not a bot).
 *
 * Safety guarantees (recruiter safe):
 *  - Every entry point (frame loop, event handlers, timers) is wrapped; if anything
 *    throws, the effect is torn down and the page is restored exactly.
 *  - Original text nodes are put back (not re-created), and the temporary
 *    <span class="sr-tn"> wrappers are removed when the build finishes, so the DOM
 *    ends up identical to the page without the effect.
 *  - The scan screen and all overlays use pointer-events:none. Only the small
 *    toolbar (with the Skip button) is clickable.
 *  - Skip button, Esc, and an 8s watchdog on the scan.
 *
 * Options: { mode: 'full' | 'agents', agents, speed (1|2|4), line, bg, accent, onFinish(reason) }
 *   mode 'agents' = no scan, no hiding, no toolbar: just the cursor agents.
 *   onFinish reasons: 'done' | 'skipped' | 'error' | 'destroyed'
 */
export function startSwarmRebuild(options) {
  'use strict';

  var opt = options || {};
  var doc = document;
  var html = doc.documentElement;
  var W = window.innerWidth;
  var H = window.innerHeight;

  var mode = opt.mode === 'agents' ? 'agents' : 'full';
  var lineOpt = parseFloat(opt.line);
  var cfg = {
    agents: Math.max(1, Math.min(40, parseInt(opt.agents, 10) || 14)),
    line: (lineOpt > 0 && lineOpt <= 1) ? lineOpt : 0.88,
    bg: opt.bg || '#000',
    accent: opt.accent || '#3D8BFF'
  };
  if (W < 640) cfg.agents = Math.min(cfg.agents, 8);
  var speed = (opt.speed === 1 || opt.speed === 2 || opt.speed === 4) ? opt.speed : 1;
  var ACC = cfg.accent;
  var Z = 2147483000;

  var NAMES = ['Ada', 'Bo', 'Cyd', 'Dex', 'Eli', 'Fen', 'Gus', 'Hal', 'Ivy', 'Jun', 'Kai', 'Lux', 'Mo', 'Nia', 'Oz', 'Pip'];
  var COLORS = ['#FF5C8A', '#FFC233', '#A970FF', '#2DD4BF', '#4ADE80', '#FF8A3D', '#38BDF8', '#F43F5E',
                '#C084FC', '#FACC15', '#34D399', '#60A5FA', '#FB7185', '#F97316', '#22D3EE', '#A3E635'];
  var TIP = Math.atan2(-12.6, -6.21); // direction from the arrow's centre to its tip

  /* ---------------------------------------------------------------- lifecycle */
  var destroyed = false;
  var finishReported = false;
  var cleanups = [];   // run on destroy
  var timeouts = [];
  var raf = 0;
  var prevScrollRestoration = null;

  function on(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    cleanups.push(function () { target.removeEventListener(type, fn, options); });
  }
  function later(fn, ms) {
    var id = setTimeout(function () { if (!destroyed) guarded(fn)(); }, ms);
    timeouts.push(id);
    return id;
  }
  function guarded(fn) {
    return function () {
      if (destroyed) return;
      try { return fn.apply(this, arguments); } catch (err) { fail(err); }
    };
  }
  function report(reason) {
    if (finishReported) return;
    finishReported = true;
    try { if (typeof opt.onFinish === 'function') opt.onFinish(reason); } catch (e) {}
  }
  function fail(err) {
    if (destroyed) return;
    try { console.warn('[swarm-rebuild] switched off after an error; the page is shown normally.', err); } catch (e) {}
    teardown('error');
  }

  /* --------------------------------------------------------------------- css */
  var MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  var UI = 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var CSS = [
    // scrollbar-gutter keeps the layout width identical while locked, so nothing shifts when the lock lifts
    'html.sr-lock,html.sr-lock body{overflow:hidden!important}html.sr-lock{scrollbar-gutter:stable}',
    '#sr-root{position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:' + Z + '}',
    '#sr-canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}',
    '#sr-frames{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none}',
    '.sr-frame{position:absolute;box-sizing:border-box;border:1px solid ' + ACC + ';opacity:1;transition:opacity .25s ease}',
    '.sr-frame.sr-out{opacity:0}',
    '.sr-h{position:absolute;display:block;width:7px;height:7px;box-sizing:border-box;background:#fff;border:1px solid ' + ACC + '}',
    '.sr-h.tl{left:-5px;top:-5px}.sr-h.tr{right:-5px;top:-5px}.sr-h.bl{left:-5px;bottom:-5px}.sr-h.br{right:-5px;bottom:-5px}',
    '.sr-sz{position:absolute;left:50%;top:100%;margin-top:6px;transform:translateX(-50%);background:' + ACC +
      ';color:#fff;font:500 10px/1 ' + MONO + ';padding:3px 6px;border-radius:4px;white-space:nowrap}',
    '.sr-caret{position:absolute;width:2px;border-radius:1px;pointer-events:none}',
    /* hiding without moving layout */
    '.sr-hide-paint{background:transparent!important;background-image:none!important;border-color:transparent!important;' +
      'box-shadow:none!important;outline-color:transparent!important}',
    '.sr-hide-media{opacity:0!important}',
    '.sr-w{display:inline}',
    '.sr-rest{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;' +
      'text-decoration-color:transparent!important}',
    '.sr-reveal{transition:background-color .45s ease,border-color .45s ease,box-shadow .6s ease,opacity .45s ease!important}',
    /* scan screen: never intercepts clicks */
    '#sr-scan{position:fixed;left:0;top:0;right:0;bottom:0;background:' + cfg.bg + ';z-index:' + (Z + 1) +
      ';display:flex;align-items:center;justify-content:center;transition:opacity .55s ease;pointer-events:none}',
    '#sr-scan.sr-out{opacity:0}',
    '.sr-chip{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff;' +
      'background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.04));' +
      'border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 44px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.22);' +
      '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:sr-pulse 1.5s ease-in-out infinite}',
    '.sr-chip>*{width:30px;height:30px;display:block}',
    '@keyframes sr-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}',
    /* agents */
    '#sr-agents{position:fixed;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:' + (Z + 2) + '}',
    '.sr-agent{position:absolute;left:0;top:0;width:0;height:0;color:var(--c);will-change:transform;pointer-events:none}',
    '.sr-arrow{position:absolute;left:0;top:0;overflow:visible;transform-origin:0 0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))}',
    '.sr-beam{position:absolute;left:-5px;top:-10px;display:none;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}',
    '.sr-agent.sr-typing .sr-arrow{display:none}.sr-agent.sr-typing .sr-beam{display:block}',
    '.sr-tag{position:absolute;left:13px;top:19px;opacity:0;transition:opacity .18s ease;background:var(--c);color:#0A0B0E;' +
      'font:600 10.5px/1 ' + UI + ';padding:3px 7px;border-radius:7px;white-space:nowrap}',
    '.sr-agent.sr-work .sr-tag{opacity:1}',
    /* toolbar: the only clickable part of the effect */
    '#sr-hud{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:' + (Z + 3) +
      ';display:flex;align-items:center;gap:12px;padding:8px 8px 8px 14px;max-width:calc(100vw - 20px);' +
      'background:rgba(22,23,27,.9);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
      'border:1px solid rgba(255,255,255,.08);border-radius:13px;box-shadow:0 12px 44px rgba(0,0,0,.5);' +
      'color:#ECEEF4;font:500 12.5px/1 ' + UI + ';white-space:nowrap;pointer-events:auto;transition:opacity .4s ease}',
    '#sr-hud.sr-gone{opacity:0;pointer-events:none}',
    '#sr-hud *{box-sizing:border-box}',
    '#sr-hud .sr-av{display:none;align-items:center}',
    '#sr-hud.sr-st-build .sr-av{display:flex}',
    '#sr-hud .sr-av i{width:21px;height:21px;border-radius:50%;margin-left:-7px;border:2px solid #16171B;background:var(--c);' +
      'color:#0A0B0E;font:700 9.5px/17px ' + UI + ';text-align:center;font-style:normal}',
    '#sr-hud .sr-av i:first-child{margin-left:0}',
    '#sr-hud .sr-lb{display:flex;gap:10px;align-items:center;font-variant-numeric:tabular-nums}',
    '#sr-hud .sr-ag{color:#8B92A5}',
    '#sr-hud .sr-bar{width:64px;height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;flex:none}',
    '#sr-hud .sr-bar i{display:block;height:100%;width:0;background:' + ACC + ';border-radius:2px}',
    '#sr-hud.sr-st-done .sr-bar,#sr-hud.sr-st-done .sr-skip{display:none}',
    '#sr-hud .sr-skip{appearance:none;-webkit-appearance:none;border:0;border-radius:8px;background:rgba(255,255,255,.1);' +
      'color:#ECEEF4;font:600 12px/1 ' + UI + ';padding:8px 14px;cursor:pointer;margin:0}',
    '#sr-hud .sr-skip:hover{background:rgba(255,255,255,.2)}',
    '#sr-hud .sr-skip:focus-visible{outline:2px solid ' + ACC + ';outline-offset:2px}',
    '@media (max-width:560px){#sr-hud .sr-av,#sr-hud.sr-st-build .sr-av,#sr-hud .sr-bar,#sr-hud .sr-ag{display:none}' +
      '#sr-hud{gap:10px;padding-left:12px}}'
  ].join('\n');

  /* ----------------------------------------------------------------- helpers */
  function mk(tag, cls, id, parent) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (id) e.id = id;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOutCubic(t) { var u = 1 - t; return 1 - u * u * u; }
  function angDiff(d) {
    d = (d + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    return d - Math.PI;
  }
  function fmt(n) { return Number(n).toLocaleString(); }
  function nowS() { return performance.now() / 1000; }
  function removeNode(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }

  /* --------------------------------------------------------------------- boot */
  var styleEl = mk('style', null, 'sr-style', html);
  styleEl.textContent = CSS;

  var rootEl = mk('div', null, 'sr-root', html);
  rootEl.setAttribute('aria-hidden', 'true');
  var canvas = mk('canvas', null, 'sr-canvas', rootEl);
  var framesEl = mk('div', null, 'sr-frames', rootEl);
  var ctx = canvas.getContext ? canvas.getContext('2d') : null;
  var dpr = 1;

  var agentsEl = mk('div', null, 'sr-agents', html);
  agentsEl.setAttribute('aria-hidden', 'true');

  var scanEl = null, chip = null, hud = null;
  var hudAv = null, hudAg = null, hudTx = null, hudBar = null, btnSkip = null;
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="currentColor"/></svg>';

  if (mode === 'full') {
    scanEl = mk('div', null, 'sr-scan', html);
    scanEl.setAttribute('aria-hidden', 'true');
    chip = mk('div', 'sr-chip', null, scanEl);
    chip.innerHTML = STAR;

    hud = mk('div', 'sr-st-scan', 'sr-hud', html);
    hud.setAttribute('role', 'status');
    hud.innerHTML =
      '<div class="sr-av"></div>' +
      '<div class="sr-lb"><span class="sr-ag"></span><span class="sr-tx"></span></div>' +
      '<div class="sr-bar"><i></i></div>' +
      '<button type="button" class="sr-skip" aria-label="Skip the entrance animation">Skip</button>';
    hudAv = hud.querySelector('.sr-av');
    hudAg = hud.querySelector('.sr-ag');
    hudTx = hud.querySelector('.sr-tx');
    hudBar = hud.querySelector('.sr-bar i');
    btnSkip = hud.querySelector('.sr-skip');

    html.classList.add('sr-lock');
    try { prevScrollRestoration = history.scrollRestoration; history.scrollRestoration = 'manual'; } catch (e) {}
    // The boot class (set by the inline script in <head>) hands over to the scan screen.
    html.classList.remove('sr-boot');
  } else {
    html.classList.remove('sr-boot');
  }

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  sizeCanvas();

  /* ------------------------------------------------------------------ agents */
  var ARROW = '<svg class="sr-arrow" width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">' +
    '<path d="M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  var BEAM = '<svg class="sr-beam" width="10" height="20" viewBox="0 0 10 20" aria-hidden="true">' +
    '<path d="M2.5 1.5H7.5M5 1.5V18.5M2.5 18.5H7.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M2.5 1.5H7.5M5 1.5V18.5M2.5 18.5H7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  var agents = [];
  (function buildAgents() {
    var n = cfg.agents;
    var counts = [0, 0, 0];
    for (var i = 0; i < n; i++) counts[i % 3]++;
    var seen = [0, 0, 0];
    for (var j = 0; j < n; j++) {
      var color = COLORS[j % COLORS.length];
      var node = mk('div', 'sr-agent', null, agentsEl);
      node.style.setProperty('--c', color);
      node.innerHTML = ARROW + BEAM + '<span class="sr-tag"></span>';
      var fl = j % 3;
      var ang = Math.random() * Math.PI * 2;
      var a = {
        i: j, node: node, arrow: node.querySelector('.sr-arrow'), tag: node.querySelector('.sr-tag'),
        color: color, name: NAMES[j % NAMES.length],
        x: W / 2 + Math.cos(ang) * (W * 0.75 + 60), y: H / 2 + Math.sin(ang) * (H * 0.75 + 60),
        vx: 0, vy: 0, hvx: 0, hvy: 0, rot: 0, want: 0, look: null,
        tx: 0, ty: 0, k: 4, task: null,
        wx: 0, wy: 0, wt: 0, ph: Math.random() * 6.28,
        fl: fl, fi: seen[fl]++, fn: counts[fl]
      };
      a.tag.textContent = a.name;
      agents.push(a);
    }
    if (hudAv) {
      for (var m = 0; m < Math.min(5, agents.length); m++) {
        var av = mk('i', null, null, hudAv);
        av.style.setProperty('--c', agents[m].color);
        av.textContent = agents[m].name.charAt(0);
      }
    }
  })();

  /* ------------------------------------------------------------------ layers */
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, META: 1, BR: 1, LINK: 1, NOSCRIPT: 1, HEAD: 1, TITLE: 1,
    'NEXT-ROUTE-ANNOUNCER': 1 };
  var MEDIA_TAGS = { IMG: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1,
    IFRAME: 1, HR: 1, PROGRESS: 1, METER: 1, OBJECT: 1, EMBED: 1 };

  var layers = [];
  var collected = false;
  var cancelCollect = false;
  var trig = [];
  var doneCount = 0;

  function alphaOf(c) {
    if (!c || c === 'transparent') return 0;
    var m = c.match(/\(([^)]+)\)/);
    if (!m) return 1;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean);
    if (p.length < 4) return 1;
    var v = parseFloat(p[3]);
    if (isNaN(v)) return 1;
    return p[3].indexOf('%') >= 0 ? v / 100 : v;
  }
  function hasPaint(cs) {
    if (alphaOf(cs.backgroundColor) > 0) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
    var sides = ['Top', 'Right', 'Bottom', 'Left'];
    for (var i = 0; i < 4; i++) {
      var s = sides[i];
      var style = cs['border' + s + 'Style'];
      if (parseFloat(cs['border' + s + 'Width']) > 0 && style !== 'none' && style !== 'hidden' &&
          alphaOf(cs['border' + s + 'Color']) > 0) return true;
    }
    return false;
  }
  function mkLayer(el, type, parent) {
    return {
      el: el, type: type, parent: parent || null, hasText: false, isTn: false,
      state: 'pending', triggered: false,
      nodes: null, full: '', wrap: null, typed: null, rest: null,
      top: 0, left: 0, w: 0, h: 0, bottom: 0, right: 0, timer: 0
    };
  }

  function collectLayers() {
    var out = [];
    function wrapText(parentEl, textNode, parentLayer) {
      var span = doc.createElement('span');
      span.className = 'sr-tn';
      parentEl.insertBefore(span, textNode);
      span.appendChild(textNode);
      var tl = mkLayer(span, 'text', parentLayer);
      tl.hasText = true; tl.isTn = true;
      out.push(tl);
    }
    function visit(el, parent) {
      var tag = el.nodeName.toUpperCase();
      if (SKIP_TAGS[tag]) return;
      if (el.hasAttribute('data-sr-skip')) return;
      if (el.id && el.id.indexOf('sr-') === 0) return;
      var cls = el.getAttribute('class');
      if (cls && /(^|\s)sr-/.test(cls)) return;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none') return;

      if (MEDIA_TAGS[tag]) { out.push(mkLayer(el, 'media', parent)); return; }

      var paint = hasPaint(cs);
      var childCount = el.children.length;
      var hasText = childCount === 0 && /\S/.test(el.textContent);
      var layer = null;
      if (paint || hasText) {
        layer = mkLayer(el, paint ? 'box' : 'text', parent);
        layer.hasText = hasText;
        out.push(layer);
      }
      if (childCount === 0) return;
      var next = layer || parent;
      var nodes = Array.prototype.slice.call(el.childNodes);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.nodeType === 3) {
          if (/\S/.test(n.nodeValue)) wrapText(el, n, next);
        } else if (n.nodeType === 1) {
          visit(n, next);
        }
      }
    }
    // the body itself is not a layer; start at its children
    var top = Array.prototype.slice.call(doc.body.childNodes);
    for (var i = 0; i < top.length; i++) {
      var n = top[i];
      if (n.nodeType === 1) visit(n, null);
      else if (n.nodeType === 3 && /\S/.test(n.nodeValue)) wrapText(doc.body, n, null);
    }
    return out;
  }

  // Text is hidden by moving every original text node into a transparent wrapper, so every
  // character stays in the layout (nothing shifts). The ORIGINAL nodes are put back on
  // restore, so references held by React stay valid.
  function hideText(L) {
    if (L.wrap) restoreText(L);
    var el = L.el;
    L.nodes = Array.prototype.slice.call(el.childNodes);
    L.full = el.textContent;
    for (var i = 0; i < L.nodes.length; i++) el.removeChild(L.nodes[i]);
    var w = mk('span', 'sr-w');
    var t = mk('span', 'sr-typed', null, w);
    var r = mk('span', 'sr-rest', null, w);
    r.textContent = L.full;
    el.appendChild(w);
    L.wrap = w; L.typed = t; L.rest = r;
  }
  function restoreText(L) {
    if (!L.wrap) return;
    var el = L.el;
    removeNode(L.wrap);
    for (var i = 0; i < L.nodes.length; i++) el.appendChild(L.nodes[i]);
    L.wrap = L.typed = L.rest = null;
  }
  // Remove the temporary <span class="sr-tn"> and put its text node back where it was.
  function unwrapTn(L) {
    if (!L.isTn || !L.el || !L.el.parentNode) return;
    var span = L.el, p = span.parentNode;
    while (span.firstChild) p.insertBefore(span.firstChild, span);
    p.removeChild(span);
  }
  function hideLayer(L) {
    if (L.type === 'box') L.el.classList.add('sr-hide-paint');
    else if (L.type === 'media') L.el.classList.add('sr-hide-media');
    if (L.hasText) hideText(L);
  }
  function unhideStyle(L) {
    L.el.classList.remove('sr-hide-paint');
    L.el.classList.remove('sr-hide-media');
  }
  function finishLayer(L) {
    if (L.state === 'done') return;
    clearTimeout(L.timer);
    L.el.classList.remove('sr-reveal');
    unhideStyle(L);
    restoreText(L);
    L.state = 'done';
    L.triggered = true;
    doneCount++;
  }
  function revealLayer(L) {
    L.el.classList.add('sr-reveal');
    unhideStyle(L);
    clearTimeout(L.timer);
    L.timer = setTimeout(function () { try { L.el.classList.remove('sr-reveal'); } catch (e) {} }, 800);
    timeouts.push(L.timer);
  }
  // Put every layer back exactly as it was and remove all wrappers.
  function cleanupLayers() {
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      try {
        clearTimeout(L.timer);
        if (L.el) {
          L.el.classList.remove('sr-reveal');
          unhideStyle(L);
        }
        restoreText(L);
        unwrapTn(L);
        L.state = 'done';
      } catch (e) {}
    }
  }

  function collectAndHide() {
    if (collected || cancelCollect || destroyed) return;
    var logo = doc.querySelector('[data-sr-logo]');
    if (logo && chip) {
      var c = logo.cloneNode(true);
      c.removeAttribute('data-sr-logo');
      chip.innerHTML = '';
      chip.appendChild(c);
    }
    layers = collectLayers();
    for (var i = 0; i < layers.length; i++) hideLayer(layers[i]);
    collected = true;
    needCheck = true;
  }

  /* ------------------------------------------------------------------- state */
  var phase = mode === 'full' ? 'scan' : 'done';   // scan | build | done
  var scanT = 0;
  var buildT = 0;
  var buildTime = 0;
  var skipRequested = false;
  var skipped = false;
  var needCheck = false;
  var lastCheck = 0;
  var lastScroll = -99;
  var guideAlpha = 0;
  var lastWorking = -99;
  var last = 0;
  var hudCache = {};

  var mouse = { x: 0, y: 0, lx: 0, ly: 0, has: false, gone: true, lastMove: -99, dx: 0, dy: -1 };

  /* ----------------------------------------------------------------- frames */
  function makeFrame(handles) {
    var el = mk('div', 'sr-frame', null, framesEl);
    var lab = mk('span', 'sr-sz', null, el);
    if (handles) {
      mk('i', 'sr-h tl', null, el); mk('i', 'sr-h tr', null, el);
      mk('i', 'sr-h bl', null, el); mk('i', 'sr-h br', null, el);
    }
    return { el: el, lab: lab, x: 0, y: 0, w: 0, h: 0, text: '' };
  }
  function setFrame(f, x, y, w, h) {
    f.x = x; f.y = y; f.w = w; f.h = h;
    var s = f.el.style;
    s.left = x + 'px'; s.top = y + 'px'; s.width = Math.max(0, w) + 'px'; s.height = Math.max(0, h) + 'px';
    var txt = Math.round(w) + ' × ' + Math.round(h);
    if (txt !== f.text) { f.text = txt; f.lab.textContent = txt; }
  }
  function dropFrame(f) {
    if (!f) return;
    f.el.classList.add('sr-out');
    later(function () { removeNode(f.el); }, 280);
  }

  /* ------------------------------------------------------------------- tasks */
  function startTask(a, L) {
    L.state = 'active';
    a.task = {
      L: L, phase: 'travel', pt: 0, frame: null, caret: null, n: -1, dur: 0,
      x: L.left, y: L.top, w: L.w, h: L.h, px: L.left, py: L.top, cx: 0, cy: 0, ch: 0
    };
    a.node.classList.add('sr-work');
    lastWorking = nowS();
  }

  function readTask(a) {
    var t = a.task, L = t.L, r;
    if (L.type === 'text' && L.wrap) {
      r = L.wrap.getBoundingClientRect();
      var rs = L.wrap.getClientRects();
      var f0 = rs.length ? rs[0] : r;
      t.px = f0.left; t.py = f0.top;
    } else {
      r = L.el.getBoundingClientRect();
      t.px = r.left; t.py = r.top;
    }
    t.x = r.left; t.y = r.top; t.w = r.width; t.h = r.height;
    if (t.phase === 'type' && L.typed) {
      var c, tr = L.typed.getClientRects();
      if (t.n > 0 && tr.length) {
        c = tr[tr.length - 1];
        t.cx = c.right; t.cy = c.top; t.ch = c.height;
      } else {
        var rr = L.rest.getClientRects();
        c = rr.length ? rr[0] : r;
        t.cx = c.left; t.cy = c.top; t.ch = c.height || r.height;
      }
    }
  }

  function beginType(a) {
    var t = a.task, L = t.L;
    t.phase = 'type'; t.pt = 0; t.n = 0;
    t.dur = clamp(L.full.length * 0.018, 0.25, 1.3);
    a.node.classList.add('sr-typing');
    t.caret = mk('div', 'sr-caret', null, framesEl);
    t.caret.style.background = a.color;
    t.cx = t.x; t.cy = t.y; t.ch = 16;
  }

  function endTask(a) {
    var t = a.task;
    if (!t) return;
    var L = t.L;
    // (the sr-reveal timer is deliberately left running so the class is always removed)
    if (L.state !== 'done') {
      restoreText(L);
      if (L.state === 'pending' || L.state === 'active') {
        unhideStyle(L);
        L.state = 'done';
        doneCount++;
      }
    }
    dropFrame(t.frame);
    removeNode(t.caret);
    a.node.classList.remove('sr-typing');
    a.node.classList.remove('sr-work');
    a.task = null;
  }

  function stepTask(a, dt) {
    var t = a.task, L = t.L;
    t.pt += dt * speed;
    lastWorking = nowS();
    var e;
    switch (t.phase) {
      case 'travel':
        a.tx = t.px; a.ty = t.py; a.k = 6 + 3 * speed;
        if (Math.hypot(a.x - t.px, a.y - t.py) < 3 || t.pt > 1.2) {
          t.frame = makeFrame(L.type !== 'text');
          t.pt = 0;
          if (L.type === 'text') {
            t.phase = 'type';
            beginType(a);
          } else {
            t.phase = 'draw';
            t.dur = 0.22 + Math.min(0.34, Math.sqrt(Math.max(0, t.w * t.h)) / 1600);
          }
          setFrame(t.frame, t.x, t.y, L.type === 'text' ? t.w : 0, L.type === 'text' ? t.h : 0);
        }
        break;

      case 'draw':
        e = easeOutCubic(clamp(t.pt / t.dur, 0, 1));
        setFrame(t.frame, t.x, t.y, t.w * e, t.h * e);
        a.tx = t.x + t.w * e; a.ty = t.y + t.h * e; a.k = 18;
        if (t.pt >= t.dur) { t.phase = 'fill'; t.pt = 0; revealLayer(L); }
        break;

      case 'fill':
        setFrame(t.frame, t.x, t.y, t.w, t.h);
        e = Math.sin(t.pt * Math.PI * 6) * 3 * (1 - clamp(t.pt / 0.32, 0, 1));
        a.tx = t.x + t.w + e; a.ty = t.y + t.h + e; a.k = 18;
        if (t.pt >= 0.32) {
          if (L.hasText && L.wrap) beginType(a);
          else { t.phase = 'hold'; t.pt = 0; }
        }
        break;

      case 'type':
        setFrame(t.frame, t.x, t.y, t.w, t.h);
        var len = L.full.length;
        var n = Math.floor(len * clamp(t.pt / t.dur, 0, 1));
        if (n !== t.n && L.typed) {
          t.n = n;
          L.typed.textContent = L.full.slice(0, n);
          L.rest.textContent = L.full.slice(n);
        }
        var cs = t.caret.style;
        cs.left = (t.cx - 1) + 'px'; cs.top = t.cy + 'px'; cs.height = Math.max(8, t.ch) + 'px';
        a.tx = t.cx; a.ty = t.cy + t.ch * 0.5; a.k = 16;
        if (t.pt >= t.dur) { t.phase = 'hold'; t.pt = 0; }
        break;

      case 'hold':
        if (t.frame) setFrame(t.frame, t.x, t.y, t.w, t.h);
        if (t.pt >= 0.16) endTask(a);
        break;
    }
  }

  /* ---------------------------------------------------------- trigger / pick */
  function readLayers() {
    var toFinish = [];
    var i, L, r;
    // At the very bottom of the page the last stretch of content can never rise above the
    // build line, so once the page can't scroll any further, everything on screen counts.
    var atBottom = (window.pageYOffset || 0) + H >= (doc.documentElement.scrollHeight || 0) - 2;
    var limit = atBottom ? H : H * cfg.line;
    for (i = 0; i < layers.length; i++) {
      L = layers[i];
      if (L.state !== 'pending') continue;
      r = L.el.getBoundingClientRect();
      L.top = r.top; L.left = r.left; L.w = r.width; L.h = r.height; L.bottom = r.bottom; L.right = r.right;
      if (r.bottom < -60) { toFinish.push(L); continue; }
      if (r.top < limit) {
        if (r.width <= 0 || r.height <= 0 || r.right < 0 || r.left > W) toFinish.push(L);
        else L.triggered = true;
      }
    }
    for (i = 0; i < toFinish.length; i++) finishLayer(toFinish[i]);
    // a triggered child pulls its pending ancestors in, so nothing waits on a parent forever
    for (i = 0; i < layers.length; i++) {
      L = layers[i];
      if (L.state === 'pending' && L.triggered) {
        for (var p = L.parent; p && p.state === 'pending' && !p.triggered; p = p.parent) p.triggered = true;
      }
    }
    trig = [];
    for (i = 0; i < layers.length; i++) {
      L = layers[i];
      if (L.state === 'pending' && L.triggered) trig.push(L);
    }
  }

  function pickFor(a) {
    var best = -1, bs = Infinity;
    for (var i = 0; i < trig.length; i++) {
      var L = trig[i];
      if (L.parent && L.parent.state === 'pending') continue;
      var s = L.top + 0.3 * Math.hypot(a.x - L.left, a.y - L.top);
      if (s < bs) { bs = s; best = i; }
    }
    if (best < 0) return false;
    startTask(a, trig.splice(best, 1)[0]);
    return true;
  }

  function anyTask() {
    for (var i = 0; i < agents.length; i++) if (agents[i].task) return true;
    return false;
  }

  /* ---------------------------------------------------------- agent movement */
  function scanTarget(a, t) {
    var rx = Math.min(W * 0.32, 230), ry = Math.min(H * 0.28, 170);
    var dir = a.fl === 1 ? -1 : 1;
    var ang = (a.fi / a.fn) * Math.PI * 2 + a.fl * 2.1 + dir * t * 2.4 * speed;
    a.tx = W / 2 + Math.cos(ang) * rx + Math.sin(t * 3.1 + a.ph) * 10;
    a.ty = H / 2 + Math.sin(ang) * ry + Math.cos(t * 2.7 + a.ph * 1.7) * 10;
    a.k = 4.2;
    a.look = null;
  }
  function wanderTarget(a, now) {
    if (now > a.wt) {
      a.wx = Math.random() * W;
      a.wy = Math.random() * H * 0.88;
      a.wt = now + 1.2 + Math.random() * 2;
    }
    a.tx = a.wx; a.ty = a.wy; a.k = 1.4; a.look = null;
  }
  function followTarget(a, now) {
    var n = agents.length;
    if (now - mouse.lastMove < 0.35) {
      var lag = 34 + (a.i % 5) * 11;
      var spread = (((a.i * 37) % 60) - 30) * 0.9;
      a.tx = mouse.x - mouse.dx * lag + (-mouse.dy) * spread;
      a.ty = mouse.y - mouse.dy * lag + mouse.dx * spread;
      a.k = 3.2 + (a.i % 4) * 0.9;
      a.look = null;
    } else {
      var R = Math.max(46, n * 4.4);
      var ang = (Math.PI * 2 * a.i) / n + now * 0.35;
      a.tx = mouse.x + Math.cos(ang) * R;
      a.ty = mouse.y + Math.sin(ang) * R;
      a.k = 5;
      a.look = { x: mouse.x, y: mouse.y };
    }
  }

  function moveAgent(a, dt) {
    var f = 1 - Math.exp(-a.k * dt);
    var nx = a.x + (a.tx - a.x) * f;
    var ny = a.y + (a.ty - a.y) * f;
    a.vx = (nx - a.x) / dt;
    a.vy = (ny - a.y) / dt;
    a.x = nx; a.y = ny;
    var hf = 1 - Math.exp(-10 * dt);
    a.hvx += (a.vx - a.hvx) * hf;
    a.hvy += (a.vy - a.hvy) * hf;
    var want;
    if (a.task) want = 0;
    else if (a.look) want = Math.atan2(a.look.y - a.y, a.look.x - a.x) - TIP;
    else if (Math.hypot(a.hvx, a.hvy) > 25) want = Math.atan2(a.hvy, a.hvx) - TIP;
    else want = a.want;
    a.want = want;
    a.rot += angDiff(want - a.rot) * (1 - Math.exp(-12 * dt));
    a.arrow.style.transform = 'rotate(' + a.rot.toFixed(3) + 'rad)';
    a.node.style.transform = 'translate3d(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px,0)';
  }

  /* ----------------------------------------------------------------- guides */
  function drawGuides() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (guideAlpha < 0.01) return;
    var rulers = W >= 700;
    var R = rulers ? 20 : 0;
    var sx = window.pageXOffset || 0;
    var sy = window.pageYOffset || 0;
    var fr = [];
    for (var i = 0; i < agents.length; i++) {
      var t = agents[i].task;
      if (t && t.frame && t.frame.w > 0) fr.push(t.frame);
    }
    var k;

    var ly = Math.round(H * cfg.line) + 0.5;
    ctx.globalAlpha = guideAlpha;
    ctx.strokeStyle = '#FF453A';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R, ly); ctx.lineTo(W, ly); ctx.stroke();
    ctx.font = '600 9px ' + MONO;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    var lw = ctx.measureText('BUILD LINE').width + 10;
    ctx.fillStyle = 'rgba(10,11,14,.85)';
    ctx.fillRect(W - lw - 6, ly - 17, lw, 14);
    ctx.fillStyle = '#FF453A';
    ctx.fillText('BUILD LINE', W - 11, ly - 7);

    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = ACC;
    ctx.globalAlpha = guideAlpha * 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (k = 0; k < fr.length; k++) {
      var f = fr[k];
      if (f.x < R || f.y < R || f.x > W || f.y > H) continue;
      ctx.moveTo(R, Math.round(f.y) + 0.5); ctx.lineTo(f.x, Math.round(f.y) + 0.5);
      ctx.moveTo(Math.round(f.x) + 0.5, R); ctx.lineTo(Math.round(f.x) + 0.5, f.y);
    }
    ctx.stroke();
    ctx.restore();

    if (rulers) {
      ctx.globalAlpha = guideAlpha;
      ctx.fillStyle = 'rgba(17,18,22,.96)';
      ctx.fillRect(0, 0, W, R);
      ctx.fillRect(0, 0, R, H);
      ctx.fillStyle = ACC;
      ctx.globalAlpha = guideAlpha * 0.3;
      for (k = 0; k < fr.length; k++) {
        ctx.fillRect(Math.max(R, fr[k].x), 0, Math.max(0, fr[k].w), R);
        ctx.fillRect(0, Math.max(R, fr[k].y), R, Math.max(0, fr[k].h));
      }
      ctx.globalAlpha = guideAlpha;
      ctx.strokeStyle = 'rgba(236,238,244,.38)';
      ctx.fillStyle = 'rgba(236,238,244,.62)';
      ctx.font = '400 9px ' + MONO;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.beginPath();
      var p, pos, len;
      for (p = Math.floor(sx / 10) * 10; p <= sx + W; p += 10) {
        pos = p - sx;
        if (pos < R) continue;
        len = p % 100 === 0 ? R : (p % 50 === 0 ? 7 : 4);
        ctx.moveTo(Math.round(pos) + 0.5, R - len); ctx.lineTo(Math.round(pos) + 0.5, R);
      }
      for (p = Math.floor(sy / 10) * 10; p <= sy + H; p += 10) {
        pos = p - sy;
        if (pos < R) continue;
        len = p % 100 === 0 ? R : (p % 50 === 0 ? 7 : 4);
        ctx.moveTo(R - len, Math.round(pos) + 0.5); ctx.lineTo(R, Math.round(pos) + 0.5);
      }
      ctx.stroke();
      for (p = Math.ceil(sx / 100) * 100; p <= sx + W; p += 100) {
        pos = p - sx;
        if (pos < R) continue;
        ctx.fillText(String(p), pos + 3, 2);
      }
      for (p = Math.ceil(sy / 100) * 100; p <= sy + H; p += 100) {
        pos = p - sy;
        if (pos < R) continue;
        ctx.save();
        ctx.translate(2, pos - 3);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = 'top';
        ctx.fillText(String(p), 0, 0);
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(236,238,244,.18)';
      ctx.beginPath();
      ctx.moveTo(0, R + 0.5); ctx.lineTo(W, R + 0.5);
      ctx.moveTo(R + 0.5, 0); ctx.lineTo(R + 0.5, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* --------------------------------------------------------------------- hud */
  function setHud(key, val, el, prop) {
    if (hudCache[key] !== val) { hudCache[key] = val; el[prop] = val; }
  }
  function updateHud() {
    if (!hud) return;
    var total = layers.length;
    var label = '', ag = '', pct = 0;
    if (phase === 'scan') {
      var dur = 1.9 / speed;
      var prog = clamp(scanT / dur, 0, 1);
      var cnt = collected ? Math.round(total * prog) : 0;
      label = collected ? 'Scanning page… ' + fmt(cnt) + ' layers' : 'Scanning page…';
      pct = prog * 100;
    } else if (phase === 'build') {
      ag = agents.length + ' agents';
      label = fmt(doneCount) + ' / ' + fmt(total) + ' layers';
      pct = total ? (doneCount / total) * 100 : 100;
    } else {
      label = skipped ? 'Skipped. The page is ready.' : 'Rebuilt ' + fmt(total) + ' layers in ' + buildTime.toFixed(1) + 's';
      pct = 100;
    }
    setHud('ag', ag, hudAg, 'textContent');
    hudAg.style.display = ag ? '' : 'none';
    setHud('tx', label, hudTx, 'textContent');
    var pw = Math.round(pct * 10) / 10;
    if (hudCache.pctw !== pw) { hudCache.pctw = pw; hudBar.style.width = pct + '%'; }
    var cls = phase === 'scan' ? 'sr-st-scan' : (phase === 'build' ? 'sr-st-build' : 'sr-st-done');
    if (hudCache.cls !== cls) { hudCache.cls = cls; hud.className = cls + (hudCache.gone ? ' sr-gone' : ''); }
  }

  /* ------------------------------------------------------------ phase changes */
  function hideScanScreen() {
    if (!scanEl) return;
    scanEl.classList.add('sr-out');
    later(function () {
      html.classList.remove('sr-lock');
      if (scanEl) scanEl.style.display = 'none';
    }, 560);
  }

  function finishScan() {
    phase = 'build';
    hideScanScreen();
    needCheck = true;
  }

  function enterDone() {
    phase = 'done';
    buildTime = buildT;
    // restore everything and remove the temporary wrappers: the DOM is now identical
    // to the page without the effect
    for (var i = 0; i < agents.length; i++) if (agents[i].task) endTask(agents[i]);
    cleanupLayers();
    trig = [];
    if (hud) {
      hudCache.gone = false;
      later(function () {
        hudCache.gone = true;
        hud.classList.add('sr-gone');
        later(function () { if (hud) hud.style.display = 'none'; }, 450);
      }, 3500);
    }
    try { if (prevScrollRestoration !== null) history.scrollRestoration = prevScrollRestoration; } catch (e) {}
    report(skipped ? 'skipped' : 'done');
  }

  function skip() {
    if (phase === 'done') return;
    skipRequested = true;
  }
  function doSkip() {
    skipRequested = false;
    skipped = true;
    cancelCollect = true;           // if the scan hasn't read the page yet, don't hide anything
    html.classList.remove('sr-lock');   // give scrolling back immediately, whatever phase we're in
    if (phase === 'scan') hideScanScreen();
    for (var i = 0; i < agents.length; i++) if (agents[i].task) endTask(agents[i]);
    for (var j = 0; j < layers.length; j++) finishLayer(layers[j]);
    enterDone();
  }

  /* -------------------------------------------------------------- main loop */
  function frame(ts) {
    if (destroyed) return;
    raf = requestAnimationFrame(guarded(frame));
    var now = ts / 1000;
    var dt = last ? Math.min(0.05, now - last) : 0.016;
    last = now;
    if (dt < 0.001) dt = 0.001;
    var i, a;

    if (skipRequested) { doSkip(); }

    // ---- READ phase: every layout read happens before any write ----
    if (phase === 'build' && collected && (needCheck || now - lastCheck > 0.35)) {
      needCheck = false;
      lastCheck = now;
      readLayers();
    }
    if (phase === 'build') {
      for (i = 0; i < agents.length; i++) if (agents[i].task) readTask(agents[i]);
    }

    // ---- WRITE phase ----
    if (phase === 'scan') {
      scanT += dt;
      for (i = 0; i < agents.length; i++) scanTarget(agents[i], scanT);
      if (collected && scanT >= 1.9 / speed) finishScan();
    } else if (phase === 'build') {
      buildT += dt;
      for (i = 0; i < agents.length; i++) {
        a = agents[i];
        if (!a.task && trig.length) pickFor(a);
      }
      for (i = 0; i < agents.length; i++) if (agents[i].task) stepTask(agents[i], dt);
      if (collected && doneCount >= layers.length && !anyTask()) enterDone();
    }

    if (phase === 'build' || phase === 'done') {
      // free: mouse on the page, no scroll for 500ms, nobody working, no triggered layer waiting
      var free = mouse.has && !mouse.gone && (now - lastScroll > 0.5) && !anyTask() && trig.length === 0;
      for (i = 0; i < agents.length; i++) {
        a = agents[i];
        if (a.task) continue;
        if (free) followTarget(a, now); else wanderTarget(a, now);
      }
    }

    for (i = 0; i < agents.length; i++) moveAgent(agents[i], dt);

    var working = phase === 'build' && anyTask();
    if (working) lastWorking = now;
    var want = (working || now - lastWorking < 1.2) && phase === 'build' ? 1 : 0;
    guideAlpha += (want - guideAlpha) * (1 - Math.exp(-6 * dt));
    if (guideAlpha < 0.004 && want === 0) guideAlpha = 0;
    drawGuides();

    updateHud();
  }

  /* ---------------------------------------------------------------- teardown */
  function teardown(reason) {
    if (destroyed) return;
    destroyed = true;
    try { cancelAnimationFrame(raf); } catch (e) {}
    for (var t = 0; t < timeouts.length; t++) { try { clearTimeout(timeouts[t]); } catch (e) {} }
    for (var c = 0; c < cleanups.length; c++) { try { cleanups[c](); } catch (e) {} }
    try { for (var i = 0; i < agents.length; i++) if (agents[i].task) endTask(agents[i]); } catch (e) {}
    try { cleanupLayers(); } catch (e) {}
    try { removeNode(styleEl); removeNode(rootEl); removeNode(agentsEl); removeNode(scanEl); removeNode(hud); } catch (e) {}
    try { html.classList.remove('sr-lock'); html.classList.remove('sr-boot'); } catch (e) {}
    try { if (prevScrollRestoration !== null) history.scrollRestoration = prevScrollRestoration; } catch (e) {}
    report(reason);
  }

  /* --------------------------------------------------------------- listeners */
  on(window, 'scroll', guarded(function () { lastScroll = nowS(); needCheck = true; }), { passive: true });
  on(window, 'resize', guarded(function () {
    W = window.innerWidth; H = window.innerHeight;
    sizeCanvas();
    needCheck = true;
  }), { passive: true });
  var checkTimer = setInterval(function () { needCheck = true; }, 350);
  cleanups.push(function () { clearInterval(checkTimer); });

  on(doc, 'pointermove', guarded(function (e) {
    if (e.pointerType !== 'mouse') return;
    mouse.gone = false;
    var x = e.clientX, y = e.clientY;
    if (!mouse.has) { mouse.has = true; mouse.x = x; mouse.y = y; mouse.lx = x; mouse.ly = y; return; }
    mouse.x = x; mouse.y = y;
    var mx = x - mouse.lx, my = y - mouse.ly, dist = Math.hypot(mx, my);
    if (dist > 2) {
      mouse.lastMove = nowS();
      var b = Math.min(1, dist / 40);
      var nx = mouse.dx * (1 - b) + (mx / dist) * b;
      var ny = mouse.dy * (1 - b) + (my / dist) * b;
      var m = Math.hypot(nx, ny) || 1;
      mouse.dx = nx / m; mouse.dy = ny / m;
      mouse.lx = x; mouse.ly = y;
    }
  }), { passive: true });
  on(html, 'mouseleave', guarded(function () { mouse.gone = true; }));
  on(window, 'blur', guarded(function () { mouse.gone = true; }));

  on(doc, 'keydown', guarded(function (e) { if (e.key === 'Escape') skip(); }));
  if (btnSkip) on(btnSkip, 'click', guarded(function () { skip(); }));

  // Pause everything while the tab is hidden.
  on(doc, 'visibilitychange', guarded(function () {
    if (doc.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = 0; raf = requestAnimationFrame(guarded(frame)); }
  }));

  /* -------------------------------------------------------------------- start */
  if (mode === 'full') {
    var afterLoad = function (cb) {
      if (doc.readyState === 'complete') cb();
      else on(window, 'load', cb, { once: true });
    };
    afterLoad(guarded(function () {
      var fired = false;
      var go = guarded(function () {
        if (fired) return;
        fired = true;
        collectAndHide();
      });
      if (doc.fonts && doc.fonts.ready) {
        doc.fonts.ready.then(go, go);
        later(go, 1200);
      } else {
        go();
      }
    }));
    // Watchdog: if the scan hasn't finished by now (e.g. a resource never finishes loading),
    // skip it rather than leave the visitor waiting.
    later(function () { if (phase === 'scan') skip(); }, 8000);
  }

  raf = requestAnimationFrame(guarded(frame));

  var api = {
    skip: skip,
    layers: function () {
      return layers.map(function (L) { return { type: L.type, text: !!L.hasText, state: L.state }; });
    },
    phase: function () { return phase; }
  };
  return {
    destroy: function () { teardown('destroyed'); },
    skip: skip,
    api: api
  };
}
