function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function resetPatientForm() {
  $('patientForm').reset();
  $('patientId').value = '';
  $('patientFormTitle').textContent = 'Registrar paciente';
  $('patientSubmit').textContent = 'Guardar paciente';
  $('cancelPatientEdit').classList.add('hidden');
}

function editPatient(id) {
  const p = patientById(id);
  if (!p) return;
  $('patientId').value = p.id;
  $('patientName').value = p.name || '';
  $('patientDoc').value = p.doc || '';
  $('patientDob').value = p.dob || '';
  $('patientSex').value = p.sex || '';
  $('patientPhone').value = p.phone || '';
  $('patientAddress').value = p.address || '';
  $('patientAllergies').value = p.allergies || '';
  $('patientNotes').value = p.notes || '';
  $('patientFormTitle').textContent = 'Editar paciente';
  $('patientSubmit').textContent = 'Guardar cambios';
  $('cancelPatientEdit').classList.remove('hidden');
  navigate('patients');
  $('patientName').focus();
}

function deletePatient(id) {
  const p = patientById(id);
  if (!p) return;
  const linked = state.attentions.some(a => a.patientId === id) || state.procedures.some(pr => pr.patientId === id);
  if (linked) {
    showToast('No se puede eliminar: el paciente tiene historia clínica o procedimientos vinculados.');
    return;
  }
  if (!confirm(`¿Eliminar a ${p.name}? Esta acción no se puede deshacer.`)) return;
  state.patients = state.patients.filter(x => x.id !== id);
  saveState();
  showToast('Paciente eliminado.');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJson() {
  const stamp = isoDate(new Date());
  downloadFile(`medsolution-respaldo-${stamp}.json`, JSON.stringify(state, null, 2), 'application/json');
  showToast('Respaldo JSON generado.');
}

function exportCsv() {
  const { attentions, procedures } = getReportData();
  const dataRows = [];
  attentions.forEach(a => dataRows.push([
    a.date,
    patientName(a.patientId),
    'Atención',
    a.reason || 'Consulta clínica',
    a.professional || '',
    '',
    '0'
  ]));
  procedures.forEach(p => dataRows.push([
    p.date,
    patientName(p.patientId),
    'Procedimiento',
    p.name,
    p.professional || '',
    p.category || '',
    String(Number(p.amount || 0))
  ]));
  dataRows.sort((a,b) => String(b[0]).localeCompare(String(a[0])));
  const rows = [['fecha','paciente','tipo','detalle','profesional','categoria','importe_bs'], ...dataRows];
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  downloadFile(`medsolution-movimientos-${reportRange.from}-a-${reportRange.to}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
  showToast('Reporte CSV generado.');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const normalized = normalizeState(parsed);
      if (!confirm(`Se importarán ${normalized.patients.length} pacientes, ${normalized.attentions.length} atenciones y ${normalized.procedures.length} procedimientos, reemplazando los datos locales actuales. ¿Continuar?`)) return;
      state = normalized;
      reportRange = getDefaultReportRange();
      saveState();
      showToast('Respaldo importado correctamente.');
    } catch {
      showToast('El archivo no es un respaldo JSON válido.');
    } finally {
      $('importJson').value = '';
    }
  };
  reader.readAsText(file);
}
