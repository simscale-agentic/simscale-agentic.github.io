// Bar charts rebuilt from the paper figures. Bars grow when a chart scrolls into view, and charts with two
// policy backends can switch between them.
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const whenVisible = (el, fn, threshold = 0.3) => {
    if (reducedMotion || !('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold });
    io.observe(el);
  };

  const COLOR = {
    real: '#CC6677', twin: '#F2E3A6', cousins: '#E2BE5A', robocasa: '#C8C2BA', articraft: '#B9A5D0',
    astra: '#BCD3EC', astraAsset: '#8FBF9F', human: '#6E9FD3', ours: '#1F4E8C', oursAsset: '#6E9FD3'
  };
  const TASKS = ['PutPot', 'HangMug', 'PutCharger'];
  // Task scores (%) from the paper figures, one value per series. Charts with two backends give DINOv3 + FMT (dino)
  // and GR00T N1.6 (groot) values. null marks a condition that does not exist.
  const CHARTS = {
    realworld: {
      series: [['Real-Demos (60 Real-World Demos)', COLOR.real], ['SimFoundry Cousins + DexMimicGen (120 Human Demos)', COLOR.cousins], ['SimScale (Ours, 1 Human Demo)', COLOR.ours, true]],
      backends: true,
      panels: TASKS.map((t, i) => ({ title: t, groups: [{ dino: [[50, 68, 90], [51, 56.5, 84.5], [51.1, 43.3, 84.5]][i], groot: [[53, 62, 80], [51, 50, 79.5], [67.6, 33.7, 85]][i] }] }))
    },
    seen: {
      series: [['Real-Demos', COLOR.real], ['SimFoundry Twin', COLOR.twin], ['SimFoundry Cousins', COLOR.cousins], ['SimScale (Ours)', COLOR.ours, true]],
      panels: [
        { title: '(a) Real-Demos vs. SimScale', groups: [{ label: 'Seen by Real-Demos', v: [65.9, null, null, 85.2] }, { label: 'Unseen by Real-Demos', v: [36.1, null, null, 82.1] }] },
        { title: '(b) SimFoundry vs. SimScale', groups: [{ label: 'Seen by SimFoundry', v: [null, 41.5, 69.8, 86.2] }, { label: 'Unseen by SimFoundry', v: [null, 26.9, 47.9, 83.4] }] }
      ]
    },
    sim2sim: {
      // Averages over the three tasks with DINOv3 + FMT.
      series: [['SimFoundry Twin', COLOR.twin], ['SimFoundry Cousins', COLOR.cousins], ['RoboCasa', COLOR.robocasa], ['Articraft', COLOR.articraft], ['GPT-6-Astra', COLOR.astraAsset], ['SimScale AssetEngine (Ours)', COLOR.oursAsset, true]],
      panels: [
        { title: 'Held-Out AssetEngine Assets', groups: [{ v: [26.9, 36.7, 53.6, 51.9, 60.6, 92.4] }] },
        { title: 'Held-Out RoboCasa Assets', groups: [{ v: [54.1, 67.6, 70.4, 42.5, 52.1, 96.9] }] },
        { title: 'Digital Twins of Real Objects', groups: [{ v: [46.9, 54.2, 61.5, 42.7, 55.1, 83.3] }] }
      ]
    },
    assets: {
      series: [['SimFoundry Twin', COLOR.twin], ['SimFoundry Cousins', COLOR.cousins], ['RoboCasa', COLOR.robocasa], ['Articraft', COLOR.articraft], ['GPT-6-Astra', COLOR.astraAsset], ['SimScale AssetEngine (Ours)', COLOR.oursAsset, true]],
      backends: true,
      panels: TASKS.map((t, i) => ({ title: t, groups: [{
        // GPT-6-Astra assets were evaluated with DINOv3 + FMT only.
        dino: [[25, 68, 57, 5, 70, 82], [3.5, 56.5, 11, 38, 7.5, 87.5], [27.8, 43.3, null, 66.9, 52.8, 85.2]][i],
        groot: [[26, 62, 36, 11, null, 83], [47, 50, 30.5, 34.5, null, 84.5], [49.5, 33.7, null, 62.1, null, 90.8]][i]
      }] }))
    },
    demos: {
      series: [['GPT-6-Astra Programs', COLOR.astra], ['Human Demos per Asset (120 Human Demos)', COLOR.human], ['SimScale DemoEngine (Ours, 1 Human Demo)', COLOR.ours, true]],
      backends: true,
      panels: TASKS.map((t, i) => ({ title: t, groups: [{
        dino: [[0, 82, 90], [0, 87.5, 84.5], [7.2, 85.2, 84.5]][i],
        groot: [[0, 83, 80], [0, 84.5, 79.5], [5.1, 90.8, 85]][i]
      }] }))
    }
  };

  const fmt = (v) => v.toFixed(1);
  const countUp = (el, to, delay) => {
    if (reducedMotion) { el.textContent = fmt(to); return; }
    const from = parseFloat(el.dataset.v || '0'), t0 = performance.now() + delay, dur = 1000;
    el.dataset.v = to;
    const step = (now) => {
      const u = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  document.querySelectorAll('[data-chart]').forEach((host) => {
    const cfg = CHARTS[host.dataset.chart];
    if (!cfg) return;
    let backend = 'dino', shown = false;
    const head = document.createElement('div'); head.className = 'pc-head';
    const legend = document.createElement('ul'); legend.className = 'pc-legend';
    const items = [];
    cfg.series.forEach(([name, color, ours]) => {
      const li = document.createElement('li'); items.push(li);
      if (ours) li.className = 'ours';
      li.innerHTML = `<i style="--c:${color}"></i>${name}`;
      legend.appendChild(li);
    });
    head.appendChild(legend);
    let toggles = [];
    if (cfg.backends) {
      const sw = document.createElement('div'); sw.className = 'pc-switch'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Policy backend');
      [['dino', 'DINOv3 + FMT'], ['groot', 'GR00T N1.6']].forEach(([k, label]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.k = k;
        b.setAttribute('aria-pressed', String(k === backend));
        b.addEventListener('click', () => { backend = k; toggles.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.k === k))); update(); });
        sw.appendChild(b); toggles.push(b);
      });
      head.appendChild(sw);
    }
    host.appendChild(head);
    const grid = document.createElement('div'); grid.className = 'pc-panels'; grid.style.setProperty('--n', cfg.panels.length);
    const bars = [];
    cfg.panels.forEach((p) => {
      const panel = document.createElement('div'); panel.className = 'pc-panel';
      panel.innerHTML = `<h5>${p.title}</h5>`;
      const plot = document.createElement('div'); plot.className = 'pc-plot';
      plot.innerHTML = [0, 25, 50, 75, 100].map((y) => `<span class="pc-tick" style="bottom:${y / 1.1}%"><b>${y}</b></span>`).join('');
      const groups = document.createElement('div'); groups.className = 'pc-groups';
      p.groups.forEach((g) => {
        const group = document.createElement('div'); group.className = 'pc-group';
        const row = document.createElement('div'); row.className = 'pc-bars';
        cfg.series.forEach(([name, color, ours], si) => {
          const pick = () => (g.v || g[backend])[si];
          if (g.v && g.v[si] === null) return;
          const bar = document.createElement('div');
          bar.className = 'pc-bar' + (ours ? ' ours' : '');
          bar.style.setProperty('--c', color);
          bar.innerHTML = '<span class="pc-val">0.0</span>';
          bar.title = name;
          row.appendChild(bar);
          bars.push({ bar, val: bar.firstChild, pick, si, i: bars.length });
        });
        group.appendChild(row);
        if (g.label) { const l = document.createElement('div'); l.className = 'pc-glabel'; l.textContent = g.label; group.appendChild(l); }
        groups.appendChild(group);
      });
      plot.appendChild(groups);
      panel.appendChild(plot);
      grid.appendChild(panel);
    });
    host.appendChild(grid);
    const yl = document.createElement('p'); yl.className = 'pc-axis'; yl.textContent = 'Task Score (%)'; host.insertBefore(yl, grid);
    const update = () => {
      // A method with no result for the selected backend is also dropped from the legend.
      items.forEach((li, si) => { li.hidden = bars.some((b) => b.si === si) && bars.every((b) => b.si !== si || b.pick() === null); });
      bars.forEach(({ bar, val, pick, i }) => {
        const v = pick(), delay = shown ? 0 : i * 70;
        bar.style.transitionDelay = delay + 'ms';
        bar.hidden = v === null;
        if (v === null) { bar.style.height = '0%'; val.dataset.v = 0; return; }
        bar.style.height = (v / 1.1) + '%';
        countUp(val, v, delay);
      });
      shown = true;
    };
    whenVisible(host, update);
  });

  // Scaling curves: real-world task score (DINOv3 + FMT) of SimScale policies trained on 10, 40, and 160 AssetEngine
  // assets, 100 trajectories per asset. Simulation baselines are trained on 40 assets.
  const SCALING = {
    x: [['10', '1K'], ['40', '4K'], ['160', '16K']],
    tasks: [['PutPot', [75, 90, 97]], ['HangMug', [50, 84.5, 96.5]], ['PutCharger', [47.8, 84.5, 97]]],
    baselines: [
      ['SimFoundry Cousins', COLOR.cousins, 'square', [68, 56.5, 43.3]], ['RoboCasa', COLOR.robocasa, 'diamond', [57, 11, null]],
      ['Articraft', COLOR.articraft, 'up', [5, 38, 66.9]], ['GPT-6-Astra', COLOR.astraAsset, 'down', [70, 7.5, 52.8]]
    ]
  };
  const SHAPE = {
    square: '<rect x="2" y="2" width="8" height="8"/>', diamond: '<path d="M6 .6 11.4 6 6 11.4.6 6z"/>',
    up: '<path d="M6 1l5.4 9.6H.6z"/>', down: '<path d="M6 11 .6 1.4h10.8z"/>'
  };
  const mark = (shape, color) => `<svg class="lc-mark" viewBox="0 0 12 12" aria-hidden="true" style="--c:${color}">${SHAPE[shape]}</svg>`;
  const xAt = (i) => (i + .5) / SCALING.x.length * 100;
  const ticks = [0, 25, 50, 75, 100].map((y) => `<span class="pc-tick" style="bottom:${y / 1.1}%"><b>${y}</b></span>`).join('');

  document.querySelectorAll('[data-scaling]').forEach((host) => {
    const mode = host.dataset.scaling;
    const panels = mode === 'average'
      ? [['', SCALING.x.map((_, i) => SCALING.tasks.reduce((s, [, v]) => s + v[i], 0) / SCALING.tasks.length)]]
      : SCALING.tasks;
    const base = mode === 'baselines' ? SCALING.baselines : [];
    const legend = [...base.map(([name, color, shape]) => `<li>${mark(shape, color)}${name}</li>`),
      '<li class="ours"><i class="lc-key"></i>SimScale (Ours)</li>'];
    const plots = panels.map(([title, v], t) => {
      const line = v.map((y, i) => `${xAt(i)},${100 - y / 1.1}`).join(' ');
      const others = base.filter(([, , , s]) => s[t] !== null).map(([name, color, shape, s]) =>
        `<span class="lc-pt base" style="left:${xAt(1)}%;bottom:${s[t] / 1.1}%" title="${name}: ${fmt(s[t])}">${mark(shape, color)}</span>`);
      const ours = v.map((y, i) =>
        `<span class="lc-pt ours" style="left:${xAt(i)}%;bottom:${y / 1.1}%;--d:${i}"><i></i><b data-to="${y}">0.0</b></span>`);
      const xs = SCALING.x.map(([a, n], i) => `<span style="left:${xAt(i)}%">${a}<br>(${n})</span>`);
      return `<div class="pc-panel lc-panel">${title ? `<h5>${title}</h5>` : ''}<div class="pc-plot">${ticks}
        <svg class="lc-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}" vector-effect="non-scaling-stroke"/></svg>
        ${others.join('')}${ours.join('')}<div class="lc-x">${xs.join('')}</div></div></div>`;
    });
    host.innerHTML = `<div class="pc-head"><div class="zs"><ul class="pc-legend">${legend.join('')}</ul><span>Zero-Shot<br>Sim-to-Real</span></div></div>` +
      `<p class="pc-axis">${mode === 'average' ? 'Average Task Score (%)' : 'Task Score (%)'}</p>` +
      `<div class="pc-panels" style="--n:${panels.length}">${plots.join('')}</div><p class="lc-xtitle"># Assets (# Trajectories)</p>`;
    const video = host.closest('.scale-show')?.querySelector('video');
    if (video && !reducedMotion) { followVideo(host, video); return; }
    whenVisible(host, () => {
      host.classList.add('on');
      host.querySelectorAll('.lc-pt.ours b').forEach((b, i) => countUp(b, +b.dataset.to, reducedMotion ? 0 : (i % 3) * 450));
    });
  });

  // The opening chart follows the scaling video, which holds on 10, 40, and 160 assets, grows between them, and
  // shrinks back to 10 at the end of its loop. Keyframes are (video time in s, scale index).
  function followVideo(host, video) {
    const KEYS = [[0, 0], [2, 0], [3, 1], [5, 1], [6, 2], [8.5, 2], [9.5, 0]];
    const at = (t) => {
      for (let k = 1; k < KEYS.length; k++) {
        const [t1, p1] = KEYS[k], [t0, p0] = KEYS[k - 1];
        if (t < t1) { const u = (t - t0) / (t1 - t0); return p0 + (p1 - p0) * u * u * (3 - 2 * u); }
      }
      return 0;
    };
    const line = host.querySelector('.lc-line'), pts = [...host.querySelectorAll('.lc-pt.ours')], xs = [...host.querySelectorAll('.lc-x span')];
    const badge = host.closest('.scale-show').querySelector('.scale-badge');
    host.classList.add('sync');
    let shown = -1;
    const frame = () => {
      const p = at(video.currentTime % KEYS[KEYS.length - 1][0]);
      line.style.clipPath = `inset(-12px ${100 - xAt(p)}% -12px 0)`;
      const n = Math.floor(p + .02);
      if (n !== shown) {
        pts.forEach((el, i) => {
          const b = el.querySelector('b');
          el.classList.toggle('shown', i <= n);
          el.classList.toggle('active', i === n);
          if (i <= n && i > shown) countUp(b, +b.dataset.to, 0);
          if (i > n) b.dataset.v = 0;
        });
        xs.forEach((el, i) => el.classList.toggle('active', i === n));
        const [assets, trajs] = SCALING.x[n];
        badge.innerHTML = `<b>${assets}</b> Assets &middot; <b>${trajs}</b> Trajectories per Task`;
        shown = n;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // User-study stacked bars
  document.querySelectorAll('[data-stack]').forEach((host) => {
    const segs = [...host.querySelectorAll('.us-seg')];
    whenVisible(host, () => segs.forEach((s, i) => {
      s.style.transitionDelay = (reducedMotion ? 0 : i * 90) + 'ms';
      s.style.width = s.dataset.w + '%';
      countUp(s.querySelector('b'), parseFloat(s.dataset.w), reducedMotion ? 0 : i * 90);
    }));
  });
})();
