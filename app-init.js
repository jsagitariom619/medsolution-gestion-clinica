$('patientForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('patientId').value;
  const record = {
    id: id || uid(),
    name: $('patientName').value.trim(),
    doc: $('patientDoc').value.trim(),
    dob: $('patientDob').value,
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
renderAll();
