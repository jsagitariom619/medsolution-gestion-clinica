$('patientForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('patientId').value;
  const record = {
    id: id || uid(),
    name: $('patientName').value.trim(),
    doc: $('patientDoc').value.trim(),
    dob: $('patientDob').value,
    ageRecorded: $('patientAgeRecorded').value ? Number($('patientAgeRecorded').value) : null,
    sex: $('patientSex').value,
    phone: $('patientPhone').value.trim(),
    address: $('patientAddress').value.trim(),
    allergies: $('patientAllergies').value.trim(),
    notes: $('patientNotes').value.trim(),
    createdAt: id ? (patientById(id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!record.name) return;
  if (id) state.patients = state.patients.map(p => p.id === id ? record : p);
  else state.patients.push(record);
  resetPatientForm();
  saveState();
  showToast(id ? 'Paciente actualizado.' : 'Paciente registrado.');
});

$('attentionForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('attentionPatient').value) return showToast('Selecciona un paciente.');
  state.attentions.push({
    id: uid(),
    patientId: $('attentionPatient').value,
    date: $('attentionDate').value,
    reason: $('attentionReason').value.trim(),
    vitals: { bp: $('vitalBp').value.trim(), hr: $('vitalHr').value.trim(), temp: $('vitalTemp').value.trim(), spo2: $('vitalSpo2').value.trim(), weight: $('vitalWeight').value.trim(), height: $('vitalHeight').value.trim() },
    assessment: $('attentionAssessment').value.trim(),
    diagnosis: $('attentionDiagnosis').value.trim(),
    plan: $('attentionPlan').value.trim(),
    createdAt: new Date().toISOString(),
  });
  $('attentionForm').reset();
  $('attentionDate').value = nowLocalInput();
  saveState();
  showToast('Atención guardada en la historia clínica.');
});

$('procedureForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('procedurePatient').value) return showToast('Selecciona un paciente.');
  state.procedures.push({
    id: uid(),
    patientId: $('procedurePatient').value,
    date: $('procedureDate').value,
    category: $('procedureCategory').value,
    name: $('procedureName').value.trim(),
    professional: $('procedureProfessional').value.trim(),
    amount: Number($('procedureAmount').value || 0),
    notes: $('procedureNotes').value.trim(),
    createdAt: new Date().toISOString(),
    isEncounter: true,
  });
  $('procedureForm').reset();
  $('procedureDate').value = nowLocalInput();
  $('procedureAmount').value = '0';
  saveState();
  showToast('Procedimiento registrado.');
});

qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
qsa('[data-go]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.go)));
$('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('patientSearch').addEventListener('input', renderPatients);
$('cancelPatientEdit').addEventListener('click', resetPatientForm);
$('historyPatient').addEventListener('change', renderHistory);
$('applyReport').addEventListener('click', () => {
  const from = $('reportFrom').value;
  const to = $('reportTo').value;
  if (from && to && from > to) return showToast('La fecha inicial no puede ser posterior a la fecha final.');
  reportRange = { from, to };
  renderReports();
});

function populateReportYears() {
  const years = [...new Set([
    ...state.attentions.map(a => toDate(a.date)?.getFullYear()),
    ...state.procedures.map(p => toDate(p.date)?.getFullYear()),
  ].filter(Boolean))].sort((a,b) => b - a);
  const select = $('reportYearSelect');
  select.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  if (!years.length) {
    const current = new Date().getFullYear();
    select.innerHTML = `<option value="${current}">${current}</option>`;
  }
}

$('reportAll').addEventListener('click', () => {
  reportRange = getDefaultReportRange();
  $('reportMonthSelect').value = '';
  renderReports();
});

$('reportYear').addEventListener('click', () => {
  const year = Number($('reportYearSelect').value) || new Date().getFullYear();
  reportRange = { from: `${year}-01-01`, to: `${year}-12-31` };
  $('reportMonthSelect').value = '';
  renderReports();
});

$('reportMonth').addEventListener('click', () => {
  const year = Number($('reportYearSelect').value) || new Date().getFullYear();
  const month = $('reportMonthSelect').value || String(new Date().getMonth() + 1).padStart(2, '0');
  $('reportMonthSelect').value = month;
  const lastDay = new Date(year, Number(month), 0).getDate();
  reportRange = { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
  renderReports();
});

$('printReport').addEventListener('click', () => {
  renderReports();
  const from = toDate(reportRange.from);
  const to = toDate(reportRange.to);
  const isFullYear = from && to &&
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === 0 && from.getDate() === 1 &&
    to.getMonth() === 11 && to.getDate() === 31;
  document.body.classList.toggle('print-management', Boolean(isFullYear));
  if (isFullYear) {
    $('printReportPeriod').textContent = `Informe de Gestión ${from.getFullYear()}`;
  }
  window.print();
  setTimeout(() => document.body.classList.remove('print-management'), 500);
});
$('settingsProfessionalName').addEventListener('input', () => {
  const name = $('settingsProfessionalName').value.trim() || 'Dr. Jeason Flores';
  $('settingsPreviewName').textContent = name;
  const initials = profileInitials(name);
  $('settingsProfileInitials').textContent = initials;
});

$('settingsProfilePhoto').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return showToast('Selecciona una imagen válida.');
  if (file.size > 2 * 1024 * 1024) return showToast('La imagen debe pesar menos de 2 MB.');
  const reader = new FileReader();
  reader.onload = () => {
    state.settings = { ...(state.settings || {}), profilePhoto: String(reader.result || '') };
    saveState();
    showToast('Foto de perfil actualizada.');
  };
  reader.readAsDataURL(file);
});

$('removeProfilePhoto').addEventListener('click', () => {
  state.settings = { ...(state.settings || {}), profilePhoto: '' };
  $('settingsProfilePhoto').value = '';
  saveState();
  showToast('Foto de perfil eliminada.');
});

$('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const professionalName = $('settingsProfessionalName').value.trim() || 'Dr. Jeason Flores';
  state.settings = { ...(state.settings || {}), professionalName };
  saveState();
  showToast('Configuración guardada.');
});

$('exportJson').addEventListener('click', exportJson);
$('exportCsv').addEventListener('click', exportCsv);
$('importJson').addEventListener('change', (e) => { if (e.target.files?.[0]) importJson(e.target.files[0]); });

document.addEventListener('click', (e) => {
  const historyBtn = e.target.closest('[data-history]');
  if (historyBtn) {
    navigate('history');
    $('historyPatient').value = historyBtn.dataset.history;
    renderHistory();
    return;
  }
  const attentionBtn = e.target.closest('[data-new-attention]');
  if (attentionBtn) {
    navigate('attention');
    $('attentionPatient').value = attentionBtn.dataset.newAttention;
    $('attentionReason').focus();
    return;
  }
  const procedureBtn = e.target.closest('[data-new-procedure]');
  if (procedureBtn) {
    navigate('procedures');
    $('procedurePatient').value = procedureBtn.dataset.newProcedure;
    $('procedureName').focus();
    return;
  }
  const editBtn = e.target.closest('[data-edit-patient]');
  if (editBtn) return editPatient(editBtn.dataset.editPatient);
  const deleteBtn = e.target.closest('[data-delete-patient]');
  if (deleteBtn) return deletePatient(deleteBtn.dataset.deletePatient);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('sidebar').classList.remove('open');
});

$('attentionDate').value = nowLocalInput();
$('procedureDate').value = nowLocalInput();
$('reportFrom').value = reportRange.from;
$('reportTo').value = reportRange.to;
populateReportYears();
renderAll();
