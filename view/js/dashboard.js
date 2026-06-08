'use strict';

// ── State ────────────────────────────────────────────────────
const state = {
  filtered: [],
  sort:     { col: 'price', dir: 'desc' },
  page:     1,
  perPage:  15,
  filters:  { search: '', category: '', brand: '', ram: '' },
};

// ── Helpers ──────────────────────────────────────────────────
function fmt(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Entry point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof DASHBOARD_DATA === 'undefined') {
    document.getElementById('topbar-sub').textContent =
      'Execute o ETL na aplicação para gerar os dados do dashboard.';
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="7" class="table-empty">Dados não encontrados — execute o ETL primeiro.</td></tr>';
    return;
  }
  initMeta();
  initCharts();
  initTable();
  initNav();
});

// ── KPIs & topbar ────────────────────────────────────────────
function initMeta() {
  const m = DASHBOARD_DATA.meta;

  document.getElementById('taxa-val').textContent       = 'R$ ' + m.taxa_brl.toFixed(4);
  document.getElementById('gerado-badge').textContent   = 'Gerado em ' + m.gerado_em;
  document.getElementById('topbar-sub').textContent     = m.total.toLocaleString('pt-BR') + ' smartphones · ' + m.marcas + ' marcas analisadas';
  document.getElementById('kpi-total').textContent      = m.total.toLocaleString('pt-BR');
  document.getElementById('kpi-marcas').textContent     = m.marcas + ' marcas';
  document.getElementById('kpi-avg').textContent        = fmt(m.avg_price);
  document.getElementById('kpi-range').textContent      = fmt(m.min_price) + ' a ' + fmt(m.max_price);
  document.getElementById('kpi-top-brand').textContent  = m.top_brand;
  document.getElementById('kpi-top-count').textContent  = m.top_brand_count + ' modelos';
  document.getElementById('kpi-ml').textContent         = (m.acc_cv * 100).toFixed(1) + '%';
  document.getElementById('sidebar-acc').textContent    = 'ML: ' + (m.acc_cv * 100).toFixed(1) + '% precisão';
  document.getElementById('donut-total').textContent    = m.total.toLocaleString('pt-BR');
}

// ── Charts ───────────────────────────────────────────────────
const CAT_COLORS = {
  'Budget':    '#10b981',
  'Mid-range': '#f59e0b',
  'Premium':   '#8b5cf6',
};
const BLUE   = '#2563eb';
const PURPLE = '#8b5cf6';

Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#6b7280';

