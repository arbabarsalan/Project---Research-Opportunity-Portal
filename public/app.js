const API = '/api/opportunities';
const $ = (s) => document.querySelector(s);
let items = [];
let editingId = null;
let deleteId = null;

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

async function api(url, options = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details ? ': ' + data.details.join(', ') : '';
    throw new Error((data.error || 'Something went wrong') + detail);
  }
  return data;
}

const isPast = (d) => d < new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const skillChips = (s) => s.split(',').map(x => x.trim()).filter(Boolean).map(x => `<span class="chip">${esc(x)}</span>`).join('');

async function load() {
  try {
    items = await api(API);
    render();
  } catch (e) {
    $('#list').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    toast(e.message, true);
  }
}

function render() {
  const q = $('#search').value.toLowerCase().trim();
  const st = $('#filter').value;
  const shown = items.filter(o =>
    (!st || o.status === st) &&
    (!q || [o.title, o.research_area, o.faculty_name, o.required_skills, o.department].some(v => v.toLowerCase().includes(q))));
  $('#count').textContent = `${shown.length} of ${items.length} opportunities`;
  if (!shown.length) {
    $('#list').innerHTML = `<div class="empty">${items.length ? 'No opportunities match your search.' : 'No opportunities yet. Post the first one.'}</div>`;
    return;
  }
  $('#list').innerHTML = shown.map(o => `
    <article class="card ${o.status === 'Closed' ? 'closed' : ''}" tabindex="0" data-id="${o.id}">
      <span class="badge ${o.status}">${o.status}</span>
      <h3>${esc(o.title)}</h3>
      <div class="meta">${esc(o.faculty_name)}, ${esc(o.department)} | ${esc(o.research_area)}</div>
      <div class="meta">${o.positions} position${o.positions > 1 ? 's' : ''} | Apply by
        <span class="${o.status === 'Open' && isPast(o.deadline) ? 'late' : ''}">${fmtDate(o.deadline)}${o.status === 'Open' && isPast(o.deadline) ? ' (deadline passed)' : ''}</span></div>
      <div class="chips">${skillChips(o.required_skills)}</div>
    </article>`).join('');
}

async function showDetail(id) {
  try {
    const o = await api(`${API}/${id}`);
    $('#detail').innerHTML = `
      <span class="badge ${o.status}">${o.status}</span>
      <h2>${esc(o.title)}</h2>
      <p>${esc(o.description).replace(/\n/g, '<br>')}</p>
      <dl>
        <dt>Research area</dt><dd>${esc(o.research_area)}</dd>
        <dt>Faculty member</dt><dd>${esc(o.faculty_name)}</dd>
        <dt>Department</dt><dd>${esc(o.department)}</dd>
        <dt>Required skills</dt><dd class="chips" style="margin:0">${skillChips(o.required_skills)}</dd>
        <dt>Positions</dt><dd>${o.positions}</dd>
        <dt>Deadline</dt><dd>${fmtDate(o.deadline)}</dd>
      </dl>
      <div class="actions">
        <button class="btn danger left" data-act="delete">Delete</button>
        <button class="btn" data-act="toggle">${o.status === 'Open' ? 'Mark as closed' : 'Reopen'}</button>
        <button class="btn" data-act="edit">Edit</button>
        <button class="btn primary" data-act="close">Done</button>
      </div>`;
    $('#detail').dataset.id = o.id;
    $('#detailDlg').showModal();
  } catch (e) { toast(e.message, true); }
}

function openForm(o) {
  editingId = o ? o.id : null;
  $('#formTitle').textContent = o ? 'Edit opportunity' : 'Post an opportunity';
  $('#form').reset();
  $('#formError').textContent = '';
  document.querySelectorAll('#form .invalid').forEach(el => el.classList.remove('invalid'));
  if (o) for (const [k, v] of Object.entries(o)) { const el = $(`#form [name="${k}"]`); if (el) el.value = v; }
  $('#formDlg').showModal();
}

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = Object.fromEntries(new FormData(f));
  let bad = [];
  f.querySelectorAll('[name]').forEach(el => {
    const empty = !String(el.value).trim();
    el.classList.toggle('invalid', empty);
    if (empty) bad.push(el.name.replace('_', ' '));
  });
  if (bad.length) { $('#formError').textContent = 'Fill in: ' + bad.join(', '); return; }
  if (!(Number.isInteger(Number(body.positions)) && Number(body.positions) >= 1)) {
    $('#formError').textContent = 'Positions must be a whole number of 1 or more'; return;
  }
  body.positions = Number(body.positions);
  $('#saveBtn').disabled = true;
  try {
    if (editingId) await api(`${API}/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api(API, { method: 'POST', body: JSON.stringify(body) });
    $('#formDlg').close();
    toast(editingId ? 'Opportunity updated' : 'Opportunity posted');
    await load();
  } catch (err) { $('#formError').textContent = err.message; }
  finally { $('#saveBtn').disabled = false; }
});

$('#detail').addEventListener('click', async (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  const id = $('#detail').dataset.id;
  const o = items.find(x => x.id == id);
  if (act === 'close') $('#detailDlg').close();
  if (act === 'edit') { $('#detailDlg').close(); openForm(o); }
  if (act === 'delete') { deleteId = id; $('#confirmText').textContent = `"${o.title}" will be removed permanently.`; $('#detailDlg').close(); $('#confirmDlg').showModal(); }
  if (act === 'toggle') {
    const status = o.status === 'Open' ? 'Closed' : 'Open';
    try {
      await api(`${API}/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast(status === 'Closed' ? 'Opportunity closed' : 'Opportunity reopened');
      $('#detailDlg').close();
      await load();
    } catch (err) { toast(err.message, true); }
  }
});

$('#yesBtn').addEventListener('click', async () => {
  try {
    await api(`${API}/${deleteId}`, { method: 'DELETE' });
    toast('Opportunity deleted');
    await load();
  } catch (err) { toast(err.message, true); }
  $('#confirmDlg').close();
});
$('#noBtn').addEventListener('click', () => $('#confirmDlg').close());
$('#cancelBtn').addEventListener('click', () => $('#formDlg').close());
$('#newBtn').addEventListener('click', () => openForm(null));
$('#search').addEventListener('input', render);
$('#filter').addEventListener('change', render);
$('#list').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) showDetail(c.dataset.id); });
$('#list').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const c = e.target.closest('.card'); if (c) showDetail(c.dataset.id); } });

load();
