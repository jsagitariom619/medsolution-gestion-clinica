function renderHistory() {
  const id = $('historyPatient').value;
  const root = $('historyContent');
  if (!id) {
    root.className = 'history-content empty-state';
    root.textContent = 'Selecciona un paciente para revisar su historia clínica.';
    return;
  }
  const p = patientById(id);
  if (!p) return;
  const entries = [
    ...state.attentions.filter(a => a.patientId === id).map(a => ({ ...a, entryType: 'attention' })),
    ...state.procedures.filter(pr => pr.patientId === id).map(pr => ({ ...pr, entryType: 'procedure' })),
  ].sort((a,b) => b.date.localeCompare(a.date));

  root.className = 'history-content';
  root.innerHTML = '';
  const profile = document.createElement('div');
  profile.className = 'history-profile';
  profile.innerHTML = `<div><h3>${escapeHtml(p.name)}</h3><p><strong>Edad:</strong> ${escapeHtml(getAge(p.dob, p.ageRecorded))} &nbsp; <strong>Sexo:</strong> ${escapeHtml(p.sex || '—')}</p><p><strong>Documento:</strong> ${escapeHtml(p.doc || '—')} &nbsp; <strong>Teléfono:</strong> ${escapeHtml(p.phone || '—')}</p><p><strong>Dirección:</strong> ${escapeHtml(p.address || '—')}</p><p><strong>Antecedentes / observaciones:</strong> ${escapeHtml(p.notes || 'Sin observaciones registradas')}</p></div><div class="history-alert"><strong>Alergias</strong><br>${escapeHtml(p.allergies || 'No registradas')}</div>`;
  root.appendChild(profile);

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Este paciente aún no tiene atenciones ni procedimientos.';
    root.appendChild(empty);
    return;
  }

  const timeline = document.createElement('div');
  timeline.className = 'timeline';
  entries.forEach(e => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const isAttention = e.entryType === 'attention';
    const vitals = isAttention ? [
      ['PA', e.vitals?.bp], ['FC', e.vitals?.hr], ['Temp', e.vitals?.temp], ['SpO₂', e.vitals?.spo2], ['Peso', e.vitals?.weight], ['Talla', e.vitals?.height]
    ].filter(([,v]) => v) : [];
    item.innerHTML = `<div class="timeline-dot"></div><div class="timeline-card"><header><strong>${isAttention ? 'Atención clínica' : escapeHtml(e.name)}</strong><span>${fmtDate(e.date)}</span></header>${isAttention ? `<p><strong>Motivo:</strong> ${escapeHtml(e.reason || '—')}</p>${vitals.length ? `<div class="clinical-row">${vitals.map(([k,v]) => `<div class="clinical-chip"><strong>${k}</strong><br>${escapeHtml(v)}</div>`).join('')}</div>` : ''}<p><strong>Evaluación:</strong> ${escapeHtml(e.assessment || '—')}</p><p><strong>Diagnóstico:</strong> ${escapeHtml(e.diagnosis || '—')}</p><p><strong>Plan:</strong> ${escapeHtml(e.plan || '—')}</p>` : `<p><strong>Categoría:</strong> ${escapeHtml(e.category || '—')}</p><p><strong>Profesional:</strong> ${escapeHtml(e.professional || '—')}</p><p><strong>Importe:</strong> ${fmtCurrency(e.amount)}</p><p><strong>Observaciones:</strong> ${escapeHtml(e.notes || '—')}</p>`}</div>`;
    timeline.appendChild(item);
  });
  root.appendChild(timeline);
}

function getReportData() {
  const attentions = state.attentions.filter(a => inRange(a.date, reportRange.from, reportRange.to));
  const procedures = state.procedures.filter(p => inRange(p.date, reportRange.from, reportRange.to));
  const patientIds = new Set([...attentions.map(a => a.patientId), ...procedures.map(p => p.patientId)]);
  return { attentions, procedures, patientIds };
}

