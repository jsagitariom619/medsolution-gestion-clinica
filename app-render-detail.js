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
  profile.innerHTML = `<div><h3>${escapeHtml(p.name)}</h3><p><strong>Edad:</strong> ${escapeHtml(getAge(p.dob))} &nbsp; <strong>Sexo:</strong> ${escapeHtml(p.sex || '—')}</p><p><strong>Documento:</strong> ${escapeHtml(p.doc || '—')} &nbsp; <strong>Teléfono:</strong> ${escapeHtml(p.phone || '—')}</p><p><strong>Dirección:</strong> ${escapeHtml(p.address || '—')}</p><p><strong>Antecedentes / observaciones:</strong> ${escapeHtml(p.notes || 'Sin observaciones registradas')}</p></div><div class="history-alert"><strong>Alergias</strong><br>${escapeHtml(p.allergies || 'No registradas')}</div>`;
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

function renderReports() {
  $('reportFrom').value = reportRange.from;
  $('reportTo').value = reportRange.to;
  const { attentions, procedures, patientIds } = getReportData();
  $('reportPatients').textContent = patientIds.size;
  $('reportAttentions').textContent = attentions.length;
  $('reportProcedures').textContent = procedures.length;
  $('reportAmount').textContent = fmtCurrency(procedures.reduce((s,p) => s + Number(p.amount || 0), 0));

  const procCounts = procedures.reduce((acc,p) => { acc[p.name] = (acc[p.name] || 0) + 1; return acc; }, {});
  renderBars($('procedureBars'), procCounts, 'No hay procedimientos en el período.');

  const daily = {};
  [...attentions, ...procedures].forEach(x => {
    const key = isoDate(new Date(x.date));
    daily[key] = (daily[key] || 0) + 1;
  });
  renderBars($('dailyBars'), Object.fromEntries(Object.entries(daily).sort(([a],[b]) => a.localeCompare(b))), 'No hay actividad en el período.', key => fmtDate(`${key}T12:00:00`, false));

  const movements = [
    ...attentions.map(a => ({ date: a.date, patientId: a.patientId, type: 'Atención', detail: a.reason || 'Consulta clínica', amount: 0 })),
    ...procedures.map(p => ({ date: p.date, patientId: p.patientId, type: 'Procedimiento', detail: p.name, amount: Number(p.amount || 0) })),
  ].sort((a,b) => b.date.localeCompare(a.date));
  const tbody = $('movementsTable');
  tbody.innerHTML = '';
  movements.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${fmtDate(m.date)}</td><td>${escapeHtml(patientName(m.patientId))}</td><td>${escapeHtml(m.type)}</td><td>${escapeHtml(m.detail)}</td><td>${m.amount ? fmtCurrency(m.amount) : '—'}</td>`;
    tbody.appendChild(tr);
  });
  $('movementsEmpty').classList.toggle('hidden', movements.length > 0);
}

function renderBars(root, data, emptyText, labelFn = x => x) {
  const entries = Object.entries(data).sort((a,b) => b[1] - a[1]).slice(0, 12);
  if (!entries.length) {
    root.className = 'bars empty-state';
    root.textContent = emptyText;
    return;
  }
  root.className = 'bars';
  root.innerHTML = '';
  const max = Math.max(...entries.map(([,v]) => v), 1);
  entries.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-label"><span>${escapeHtml(labelFn(label))}</span><strong>${value}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (value/max)*100)}%"></div></div>`;
    root.appendChild(row);
  });
}
