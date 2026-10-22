const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(f) {
  return new Date(f.date || f.createdAt);
}

export function buildAnalytics(files, period = 'month') {
  const now = new Date();

  if (period === 'week') {
    const buckets = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      buckets.push({
        label: DAYS[d.getDay()],
        sub: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        key,
        records: 0,
        payment: 0,
      });
    }
    files.forEach((f) => {
      const key = parseDate(f).toISOString().split('T')[0];
      const b = buckets.find((x) => x.key === key);
      if (b) {
        b.records += 1;
        b.payment += f.totalBill || 0;
      }
    });
    return buckets;
  }

  if (period === 'year') {
    const year = now.getFullYear();
    const buckets = MONTHS.map((label, i) => ({
      label,
      sub: String(year),
      key: `${year}-${String(i + 1).padStart(2, '0')}`,
      records: 0,
      payment: 0,
    }));
    files.forEach((f) => {
      const d = parseDate(f);
      if (d.getFullYear() !== year) return;
      const b = buckets[d.getMonth()];
      if (b) {
        b.records += 1;
        b.payment += f.totalBill || 0;
      }
    });
    return buckets;
  }

  // month — last 4 weeks
  const buckets = [];
  for (let w = 3; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(start.getDate() - w * 7 - 6);
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    buckets.push({
      label: `Week ${4 - w}`,
      sub: `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      start: start.getTime(),
      end: end.getTime() + 86400000,
      records: 0,
      payment: 0,
    });
  }
  files.forEach((f) => {
    const t = parseDate(f).getTime();
    const b = buckets.find((x) => t >= x.start && t < x.end);
    if (b) {
      b.records += 1;
      b.payment += f.totalBill || 0;
    }
  });
  return buckets;
}

export function statusBreakdown(files) {
  const map = {
    pending: 0,
    in_progress: 0,
    objection: 0,
    paper_return: 0,
    on_hold: 0,
    completed: 0,
  };
  files.forEach((f) => {
    const s = f.status === 'done' ? 'completed' : f.status;
    if (map[s] !== undefined) map[s] += 1;
  });
  return [
    { name: 'Pending', value: map.pending, color: '#c0392b' },
    { name: 'In Process', value: map.in_progress, color: '#e67e22' },
    { name: 'Objection', value: map.objection, color: '#8e44ad' },
    { name: 'Paper Return', value: map.paper_return, color: '#1a5276' },
    { name: 'On Hold', value: map.on_hold, color: '#5dade2' },
    { name: 'Completed', value: map.completed, color: '#27ae60' },
  ].filter((x) => x.value > 0);
}

export function workTypeBreakdown(files) {
  const map = {};
  files.forEach((f) => {
    const k = f.workType || 'Other';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([name, value], i) => ({
    name,
    value,
    color: ['#8b0000', '#f39c12', '#2980b9', '#27ae60', '#8e44ad'][i % 5],
  }));
}