function reportMonthKey(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function reportMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const text = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderReports() {
  $('reportFrom').value = reportRange.from;
  $('reportTo').value = reportRange.to;

  const { attentions, procedures, patientIds } = getReportData();
  const encounterProcedures = procedures.filter(p => p.isEncounter);
  const attentionCount = attentions.length + encounterProcedures.length;
  const revenue = procedures.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const average = procedures.length ? revenue / procedures.length : 0;
  const activeDays = new Set([...attentions, ...procedures].map(x => isoDate(new Date(x.date)))).size;

  $('reportPatients').textContent = patientIds.size;
  $('reportAttentions').textContent = attentionCount;
  $('reportProcedures').textContent = procedures.length;
  $('reportAmount').textContent = fmtCurrency(revenue);
  $('reportAverage').textContent = fmtCurrency(average);
  $('reportActiveDays').textContent = activeDays;

  const procCounts = procedures.reduce((acc,p) => {
    const key = p.name || 'Sin especificar';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  renderBars($('procedureBars'), procCounts, 'No hay procedimientos en el período.');

  const daily = {};
  [...attentions, ...procedures].forEach(x => {
    const key = isoDate(new Date(x.date));
    daily[key] = (daily[key] || 0) + 1;
  });
  renderBars(
    $('dailyBars'),
    daily,
    'No hay actividad en el período.',
    key => fmtDate(`${key}T12:00:00`, false)
  );

  const monthly = {};
  const ensureMonth = key => {
    if (!monthly[key]) {
      monthly[key] = { patients: new Set(), attentions: 0, procedures: 0, revenue: 0 };
    }
    return monthly[key];
  };

  attentions.forEach(a => {
    const key = reportMonthKey(a.date);
    if (!key) return;
    const row = ensureMonth(key);
    row.patients.add(a.patientId);
    row.attentions += 1;
  });

  procedures.forEach(p => {
    const key = reportMonthKey(p.date);
    if (!key) return;
    const row = ensureMonth(key);
    row.patients.add(p.patientId);
    row.procedures += 1;
    row.revenue += Number(p.amount || 0);
    if (p.isEncounter) row.attentions += 1;
  });

  const monthKeys = Object.keys(monthly).sort();
  const monthlyIncome = Object.fromEntries(monthKeys.map(key => [key, monthly[key].revenue]));
  const monthlyAttention = Object.fromEntries(monthKeys.map(key => [key, monthly[key].attentions]));

  renderBars(
    $('monthlyIncomeBars'),
    monthlyIncome,
    'No hay ingresos en el período.',
    reportMonthLabel,
    value => fmtCurrency(value),
    true
  );
  renderBars(
    $('monthlyAttentionBars'),
    monthlyAttention,
    'No hay atenciones en el período.',
    reportMonthLabel,
    value => String(value),
    true
  );

  const monthlyBody = $('monthlySummaryTable');
  monthlyBody.innerHTML = '';
  [...monthKeys].reverse().forEach(key => {
    const row = monthly[key];
    const avg = row.procedures ? row.revenue / row.procedures : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="report-period">${escapeHtml(reportMonthLabel(key))}</td><td>${row.patients.size}</td><td>${row.attentions}</td><td>${row.procedures}</td><td class="report-money">${fmtCurrency(row.revenue)}</td><td class="report-money">${fmtCurrency(avg)}</td>`;
    monthlyBody.appendChild(tr);
  });
  $('monthlySummaryEmpty').classList.toggle('hidden', monthKeys.length > 0);

  const procSummary = {};
  procedures.forEach(p => {
    const key = p.name || 'Sin especificar';
    if (!procSummary[key]) procSummary[key] = { count: 0, revenue: 0 };
    procSummary[key].count += 1;
    procSummary[key].revenue += Number(p.amount || 0);
  });

  const procRows = Object.entries(procSummary).sort((a,b) => b[1].revenue - a[1].revenue);
  const procedureBody = $('procedureSummaryTable');
  procedureBody.innerHTML = '';
  procRows.forEach(([name, row]) => {
    const avg = row.count ? row.revenue / row.count : 0;
    const share = revenue ? (row.revenue / revenue) * 100 : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${escapeHtml(name)}</strong></td><td>${row.count}</td><td class="report-money">${fmtCurrency(row.revenue)}</td><td class="report-money">${fmtCurrency(avg)}</td><td class="report-share"><span>${share.toFixed(1)}%</span><div class="report-share-track"><div class="report-share-fill" style="width:${Math.max(2, share)}%"></div></div></td>`;
    procedureBody.appendChild(tr);
  });
  $('procedureSummaryEmpty').classList.toggle('hidden', procRows.length > 0);

  const movements = [
    ...attentions.map(a => ({
      date: a.date,
      patientId: a.patientId,
      type: 'Atención',
      detail: a.reason || 'Consulta clínica',
      professional: a.professional || '',
      amount: 0
    })),
    ...procedures.map(p => ({
      date: p.date,
      patientId: p.patientId,
      type: 'Procedimiento',
      detail: p.name,
      professional: p.professional || '',
      amount: Number(p.amount || 0)
    })),
  ].sort((a,b) => b.date.localeCompare(a.date));

  const tbody = $('movementsTable');
  tbody.innerHTML = '';
  movements.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtDate(m.date)}</td><td>${escapeHtml(patientName(m.patientId))}</td><td>${escapeHtml(m.type)}</td><td>${escapeHtml(m.detail)}</td><td>${escapeHtml(m.professional || '—')}</td><td class="report-money">${m.amount ? fmtCurrency(m.amount) : '—'}</td>`;
    tbody.appendChild(tr);
  });
  $('movementsEmpty').classList.toggle('hidden', movements.length > 0);
}

function renderBars(root, data, emptyText, labelFn = x => x, valueFn = x => String(x), preserveOrder = false) {
  let entries = Object.entries(data);
  if (!preserveOrder) entries = entries.sort((a,b) => b[1] - a[1]);
  entries = entries.slice(0, 36);

  if (!entries.length) {
    root.className = 'bars empty-state';
    root.textContent = emptyText;
    return;
  }

  root.className = 'bars';
  root.innerHTML = '';
  const max = Math.max(...entries.map(([,v]) => Number(v) || 0), 1);

  entries.forEach(([label, value]) => {
    const numeric = Number(value) || 0;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-label"><span>${escapeHtml(labelFn(label))}</span><strong>${escapeHtml(valueFn(numeric))}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (numeric/max)*100)}%"></div></div>`;
    root.appendChild(row);
  });
}