function initCharts() {
  const d = DASHBOARD_DATA;

  // ── 1. Brands — horizontal bar (top 10) ──────────────────
  const top10 = d.by_brand.slice(0, 10);
  new Chart(document.getElementById('chart-brands'), {
    type: 'bar',
    data: {
      labels:   top10.map(b => b.brand),
      datasets: [{
        label: 'Modelos',
        data:  top10.map(b => b.count),
        backgroundColor: top10.map((_, i) => `hsl(${215 + i * 5}, 78%, ${58 - i * 2}%)`),
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    },
  });

  // ── 2. Donut — categorias ─────────────────────────────────
  const catOrder = ['Budget', 'Mid-range', 'Premium'];
  const catData  = catOrder.map(c => d.by_category.find(x => x.category === c) ?? { count: 0 });
  const total    = d.meta.total;

  new Chart(document.getElementById('chart-donut'), {
    type: 'doughnut',
    data: {
      labels:   catOrder,
      datasets: [{
        data:            catData.map(x => x.count),
        backgroundColor: catOrder.map(c => CAT_COLORS[c]),
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} (${(ctx.raw / total * 100).toFixed(1)}%)`,
          },
        },
      },
    },
  });

  // Legenda manual do donut
  const legendEl = document.getElementById('donut-legend');
  catOrder.forEach((c, i) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${CAT_COLORS[c]}"></span>${c} (${catData[i].count})`;
    legendEl.appendChild(item);
  });

  // ── 3. Scatter — RAM × preço por categoria ────────────────
  new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: {
      datasets: catOrder.map(cat => ({
        label:           cat,
        data:            d.phones.filter(p => p.category === cat).map(p => ({ x: p.ram, y: p.price })),
        backgroundColor: CAT_COLORS[cat] + 'aa',
        pointRadius:     4,
        pointHoverRadius: 7,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, padding: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.x} GB RAM · ${fmt(ctx.raw.y)}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'RAM (GB)' },   grid: { color: '#f1f5f9' } },
        y: {
          title: { display: true, text: 'Preço (R$)' },
          grid:  { color: '#f1f5f9' },
          ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') },
        },
      },
    },
  });

  // ── 4. Storage — modelos por armazenamento ────────────────
  new Chart(document.getElementById('chart-storage'), {
    type: 'bar',
    data: {
      labels:   d.by_storage.map(s => s.storage + ' GB'),
      datasets: [{
        label:           'Modelos',
        data:            d.by_storage.map(s => s.count),
        backgroundColor: BLUE + 'cc',
        borderRadius:    5,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
      },
    },
  });

  // ── 5. ML accuracy — CV vs teste ──────────────────────────
  const m = d.meta;
  new Chart(document.getElementById('chart-ml-acc'), {
    type: 'bar',
    data: {
      labels:   ['Cross-Validation (5-fold)', 'Conjunto de Teste'],
      datasets: [{
        label:           'Acurácia (%)',
        data:            [(m.acc_cv * 100).toFixed(2), (m.acc_teste * 100).toFixed(2)],
        backgroundColor: [BLUE + 'cc', '#10b981cc'],
        borderRadius:    6,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          min: 0, max: 100,
          grid: { color: '#f1f5f9' },
          ticks: { callback: v => v + '%' },
        },
      },
    },
  });

  // ── 6. RAM vs preço médio ─────────────────────────────────
  new Chart(document.getElementById('chart-ram'), {
    type: 'bar',
    data: {
      labels:   d.by_ram.map(r => r.ram + ' GB'),
      datasets: [{
        label:           'Preço Médio (R$)',
        data:            d.by_ram.map(r => r.avg_price),
        backgroundColor: PURPLE + 'cc',
        borderRadius:    5,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid:  { color: '#f1f5f9' },
          ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') },
        },
      },
    },
  });
}

// ── Table ────────────────────────────────────────────────────
function initTable() {
  const phones = DASHBOARD_DATA.phones;

  // Popula select de marcas
  const brandSel = document.getElementById('filter-brand');
  [...new Set(phones.map(p => p.brand))].sort().forEach(b => {
    const o = document.createElement('option');
    o.value = b; o.textContent = b;
    brandSel.appendChild(o);
  });

  // Popula select de RAM
  const ramSel = document.getElementById('filter-ram');
  [...new Set(phones.map(p => p.ram))].sort((a, b) => a - b).forEach(r => {
    const o = document.createElement('option');
    o.value = r; o.textContent = r + ' GB';
    ramSel.appendChild(o);
  });

  // Ordenação por coluna
  document.querySelectorAll('#data-table thead th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      state.sort.dir = (state.sort.col === col && state.sort.dir === 'asc') ? 'desc' : 'asc';
      state.sort.col = col;
      document.querySelectorAll('#data-table thead th').forEach(t => t.className = '');
      th.className = 'sort-' + state.sort.dir;
      state.page = 1;
      applyFilters();
    });
  });

  // Filtros
  document.getElementById('search-input').addEventListener('input', e => {
    state.filters.search = e.target.value.trim().toLowerCase();
    state.page = 1; applyFilters();
  });
  document.getElementById('filter-category').addEventListener('change', e => {
    state.filters.category = e.target.value;
    state.page = 1; applyFilters();
  });
  document.getElementById('filter-brand').addEventListener('change', e => {
    state.filters.brand = e.target.value;
    state.page = 1; applyFilters();
  });
  document.getElementById('filter-ram').addEventListener('change', e => {
    state.filters.ram = e.target.value;
    state.page = 1; applyFilters();
  });

  applyFilters();
}

