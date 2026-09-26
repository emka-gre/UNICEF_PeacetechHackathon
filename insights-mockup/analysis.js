// Pure functions that turn report rows into the page's numbers and alerts.
// No DOM here, so the same code can be checked from Node.

(function () {
  // Alert thresholds. Chosen for the synthetic dataset; real data would need re-tuning.
  const T = {
    spikeRatio: 3, // weekly count at least this many times the usual level
    spikeMin: 15, // and at least this many reports in the week
    spikeLookback: 8, // "usual level" = mean of this many weeks before the rise
    spikeMinWeeks: 2, // hot weeks needed, so one noisy week is not an alert
    spikeGapWeeks: 1, // quiet weeks allowed inside one rise
    campaignHours: 72, // window for repeated links
    campaignMin: 20, // reports of one link inside the window
    relatedMin: 3, // other links counted as part of the same campaign
    lagLureWeeks: 4, // weeks of lure activity looked at
    lagFrom: 3, // in-person reports counted from this many weeks after the first lure week
    lagInPersonWeeks: 5, // ...for this many weeks
    lagRatio: 2, // both at least this many times their regional weekly average
    lagMinLure: 8,
    lagMinInPerson: 6,
  };

  const LURE = 'Fake job, housing or relationship offer';
  const IN_PERSON_NARRATIVE = 'None (in person)';
  const HOUR = 3600000;

  const countBy = (rows, key) => {
    const m = new Map();
    for (const r of rows) {
      const k = typeof key === 'function' ? key(r) : r[key];
      if (k == null) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n);
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  /** Weekly counts aligned to `weeks` (list of Monday dates). */
  function weekly(rows, weeks, filter = () => true) {
    const idx = new Map(weeks.map((w, i) => [w, i]));
    const out = new Array(weeks.length).fill(0);
    for (const r of rows) if (filter(r)) out[idx.get(r.week_start)]++;
    return out;
  }

  function campaigns(rows) {
    const byCluster = new Map();
    for (const r of rows) {
      if (!r.link_cluster) continue;
      if (!byCluster.has(r.link_cluster)) byCluster.set(r.link_cluster, []);
      byCluster.get(r.link_cluster).push(r);
    }
    const found = [];
    for (const [cluster, list] of byCluster) {
      if (list.length < T.campaignMin) continue;
      const times = list.map((r) => Date.parse(r.created_at)).sort((a, b) => a - b);
      let best = { n: 0 };
      for (let i = 0, j = 0; j < times.length; j++) {
        while (times[j] - times[i] > T.campaignHours * HOUR) i++;
        if (j - i + 1 > best.n) best = { n: j - i + 1, start: times[i], end: times[j] };
      }
      if (best.n < T.campaignMin) continue;
      const inWindow = (r) => {
        const t = Date.parse(r.created_at);
        return t >= best.start - 24 * HOUR && t <= best.end + 24 * HOUR;
      };
      // Other links repeatedly reported in the same window are counted as part of the campaign.
      const related = [...byCluster]
        .filter(([c, l]) => c !== cluster && l.filter(inWindow).length >= T.relatedMin)
        .map(([c, l]) => [c, l.filter(inWindow)]);
      const members = [...list.filter(inWindow), ...related.flatMap(([, l]) => l)];
      const times2 = members.map((r) => Date.parse(r.created_at));
      found.push({
        kind: 'campaign',
        cluster,
        main: best.n,
        links: 1 + related.length,
        total: members.length,
        start: Math.min(...times2),
        end: Math.max(...times2),
        platforms: top(countBy(members, 'platform'), 2).map(([k]) => k),
        narrative: top(countBy(members, 'narrative'), 1)[0]?.[0],
        ids: new Set(members.map((r) => r.report_id)),
      });
    }
    // A related link could itself pass the threshold: keep one alert per campaign.
    return found.sort((a, b) => b.total - a.total).filter((c, i, all) => !all.slice(0, i).some((o) => o.ids.has([...c.ids][0])));
  }

  function spikes(rows, weeks, exclude) {
    const online = rows.filter((r) => r.narrative !== IN_PERSON_NARRATIVE && !exclude.has(r.report_id));
    const found = [];
    for (const narrative of new Set(online.map((r) => r.narrative))) {
      const mine = online.filter((r) => r.narrative === narrative);
      const counts = weekly(mine, weeks);
      let run = null;
      const close = () => {
        if (run.hot >= T.spikeMinWeeks) {
          const inRun = mine.filter((r) => {
            const w = weeks.indexOf(r.week_start);
            return w >= run.from && w <= run.to;
          });
          found.push({
            kind: 'spike',
            narrative,
            usual: run.usual,
            peak: Math.max(...counts.slice(run.from, run.to + 1)),
            fromWeek: weeks[run.from],
            toWeek: weeks[run.to],
            total: inRun.length,
            platforms: top(countBy(inRun, 'platform'), 2).map(([k]) => k),
            region: top(countBy(inRun, 'region'), 1)[0],
          });
        }
        run = null;
      };
      for (let i = T.spikeLookback; i < counts.length; i++) {
        // The usual level is fixed at the start of a rise, so a long spike stays one alert.
        const usual = run ? run.usual : mean(counts.slice(i - T.spikeLookback, i));
        const hot = counts[i] >= T.spikeMin && counts[i] >= T.spikeRatio * Math.max(usual, 1);
        if (hot && !run) run = { usual, from: i, to: i, hot: 1 };
        else if (hot) Object.assign(run, { to: i, hot: run.hot + 1 });
        else if (run && i - run.to > T.spikeGapWeeks) close();
      }
      if (run) close();
    }
    return found;
  }

  function lags(rows, weeks) {
    const found = [];
    for (const region of new Set(rows.map((r) => r.region))) {
      const mine = rows.filter((r) => r.region === region);
      const L = weekly(mine, weeks, (r) => r.category === LURE);
      const P = weekly(mine, weeks, (r) => r.mode === 'in-person');
      const baseL = mean(L), baseP = mean(P);
      let best = null;
      for (let t = 0; t + T.lagFrom + T.lagInPersonWeeks <= weeks.length; t++) {
        const lure = L.slice(t, t + T.lagLureWeeks).reduce((s, x) => s + x, 0);
        const later = P.slice(t + T.lagFrom, t + T.lagFrom + T.lagInPersonWeeks).reduce((s, x) => s + x, 0);
        const ok =
          lure >= Math.max(T.lagMinLure, T.lagRatio * T.lagLureWeeks * baseL) &&
          later >= Math.max(T.lagMinInPerson, T.lagRatio * T.lagInPersonWeeks * baseP);
        if (ok && (!best || lure + later > best.lure + best.later)) best = { t, lure, later };
      }
      if (best)
        found.push({
          kind: 'lag',
          region,
          lure: best.lure,
          later: best.later,
          lureFrom: weeks[best.t],
          lureTo: weeks[best.t + T.lagLureWeeks - 1],
          laterFrom: weeks[best.t + T.lagFrom],
          laterTo: weeks[best.t + T.lagFrom + T.lagInPersonWeeks - 1],
          usualLure: baseL,
          usualInPerson: baseP,
        });
    }
    return found.sort((a, b) => b.lure + b.later - (a.lure + a.later));
  }

  /** All alerts for the given rows. Campaign reports are left out of spike detection. */
  function alerts(rows, weeks) {
    const c = campaigns(rows);
    const exclude = new Set(c.flatMap((x) => [...x.ids]));
    return [...spikes(rows, weeks, exclude), ...c, ...lags(rows, weeks)];
  }

  /** Least-squares line through the counts, ignoring the partial first and last weeks. */
  function trend(counts) {
    const pts = counts.map((y, x) => [x, y]).slice(1, -1);
    const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
    const slope = pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / pts.reduce((s, [x]) => s + (x - mx) ** 2, 0);
    return counts.map((_, x) => my + slope * (x - mx));
  }

  globalThis.LaahaAnalysis = { T, LURE, IN_PERSON_NARRATIVE, countBy, weekly, alerts, trend, campaigns, spikes, lags };
})();
