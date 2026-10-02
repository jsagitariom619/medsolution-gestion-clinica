function renderAttentions() {
  const list = [...state.attentions].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10);
  const root = $('attentionList');
  if (!list.length) {
    root.className = 'stack-list empty-state';
    root.textContent = 'No hay atenciones registradas.';
    return;
  }
  root.className = 'stack-list';
  root.innerHTML = '';
  list.forEach(a => {
    const item = document.createElement('div');
    item.className = 'stack-item';
    item.innerHTML = `<div class="activity-icon">A</div><div class="stack-main"><strong>${escapeHtml(patientName(a.patientId))}</strong><span>${escapeHtml(a.reason || 'Atención clínica')}${a.diagnosis ? ` · ${escapeHtml(a.diagnosis)}` : ''}</span></div><time>${fmtDate(a.date)}</time>`;
    root.appendChild(item);
  });
}

function renderProcedures() {
  const list = [...state.procedures].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10);
  const root = $('procedureList');
  if (!list.length) {
    root.className = 'stack-list empty-state';
    root.textContent = 'No hay procedimientos registrados.';
    return;
  }
  root.className = 'stack-list';
  root.innerHTML = '';
  list.forEach(p => {
    const item = document.createElement('div');
    item.className = 'stack-item';
    item.innerHTML = `<div class="activity-icon">P</div><div class="stack-main"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(patientName(p.patientId))} · ${escapeHtml(p.category || 'Procedimiento')} · ${fmtCurrency(p.amount)}</span></div><time>${fmtDate(p.date)}</time>`;
    root.appendChild(item);
  });
}

function renderDashboard() {
  const range = getDefaultReportRange();
  const monthAtt = state.attentions.filter(a => inRange(a.date, range.from, range.to));
  const monthProc = state.procedures.filter(p => inRange(p.date, range.from, range.to));
  $('statPatients').textContent = state.patients.length;
  $('statAttentions').textContent = monthAtt.length;
  $('statProcedures').textContent = monthProc.length;
  $('statAmount').textContent = fmtCurrency(monthProc.reduce((s,p) => s + Number(p.amount || 0), 0));

  const activity = [
    ...state.attentions.map(a => ({ type: 'Atención', icon: 'A', date: a.date, patientId: a.patientId, detail: a.reason || 'Consulta clínica' })),
    ...state.procedures.map(p => ({ type: 'Procedimiento', icon: 'P', date: p.date, patientId: p.patientId, detail: p.name })),
  ].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7);
  const root = $('recentActivity');
  if (!activity.length) {
    root.className = 'activity-list empty-state';
    root.textContent = 'Aún no hay movimientos registrados.';
  } else {
    root.className = 'activity-list';
    root.innerHTML = '';
    activity.forEach(a => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `<div class="activity-icon">${a.icon}</div><div class="activity-main"><strong>${escapeHtml(patientName(a.patientId))}</strong><span>${escapeHtml(a.type)} · ${escapeHtml(a.detail)}</span></div><time>${fmtDate(a.date)}</time>`;
      root.appendChild(item);
    });
  }
}