function applyFilters() {
  const { search, category, brand, ram } = state.filters;
  let phones = DASHBOARD_DATA.phones;

  if (search)   phones = phones.filter(p => (p.brand + ' ' + p.model).toLowerCase().includes(search));
  if (category) phones = phones.filter(p => p.category === category);
  if (brand)    phones = phones.filter(p => p.brand === brand);
  if (ram)      phones = phones.filter(p => p.ram === Number(ram));

  // Ordenação
  const { col, dir } = state.sort;
  const KEY_MAP = { brand: 'brand', model: 'model', ram: 'ram', storage: 'storage', price: 'price', category: 'category', color: 'color' };
  const key = KEY_MAP[col] ?? 'price';

  phones = [...phones].sort((a, b) => {
    const va = a[key], vb = b[key];
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return dir === 'asc' ? cmp : -cmp;
  });

  state.filtered = phones;
  document.getElementById('results-count').textContent = phones.length.toLocaleString('pt-BR') + ' resultados';
  renderTable();
  renderPagination();
}

function renderTable() {
  const { filtered, page, perPage } = state;
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);
  const tbody = document.getElementById('table-body');

  if (slice.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum resultado encontrado.</td></tr>';
    document.getElementById('table-info').textContent = '—';
    return;
  }

  tbody.innerHTML = slice.map(p => {
    const catClass = p.category === 'Budget' ? 'budget' : p.category === 'Mid-range' ? 'mid' : 'premium';
    const star = p.top_seller ? '<span class="badge-star" title="Marca top-vendedora">★</span>' : '';
    return `<tr>
      <td>${p.brand}${star}</td>
      <td>${p.model}</td>
      <td>${p.ram} GB</td>
      <td>${p.storage} GB</td>
      <td><strong>${fmt(p.price)}</strong></td>
      <td><span class="badge badge-${catClass}">${p.category}</span></td>
      <td>${p.color}</td>
    </tr>`;
  }).join('');

  const end = Math.min(start + perPage, filtered.length);
  document.getElementById('table-info').textContent =
    `${(start + 1).toLocaleString('pt-BR')}–${end.toLocaleString('pt-BR')} de ${filtered.length.toLocaleString('pt-BR')} resultados`;
}

function renderPagination() {
  const pages  = Math.ceil(state.filtered.length / state.perPage);
  const cur    = state.page;
  const el     = document.getElementById('pagination');
  el.innerHTML = '';
  if (pages <= 1) return;

  const mkBtn = (label, page, disabled, active) => {
    const b = document.createElement('button');
    b.className   = 'page-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.disabled    = disabled;
    if (!disabled && !active) {
      b.addEventListener('click', () => { state.page = page; renderTable(); renderPagination(); });
    }
    return b;
  };

  const dot = () => {
    const s = document.createElement('span');
    s.className = 'page-dots'; s.textContent = '…';
    el.appendChild(s);
  };

  el.appendChild(mkBtn('‹', cur - 1, cur === 1, false));

  if (pages <= 7) {
    for (let p = 1; p <= pages; p++) el.appendChild(mkBtn(p, p, false, p === cur));
  } else {
    el.appendChild(mkBtn(1, 1, false, cur === 1));
    if (cur > 3) dot();
    const lo = Math.max(2, cur - 1), hi = Math.min(pages - 1, cur + 1);
    for (let p = lo; p <= hi; p++) el.appendChild(mkBtn(p, p, false, p === cur));
    if (cur < pages - 2) dot();
    el.appendChild(mkBtn(pages, pages, false, cur === pages));
  }

  el.appendChild(mkBtn('›', cur + 1, cur === pages, false));
}

// ── Sidebar nav ──────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
