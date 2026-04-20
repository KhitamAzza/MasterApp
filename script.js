const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwgwoKQNXSWn7BrwlzZe1XmVlY0JnGgA6CKY7cjVUXols6Oo_7IyBIiuVDmoQh__wO/exec';

let allStudents = [];
let attendanceColumns = [];
let dataLoaded = false;

const STATUS_OPTIONS = [
  { value: '',          label: 'Kosong',    class: '' },
  { value: 'HADIR',     label: 'HADIR',     class: 'status-hadir' },
  { value: 'IZIN',      label: 'IZIN',      class: 'status-izin' },
  { value: 'SAKIT',     label: 'SAKIT',     class: 'status-sakit' },
  { value: 'ALPHA',     label: 'ALPHA',     class: 'status-alpha' },
  { value: 'TERLAMBAT', label: 'TERLAMBAT', class: 'status-alpha' },
  { value: 'PAGI',      label: 'PAGI',      class: 'status-hadir' }
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('studentModal').addEventListener('click', (e) => {
    if (e.target.id === 'studentModal') {
      document.getElementById('studentModal').classList.remove('show');
    }
  });

  document.getElementById('searchInput').addEventListener('input', handleSearch);
});

// ─── Toggle Section ───────────────────────────────────────────────────────────

function toggleEditAbsensi() {
  const section = document.getElementById('editAbsensiSection');
  const btn = document.getElementById('btnEditAbsensi');
  const isOpen = section.classList.contains('section-visible');

  if (isOpen) {
    section.classList.remove('section-visible');
    section.classList.add('section-hidden');
    btn.classList.remove('active');
  } else {
    section.classList.remove('section-hidden');
    section.classList.add('section-visible');
    btn.classList.add('active');
    if (!dataLoaded) loadData();
  }
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const response = await fetch(`${GAS_URL}?action=masterData`);
    const result = await response.json();
    console.log('Loaded:', result);

    if (result && result.students) {
      allStudents = result.students;
      attendanceColumns = result.columns || [];
    } else if (Array.isArray(result) && result.length > 0) {
      allStudents = result;
      attendanceColumns = result[0].absenColumns || [];
    } else {
      throw new Error('Format data tidak valid');
    }

    document.getElementById('totalStudents').textContent = allStudents.length;
    document.getElementById('totalDays').textContent = attendanceColumns.length;
    document.getElementById('loading').style.display = 'none';
    dataLoaded = true;

  } catch (err) {
    document.getElementById('loading').textContent = 'Error memuat data: ' + err.message;
    console.error(err);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const container = document.getElementById('studentContainer');
  const noResults = document.getElementById('noResults');

  container.innerHTML = '';

  if (!query) {
    noResults.style.display = 'none';
    return;
  }

  const matches = allStudents
    .filter(s => s.nama.toLowerCase().includes(query))
    .slice(0, 5);

  if (matches.length === 0) {
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';
  matches.forEach(student => container.appendChild(createStudentItem(student)));
}

// ─── Student List Item ────────────────────────────────────────────────────────

function createStudentItem(student) {
  const item = document.createElement('div');
  item.className = 'student-item';
  item.innerHTML = `
    <strong>${student.nama}</strong>
    <span style="color:#888; font-size:13px; margin-left:10px;">${student.kelas} · ${student.ekstra}</span>
  `;
  item.addEventListener('click', () => openStudentModal(student));
  return item;
}

// ─── Student Modal ────────────────────────────────────────────────────────────

function openStudentModal(student) {
  const modal = document.getElementById('studentModal');
  const content = document.getElementById('modalContent');
  content.innerHTML = '';
  content.appendChild(createStudentCard(student));
  modal.classList.add('show');
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function createStudentCard(student) {
  const card = document.createElement('div');
  card.className = 'student-card active';

  const info = document.createElement('div');
  info.className = 'student-info';
  info.innerHTML = `
    <div class="info-item">
      <label>ID</label>
      <div class="value id">${student.id || '-'}</div>
    </div>
    <div class="info-item">
      <label>Nama</label>
      <div class="value nama">${student.nama}</div>
    </div>
    <div class="info-item">
      <label>Kelas</label>
      <div class="value kelas">${student.kelas || '-'}</div>
    </div>
    <div class="info-item">
      <label>Ekstra</label>
      <div class="value ekstra">${student.ekstra || '-'}</div>
    </div>
    <div class="info-item">
      <label>Denda</label>
      <div class="value">Rp ${Number(student.denda || 0).toLocaleString('id-ID')}</div>
    </div>
    <div class="info-item">
      <label>Status</label>
      <div class="value">${student.status || '-'}</div>
    </div>
  `;

  const attSection = document.createElement('div');
  attSection.className = 'attendance-section';
  attSection.innerHTML = '<h3>Edit Absensi Harian</h3>';

  const grid = document.createElement('div');
  grid.className = 'attendance-grid';

  attendanceColumns.forEach((col, idx) => {
    const currentValue = (student.absensi[idx] || '').toUpperCase();

    const item = document.createElement('div');
    item.className = 'attendance-item';

    const label = document.createElement('label');
    label.textContent = col.header;

    const select = document.createElement('select');
    select.dataset.row = student.rowIndex;
    select.dataset.col = col.col + 1;
    select.dataset.date = col.header;

    STATUS_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === currentValue) option.selected = true;
      select.appendChild(option);
    });

    updateSelectStyle(select, currentValue);

    select.addEventListener('change', (e) => {
      updateSelectStyle(e.target, e.target.value);
      saveAttendance(e.target);
    });

    item.appendChild(label);
    item.appendChild(select);
    grid.appendChild(item);
  });

  attSection.appendChild(grid);
  card.appendChild(info);
  card.appendChild(attSection);

  return card;
}

// ─── Style Helper ─────────────────────────────────────────────────────────────

function updateSelectStyle(select, value) {
  select.className = '';
  const option = STATUS_OPTIONS.find(o => o.value === value);
  if (option && option.class) select.classList.add(option.class);
}

// ─── Save Attendance ──────────────────────────────────────────────────────────

async function saveAttendance(select) {
  const row = parseInt(select.dataset.row);
  const col = parseInt(select.dataset.col);
  const value = select.value;
  const date = select.dataset.date;

  if (!row || !col) {
    showIndicator('error', 'Data baris/kolom tidak valid!');
    return;
  }

  try {
    const response = await fetch(
      `${GAS_URL}?action=updateAttendance&rowIndex=${row}&columnIndex=${col}&value=${encodeURIComponent(value)}`
    );
    const result = await response.json();

    if (result.status === 'ok') {
      showIndicator('success', `Tersimpan: ${date}`);
    } else {
      throw new Error(result.message || 'Unknown error');
    }
  } catch (err) {
    showIndicator('error', 'Gagal menyimpan!');
    console.error('saveAttendance error:', err);
  }
}

// ─── Toast Indicator ──────────────────────────────────────────────────────────

function showIndicator(type, message) {
  const indicator = document.getElementById('saveIndicator');
  indicator.textContent = message;
  indicator.className = `save-indicator ${type} show`;
  setTimeout(() => indicator.classList.remove('show'), 2000);
}
