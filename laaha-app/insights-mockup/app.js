// Laaha Insights mockup: renders the synthetic dataset loaded by data/*.data.js.
// Charts are hand-written SVG so the page works offline from disk.

(function () {
  const $ = (id) => document.getElementById(id);
  const data = window.MOCK_DATA;
  if (!data) {
    $('missing').hidden = false;
    return;
  }
  $('content').hidden = false;

  const A = window.LaahaAnalysis;
  const ALL = data.rows;
  const WEEKS = [...new Set(ALL.map((r) => r.week_start))].sort();
  const REGIONS = [...new Set(ALL.map((r) => r.region))].sort((a, b) => a.localeCompare(b, 'pl'));
  const NARRATIVES = [
    'Came to seduce / steal husbands',
    'Available women / brides',
    'Sex work stereotypes',
    'Abusing benefits / taking jobs',
    'Criminal or dangerous',
    'Fake offers (lures)',
    'Stolen photos / fake profiles',
    'Other or unclear',
    'None (in person)',
  ];
  const ONLINE_CATEGORIES = [
    'Sexualised content or stereotypes',
    'Fake job, housing or relationship offer',
    'Manipulated image or video',
    'False claim to discredit',
    'Fabricated story',
    'Harassment or pile-on',
    'Doxxing or exposure',
    'Other (online)',
  ];
  const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'X', 'Telegram', 'Classifieds site', 'WhatsApp', 'Other'];
  const TARGETS = ['Ukrainian women as a group', 'Herself', 'Someone she knows', 'Public figure'];
  const AGES = ['13-17', '18-29', '30-49', '50+', 'Unknown'];
  // Sequential blue ramp (steps 100 to 700) for the heatmap.
  const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

  const state = { region: '', mode: '' };

  // ---- Small helpers ----

  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'style') Object.assign(n.style, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) if (c != null) n.append(c);
    return n;
  }
  const text = (parent, x, y, str, attrs = {}) => {
    const t = s('text', { x, y, ...attrs }, parent);
    t.textContent = str;
    return t;
  };
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fmt = (n) => n.toLocaleString('en-GB');
  const day = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
  const weekEnd = (w) => new Date(Date.parse(w + 'T00:00:00Z') + 6 * 86400000).toISOString().slice(0, 10);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function niceScale(max, ticks = 4) {
    const raw = Math.max(1, max) / ticks;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw);
    return { max: step * Math.ceil(Math.max(1, max) / step), step };
  }
  /** Column or bar shape with a 4px rounded data end, square at the baseline. */
  function barPath(x, y, w, hgt, horizontal) {
    const r = Math.min(4, horizontal ? w : hgt, (horizontal ? hgt : w) / 2);
    if (horizontal) return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${hgt - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - r}z`;
    return `M${x},${y + hgt}v-${hgt - r}a${r},${r} 0 0 1 ${r},-${r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${hgt - r}z`;
  }
  function monthTicks(weeks) {
    const out = [];
    weeks.forEach((w, i) => {
      // A week that starts in the previous month is labelled by the month it mostly falls in.
      const d = new Date(Date.parse(w + 'T00:00:00Z') + 3 * 86400000);
      const prev = i ? new Date(Date.parse(weeks[i - 1] + 'T00:00:00Z') + 3 * 86400000) : null;
      if (!prev || d.getUTCMonth() !== prev.getUTCMonth()) {
        const label = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
        out.push({ i, label: i === 0 || d.getUTCMonth() === 0 ? `${label} ’${String(d.getUTCFullYear()).slice(2)}` : label });
      }
    });
    return out;
  }

  // ---- Tooltip ----

  const tip = $('tip');
  function showTip(x, y, head, rows) {
    tip.replaceChildren(h('div', { class: 't-head', text: head }));
    for (const r of rows) {
      tip.append(
        h(
          'div',
          { class: 't-row' },
          r.color ? h('span', { class: r.kind === 'rect' ? 'key-rect' : 'key-line', style: { background: r.color } }) : null,
          h('strong', { text: r.value }),
          h('span', { text: r.label ?? '' }),
        ),
      );
    }
    tip.hidden = false;
    const { width, height } = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - width - 8, x + 14) + 'px';
    tip.style.top = Math.max(8, y - height - 10) + 'px';
  }
  const hideTip = () => (tip.hidden = true);
  function bindTip(node, content) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('pointermove', (e) => showTip(e.clientX, e.clientY, ...content()));
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('focus', () => {
      const b = node.getBoundingClientRect();
      showTip(b.left + b.width / 2, b.top, ...content());
    });
    node.addEventListener('blur', hideTip);
  }

  // ---- Chart builders ----

  /** Weekly columns for one series, with a trend line. */
  function columns(el, { values, trend, weeks }) {
    const W = Math.max(560, el.clientWidth), H = 240, m = { l: 40, r: 8, t: 10, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const { max, step } = niceScale(Math.max(...values, ...trend));
    const y = (v) => m.t + ph - (v / max) * ph;
    const band = pw / values.length, bw = Math.min(24, band - 2);
    const svg = s('svg', { width: W, height: H, role: 'img', 'aria-label': 'Reports per week' });
    for (let v = 0; v <= max; v += step) {
      s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v ? 'gridline' : 'baseline' }, svg);
      text(svg, m.l - 6, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    }
    for (const t of monthTicks(weeks)) text(svg, m.l + t.i * band + band / 2, H - 8, t.label, { 'text-anchor': 'middle' });
    const blue = cssVar('--series-1');
    values.forEach((v, i) => {
      const x = m.l + i * band + (band - bw) / 2;
      if (v > 0) s('path', { d: barPath(x, y(v), bw, y(0) - y(v)), fill: blue, 'pointer-events': 'none' }, svg);
      const hit = s('rect', { x: m.l + i * band, y: m.t, width: band, height: ph, fill: 'transparent', class: 'mark' }, svg);
      bindTip(hit, () => [
        `Week of ${day(weeks[i])}`,
        [
          { color: blue, kind: 'rect', value: fmt(v), label: 'reports' },
          { color: cssVar('--text-2'), value: trend[i].toFixed(0), label: 'trend' },
        ],
      ]);
    });
    const pts = trend.map((v, i) => `${m.l + i * band + band / 2},${y(v)}`).join(' ');
    s('polyline', { points: pts, fill: 'none', stroke: cssVar('--text-2'), 'stroke-width': 2, 'stroke-linecap': 'round', 'pointer-events': 'none' }, svg);
    el.replaceChildren(
      h(
        'div',
        { class: 'legend' },
        h('span', {}, h('span', { class: 'key-rect', style: { background: blue } }), 'Reports per week'),
        h('span', {}, h('span', { class: 'key-line', style: { background: cssVar('--text-2') } }), 'Trend'),
      ),
      svg,
    );
  }

  /** Weekly lines with a crosshair. `yMax` shares one scale across small multiples. */
  function lines(el, { series, weeks, yMax, height = 200, compact = false }) {
    const W = Math.max(compact ? 220 : 560, el.clientWidth), H = height;
    const m = compact ? { l: 26, r: 14, t: 6, b: 18 } : { l: 40, r: 110, t: 10, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const { max, step } = niceScale(yMax ?? Math.max(...series.flatMap((x) => x.values)), compact ? 2 : 4);
    const x = (i) => m.l + (i / (weeks.length - 1)) * pw;
    const y = (v) => m.t + ph - (v / max) * ph;
    const svg = s('svg', { width: W, height: H, role: 'img', 'aria-label': series.map((x) => x.name).join(', ') });
    for (let v = 0; v <= max; v += step) {
      s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v ? 'gridline' : 'baseline' }, svg);
      text(svg, m.l - 5, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    }
    const ticks = monthTicks(weeks).filter((t, i) => !compact || i % 3 === 0);
    for (const t of ticks) text(svg, x(t.i), H - 5, t.label, { 'text-anchor': 'middle' });
    for (const ser of series) {
      const pts = ser.values.map((v, i) => [x(i), y(v)]);
      if (series.length === 1)
        s('path', { d: `M${pts.map((p) => p.join(',')).join('L')}L${x(weeks.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, fill: ser.color, 'fill-opacity': 0.1 }, svg);
      s('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: ser.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      if (!compact) {
        // Direct label at the line end, in text ink with a colored key beside it.
        const last = pts[pts.length - 1];
        s('circle', { cx: last[0], cy: last[1], r: 4, fill: ser.color, stroke: cssVar('--surface'), 'stroke-width': 2 }, svg);
      }
    }
    if (!compact && series.length > 1) {
      // End labels, pushed apart only far enough not to overlap.
      const ends = series.map((ser) => ({ ser, y: y(ser.values[ser.values.length - 1]) })).sort((a, b) => a.y - b.y);
      ends.forEach((e, i) => {
        if (i && e.y - ends[i - 1].y < 14) e.y = ends[i - 1].y + 14;
        text(svg, W - m.r + 10, e.y + 4, e.ser.short ?? e.ser.name, { class: 'label' });
      });
    }
    const cross = s('line', { y1: m.t, y2: m.t + ph, class: 'crosshair', visibility: 'hidden' }, svg);
    const dots = series.map((ser) => s('circle', { r: 4, fill: ser.color, stroke: cssVar('--surface'), 'stroke-width': 2, visibility: 'hidden' }, svg));
    const hit = s('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
    let focusIndex = weeks.length - 1;
    const readout = (i, cx, cy) => {
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.setAttribute('visibility', 'visible');
      series.forEach((ser, k) => {
        dots[k].setAttribute('cx', x(i));
        dots[k].setAttribute('cy', y(ser.values[i]));
        dots[k].setAttribute('visibility', 'visible');
      });
      showTip(cx, cy, `Week of ${day(weeks[i])}`, series.map((ser) => ({ color: ser.color, value: fmt(ser.values[i]), label: ser.name })));
    };
    const clear = () => {
      cross.setAttribute('visibility', 'hidden');
      dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
      hideTip();
    };
    hit.addEventListener('pointermove', (e) => {
      const b = svg.getBoundingClientRect();
      const i = Math.round(((e.clientX - b.left - m.l) / pw) * (weeks.length - 1));
      readout(Math.max(0, Math.min(weeks.length - 1, i)), e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', clear);
    // Keyboard: arrow keys move the crosshair week by week.
    hit.setAttribute('tabindex', '0');
    const kb = () => {
      const b = svg.getBoundingClientRect();
      readout(focusIndex, b.left + x(focusIndex), b.top + y(Math.max(...series.map((ser) => ser.values[focusIndex]))));
    };
    hit.addEventListener('focus', kb);
    hit.addEventListener('blur', clear);
    hit.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      focusIndex = Math.max(0, Math.min(weeks.length - 1, focusIndex + (e.key === 'ArrowLeft' ? -1 : 1)));
      kb();
    });
    return svg;
  }

  /** Horizontal bars with the value at the tip. */
  function hbars(el, entries, { total } = {}) {
    const labelW = Math.min(210, Math.max(120, el.clientWidth * 0.4));
    const W = Math.max(320, el.clientWidth), row = 26, bh = 16;
    const H = entries.length * row + 4;
    const max = Math.max(1, ...entries.map(([, v]) => v));
    const pw = W - labelW - 56;
    const svg = s('svg', { width: W, height: H, role: 'img' });
    const blue = cssVar('--series-1');
    const sum = total ?? entries.reduce((a, [, v]) => a + v, 0);
    entries.forEach(([label, v], i) => {
      const yy = i * row + (row - bh) / 2;
      text(svg, 0, yy + bh - 3, label, { class: 'label' });
      const w = (v / max) * pw;
      if (v > 0) s('path', { d: barPath(labelW, yy, w, bh, true), fill: blue }, svg);
      text(svg, labelW + w + 6, yy + bh - 3, fmt(v), { class: 'value' });
      const hit = s('rect', { x: 0, y: i * row, width: W, height: row, fill: 'transparent', class: 'mark' }, svg);
      bindTip(hit, () => [label, [{ color: blue, kind: 'rect', value: fmt(v), label: `reports · ${pct(v, sum)}%` }]]);
    });
    s('line', { x1: labelW, x2: labelW, y1: 0, y2: H, class: 'baseline' }, svg);
    el.replaceChildren(svg);
  }

  function heatmap(el, rows) {
    const online = rows.filter((r) => r.mode === 'online');
    if (!online.length) return el.replaceChildren(h('p', { class: 'note', text: 'No online reports in this selection.' }));
    const counts = A.countBy(online, (r) => `${r.category}|${r.platform}`);
    const max = Math.max(...counts.values());
    const labelW = 250, top = 34, cellH = 30, gap = 2;
    const W = Math.max(labelW + PLATFORMS.length * 44, el.clientWidth);
    const cw = (W - labelW) / PLATFORMS.length;
    const svg = s('svg', { width: W, height: top + ONLINE_CATEGORIES.length * cellH, role: 'img', 'aria-label': 'Online reports by category and platform' });
    PLATFORMS.forEach((p, j) => text(svg, labelW + j * cw + cw / 2, top - 10, p === 'Classifieds site' ? 'Classifieds' : p, { class: 'label', 'text-anchor': 'middle' }));
    ONLINE_CATEGORIES.forEach((c, i) => {
      const yy = top + i * cellH;
      text(svg, 0, yy + cellH / 2 + 4, c, { class: 'label' });
      PLATFORMS.forEach((p, j) => {
        const v = counts.get(`${c}|${p}`) ?? 0;
        const step = v ? Math.min(SEQ.length - 1, Math.ceil((v / max) * SEQ.length) - 1) : -1;
        const fill = step < 0 ? cssVar('--grid') : SEQ[step];
        const cell = s('rect', { x: labelW + j * cw + gap / 2, y: yy + gap / 2, width: cw - gap, height: cellH - gap, rx: 3, fill, class: 'mark' }, svg);
        if (v) {
          // Ink on light steps, white on dark ones.
          text(svg, labelW + j * cw + cw / 2, yy + cellH / 2 + 4, fmt(v), {
            'text-anchor': 'middle',
            style: `fill:${step >= 3 ? '#ffffff' : '#0b0b0b'};font-size:12px`,
            'pointer-events': 'none',
          });
        }
        bindTip(cell, () => [`${c} · ${p}`, [{ value: fmt(v), label: `online reports · ${pct(v, online.length)}% of online` }]]);
      });
    });
    el.replaceChildren(
      h(
        'div',
        { class: 'legend' },
        h('span', { text: 'Fewer' }),
        ...SEQ.map((c) => h('span', { class: 'key-rect', style: { background: c } })),
        h('span', { text: 'More reports' }),
      ),
      svg,
    );
  }

  function table(headers, rows) {
    return h(
      'div',
      { class: 'table-scroll' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, ...headers.map((x) => h('th', { text: x })))),
        h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((x) => h('td', { text: String(x) }))))),
      ),
    );
  }

  // ---- Sections ----

  function tiles(rows, alertCount) {
    const inMonths = (a, b) => rows.filter((r) => r.month >= a && r.month <= b).length;
    const recent = inMonths('2026-07', '2026-09'), before = inMonths('2026-04', '2026-06');
    const change = before ? Math.round(((recent - before) / before) * 100) : 0;
    const verified = rows.filter((r) => r.status === 'verified').length;
    const tile = (label, value, delta) =>
      h('div', { class: 'tile' }, h('div', { class: 'label', text: label }), h('div', { class: 'value', text: value }), delta ? h('div', { class: 'delta', text: delta }) : null);
    $('tiles').replaceChildren(
      tile('Reports', fmt(rows.length), 'Oct 2025 to Sep 2026'),
      tile('Change', `${change > 0 ? '+' : ''}${change}%`, `Jul–Sep vs Apr–Jun (${fmt(recent)} vs ${fmt(before)})`),
      tile('Verified', `${pct(verified, rows.length)}%`, `${fmt(verified)} checked by moderators`),
      tile('Alerts', String(alertCount), alertCount ? 'See below' : 'Nothing unusual'),
    );
  }

  function alertCards(list, rows) {
    const el = $('alerts');
    if (!list.length) return el.replaceChildren(h('p', { class: 'empty', text: 'No alerts for this selection.' }));
    const regionButton = (region) =>
      !state.region && region
        ? h('button', { text: `Show ${region}`, onclick: () => setFilter('region', region) })
        : h('span');
    el.replaceChildren(
      ...list.map((a) => {
        let kind, sev, sentence, region;
        if (a.kind === 'spike') {
          [kind, sev] = ['Narrative spike', 'warning'];
          const [topRegion, n] = a.region;
          const share = pct(n, a.total);
          region = share >= 50 ? topRegion : null;
          sentence =
            `“${a.narrative}” rose to ${fmt(a.peak)} reports a week (usually about ${Math.round(a.usual)}) ` +
            `between ${day(a.fromWeek)} and ${day(weekEnd(a.toWeek))}: ${fmt(a.total)} reports, mostly on ${a.platforms.join(' and ')}` +
            (state.region ? '.' : `, ${share}% from ${topRegion}.`);
        } else if (a.kind === 'campaign') {
          [kind, sev] = ['Possible coordinated campaign', 'serious'];
          const hours = Math.max(1, Math.round((a.end - a.start) / 3600000));
          sentence =
            `${fmt(a.total)} reports of ${a.links} link${a.links > 1 ? 's' : ''} within ${hours} hours from ${day(new Date(a.start).toISOString())}` +
            ` (one link reported ${a.main} times), mostly on ${a.platforms.join(' and ')}, about “${a.narrative}”.`;
        } else {
          [kind, sev] = ['Online lures, then offline harm', 'critical'];
          region = a.region;
          sentence =
            `In ${a.region}, ${a.lure} reports of fake job, housing or relationship offers between ${day(a.lureFrom)} and ${day(weekEnd(a.lureTo))} ` +
            `(usually ${a.usualLure.toFixed(1)} a week) were followed by ${a.later} in-person reports between ${day(a.laterFrom)} and ${day(weekEnd(a.laterTo))} ` +
            `(usually ${a.usualInPerson.toFixed(1)} a week).`;
        }
        return h(
          'article',
          { class: `alert sev-${sev}` },
          h('span', { class: 'icon', 'aria-hidden': 'true', text: '!' }),
          h('div', {}, h('div', { class: 'kind', text: kind }), h('p', { text: sentence })),
          regionButton(region),
        );
      }),
    );
  }

  function trendSection(rows) {
    const values = A.weekly(rows, WEEKS);
    const tr = A.trend(values);
    columns($('trend'), { values, trend: tr, weeks: WEEKS });
    $('trend-table').replaceChildren(table(['Week of', 'Reports', 'Trend'], WEEKS.map((w, i) => [day(w), values[i], tr[i].toFixed(1)])));
  }

  function multiples(rows) {
    const el = $('multiples');
    const series = NARRATIVES.map((n) => ({ n, values: A.weekly(rows, WEEKS, (r) => r.narrative === n) })).filter((x) =>
      x.values.some((v) => v > 0),
    );
    if (!series.length) return el.replaceChildren(h('p', { class: 'note', text: 'No reports in this selection.' }));
    const yMax = Math.max(...series.flatMap((x) => x.values));
    const blue = cssVar('--series-1');
    el.replaceChildren(
      ...series.map(({ n, values }) => {
        const box = h('div', {}, h('h3', { text: n }), h('div', { class: 'total', text: `${fmt(values.reduce((a, b) => a + b, 0))} reports` }));
        const chart = h('div');
        box.append(chart);
        requestAnimationFrame(() => chart.replaceChildren(lines(chart, { series: [{ name: 'reports', color: blue, values }], weeks: WEEKS, yMax, height: 110, compact: true })));
        return box;
      }),
    );
  }

  function regions(rows) {
    hbars($('regions'), [...A.countBy(rows, 'region')].sort((a, b) => b[1] - a[1]), { total: rows.length });
  }

  function targets(rows) {
    const t = A.countBy(rows, 'target_type');
    hbars($('targets'), TARGETS.map((k) => [k, t.get(k) ?? 0]).filter(([, v]) => v > 0), { total: rows.length });
    const a = A.countBy(rows, 'target_age_band');
    hbars($('ages'), AGES.map((k) => [k === 'Unknown' ? 'Not known' : k, a.get(k) ?? 0]), { total: rows.length });
  }

  function lagSection(rows) {
    const note = $('lag-note'), el = $('lag');
    if (state.mode) {
      note.textContent = 'This view compares online and in-person reports. Set “Reports” to “Online and in person” to see it.';
      return el.replaceChildren();
    }
    const where = state.region || 'all of Poland';
    note.textContent =
      `Weekly online reports of fake job, housing or relationship offers, next to weekly in-person reports, in ${where}. ` +
      'Look for in-person reports rising a few weeks after the offers.' +
      (state.region ? '' : ' Choose a region, or use “Show …” on an alert, to see it locally.');
    const series = [
      { name: 'online fake offers', short: 'Fake offers', color: cssVar('--series-1'), values: A.weekly(rows, WEEKS, (r) => r.category === A.LURE) },
      { name: 'in-person reports', short: 'In person', color: cssVar('--series-2'), values: A.weekly(rows, WEEKS, (r) => r.mode === 'in-person') },
    ];
    el.replaceChildren(
      h(
        'div',
        { class: 'legend' },
        ...series.map((x) => h('span', {}, h('span', { class: 'key-line', style: { background: x.color } }), x.name[0].toUpperCase() + x.name.slice(1))),
      ),
    );
    el.append(lines(el, { series, weeks: WEEKS }));
  }

  // ---- Filters and render ----

  function filtered() {
    return ALL.filter((r) => (!state.region || r.region === state.region) && (!state.mode || r.mode === state.mode));
  }

  function render() {
    const rows = filtered();
    const list = A.alerts(rows, WEEKS);
    $('f-count').textContent = `${fmt(rows.length)} of ${fmt(ALL.length)} reports`;
    tiles(rows, list.length);
    alertCards(list, rows);
    trendSection(rows);
    multiples(rows);
    heatmap($('heatmap'), rows);
    regions(rows);
    targets(rows);
    lagSection(rows);
  }

  function setFilter(key, value) {
    state[key] = value;
    $(key === 'region' ? 'f-region' : 'f-mode').value = value;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const regionSelect = $('f-region');
  for (const r of REGIONS) regionSelect.append(h('option', { value: r, text: r }));
  regionSelect.addEventListener('change', () => setFilter('region', regionSelect.value));
  $('f-mode').addEventListener('change', (e) => setFilter('mode', e.target.value));
  $('dl-size').textContent = `${fmt(ALL.length)} rows, ${data.columns.length} columns`;

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

  render();
})();
