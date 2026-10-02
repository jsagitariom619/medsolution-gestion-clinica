const STORAGE_KEY = 'medsolution.clinic.v1';
const SCHEMA_VERSION = 1;

const emptyState = () => ({ version: SCHEMA_VERSION, patients: [], attentions: [], procedures: [] });
let state = loadState();
let currentView = 'dashboard';
let reportRange = getDefaultReportRange();

const titles = {
  dashboard: ['Inicio', 'Resumen operativo de la consulta'],
  patients: ['Pacientes', 'Registro y administración de pacientes'],
  attention: ['Atención', 'Registro de consultas y evaluación clínica'],
  history: ['Historias clínicas', 'Evolución longitudinal por paciente'],
  procedures: ['Procedimientos', 'Servicios y procedimientos realizados'],
  reports: ['Reportes', 'Movimientos y actividad clínica por período'],
};

const $ = (id) => document.getElementById(id);
const qsa = (sel) => [...document.querySelectorAll(sel)];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return emptyState();
  }
}

function normalizeState(data) {
  return {
    version: SCHEMA_VERSION,
    patients: Array.isArray(data?.patients) ? data.patients : [],
    attentions: Array.isArray(data?.attentions) ? data.attentions : [],
    procedures: Array.isArray(data?.procedures) ? data.procedures : [],
  };
}

function saveState() {
  state.version = SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value, withTime = true) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
}

function fmtCurrency(value) {
  const n = Number(value || 0);
  return `Bs ${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

function getAge(dob, recordedAge) {
  if (dob) {
    const birth = new Date(`${dob}T00:00:00`);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      if (age >= 0) return `${age} años`;
    }
  }
  const historical = Number(recordedAge);
  return Number.isFinite(historical) && historical > 0 ? `${historical} años (registrada)` : '—';
}

function patientById(id) {
  return state.patients.find(p => p.id === id);
}

function patientName(id) {
  return patientById(id)?.name || 'Paciente no encontrado';
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function navigate(view) {
  currentView = view;
  qsa('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('pageTitle').textContent = titles[view][0];
  $('pageSubtitle').textContent = titles[view][1];
  $('sidebar').classList.remove('open');
  if (view === 'history') renderHistory();
  if (view === 'reports') renderReports();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getDefaultReportRange() {
  const dates = [
    ...state.attentions.map(a => a.date),
    ...state.procedures.map(p => p.date),
  ].filter(Boolean).map(toDate).filter(Boolean).sort((a,b) => a - b);

  if (dates.length) {
    return { from: isoDate(dates[0]), to: isoDate(dates[dates.length - 1]) };
  }

  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: isoDate(first), to: isoDate(today) };
}

function isoDate(d) {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function inRange(value, from, to) {
  const d = toDate(value);
  if (!d) return false;
  const day = isoDate(d);
  return (!from || day >= from) && (!to || day <= to);
}

function renderAll() {
  renderPatientSelects();
  renderPatients();
  renderAttentions();
  renderProcedures();
  renderDashboard();
  if (currentView === 'history') renderHistory();
  if (currentView === 'reports') renderReports();
}

function renderPatientSelects() {
  const selects = [$('attentionPatient'), $('procedurePatient'), $('historyPatient')];
  selects.forEach(select => {
    const previous = select.value;
    select.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = select.id === 'historyPatient' ? 'Seleccionar paciente...' : 'Seleccionar paciente';
    select.appendChild(first);
    [...state.patients].sort((a,b) => a.name.localeCompare(b.name, 'es')).forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.doc ? `${p.name} — ${p.doc}` : p.name;
      select.appendChild(option);
    });
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  });
}

function renderPatients() {
  const term = $('patientSearch').value.trim().toLowerCase();
  const list = [...state.patients]
    .filter(p => [p.name, p.doc, p.phone].some(v => String(v || '').toLowerCase().includes(term)))
    .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const tbody = $('patientsTable');
  tbody.innerHTML = '';
  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.name)}</strong><small>${p.sex ? escapeHtml(p.sex) : 'Sin sexo especificado'}</small></td>
      <td>${escapeHtml(p.doc || '—')}</td>
      <td>${escapeHtml(p.phone || '—')}</td>
      <td>${escapeHtml(getAge(p.dob, p.ageRecorded))}</td>
      <td><div class="row-actions"><button class="row-action" data-history="${p.id}">Historia</button><button class="row-action" data-edit-patient="${p.id}">Editar</button><button class="row-action" data-delete-patient="${p.id}">Eliminar</button></div></td>`;
    tbody.appendChild(tr);
  });
  $('patientsEmpty').classList.toggle('hidden', list.length > 0);
  $('patientsCountLabel').textContent = `${state.patients.length} ${state.patients.length === 1 ? 'paciente' : 'pacientes'}`;
}

