const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwgwoKQNXSWn7BrwlzZe1XmVlY0JnGgA6CKY7cjVUXols6Oo_7IyBIiuVDmoQh__wO/exec';

let allStudents = [];
let attendanceColumns = [];
let dataLoaded = false;
let currentApp = null;

const STATUS_OPTIONS = [
  { value: '',          label: 'Kosong',    class: '' },
  { value: 'HADIR',     label: 'HADIR',     class: 'status-hadir' },
  { value: 'IZIN',      label: 'IZIN',      class: 'status-izin' },
  { value: 'SAKIT',     label: 'SAKIT',     class: 'status-sakit' },
  { value: 'ALPHA',     label: 'ALPHA',     class: 'status-alpha' },
  { value: 'TERLAMBAT', label: 'TERLAMBAT', class: 'status-alpha' },
  { value: 'PAGI',      label: 'PAGI',      class: 'status-hadir' }
];

const APP_CONFIG = {
  masterAdmin: {
    title: 'Master Admin',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>`,
    color: '#00d4ff'
  },
  qrPrinter: {
    title: 'Cetak QR',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <path d="M14 14h7v7h-7z"/>
      <path d="M14 17h4M17 14v7"/>
    </svg>`,
    color: '#ff6b35'
  },
  statistik: {
    title: 'Statistik',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3v18h18"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>`,
    color: '#c084fc'
  }
};

// ─── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  
  // Phone back button (popstate)
  window.addEventListener('popstate', handlePopState);
  
  // Close student modal on backdrop click
  document.getElementById('studentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'studentModal') {
      document.getElementById('studentModal').classList.remove('show');
    }
  });
});

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  
  if (clockTime) clockTime.textContent = timeStr;
  if (clockDate) clockDate.textContent = dateStr;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function openAppModal(appId) {
  currentApp = appId;
  const modal = document.getElementById('appModal');
  const content = document.getElementById('appModalContent');
  
  content.innerHTML = '';
  modal.classList.add('show');
  
  // Push state so back button works
  history.pushState({ app: appId }, '', '#');
  
  // Load app content
  loadAppContent(appId, content);
}

function closeAppModal() {
  const modal = document.getElementById('appModal');
  modal.classList.remove('show');
  currentApp = null;
  
  // Also close any nested student modal
  document.getElementById('studentModal')?.classList.remove('show');
}

function handlePopState(e) {
  // If modal is open, close it instead of going back in browser history
  const modal = document.getElementById('appModal');
  const studentModal = document.getElementById('studentModal');
  
  if (studentModal?.classList.contains('show')) {
    studentModal.classList.remove('show');
    // Push state again so next back closes app modal
    history.pushState({ app: currentApp }, '', '#');
    return;
  }
  
  if (modal?.classList.contains('show')) {
    modal.classList.remove('show');
    currentApp = null;
  }
}

// ─── App Content Loaders ────────────────────────────────────────────────────

function loadAppContent(appId, container) {
  if (appId === 'masterAdmin') {
    loadMasterAdmin(container);
  } else if (appId === 'qrPrinter') {
    loadQrPrinter(container);
  } else if (appId === 'statistik') {
    loadStatistik(container);
  }
}

// ─── Master Admin App ─────────────────────────────────────────────────────────

function loadMasterAdmin(container) {
  container.innerHTML = `
    <div class="container">
      <h1>MASTER ADMIN</h1>
      <div class="stats">
        <div class="stat-box">
          <div class="number" id="totalStudents">-</div>
          <div class="label">Total Siswa</div>
        </div>
        <div class="stat-box">
          <div class="number" id="totalDays">-</div>
          <div class="label">Hari Tercatat</div>
        </div>
      </div>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Cari nama siswa..." autocomplete="off">
      </div>
      <div class="loading" id="loading">Memuat data...</div>
      <div class="no-results" id="noResults">Tidak ada siswa dengan nama tersebut</div>
      <div id="studentContainer"></div>
    </div>
  `;
  
  const searchInput = container.querySelector('#searchInput');
  searchInput.addEventListener('input', handleSearch);
  
  loadData();
}

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

    const totalStudents = document.getElementById('totalStudents');
    const totalDays = document.getElementById('totalDays');
    const loading = document.getElementById('loading');
    
    if (totalStudents) totalStudents.textContent = allStudents.length;
    if (totalDays) totalDays.textContent = attendanceColumns.length;
    if (loading) loading.style.display = 'none';
    dataLoaded = true;

  } catch (err) {
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = 'Error memuat data: ' + err.message;
    console.error(err);
  }
}

function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const container = document.getElementById('studentContainer');
  const noResults = document.getElementById('noResults');
  
  if (!container) return;

  container.innerHTML = '';

  if (!query) {
    if (noResults) noResults.style.display = 'none';
    return;
  }

  const matches = allStudents
    .filter(s => s.nama.toLowerCase().includes(query))
    .slice(0, 5);

  if (matches.length === 0) {
    if (noResults) noResults.style.display = 'block';
    return;
  }

  if (noResults) noResults.style.display = 'none';
  matches.forEach(student => container.appendChild(createStudentItem(student)));
}

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

function openStudentModal(student) {
  // Push state so back button closes this modal first
  history.pushState({ studentModal: true }, '', '#student');
  
  const modal = document.getElementById('studentModal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  content.innerHTML = '';
  content.appendChild(createStudentCard(student));
  modal.classList.add('show');
}

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

function updateSelectStyle(select, value) {
  select.className = '';
  const option = STATUS_OPTIONS.find(o => o.value === value);
  if (option && option.class) select.classList.add(option.class);
}

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

// ─── Placeholder Apps ─────────────────────────────────────────────────────────

function loadQrPrinter(container) {
  container.innerHTML = `
    <div class="qr-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <path d="M14 17h4M17 14v7"/>
      </svg>
      <h2>Cetak QR Code</h2>
      <p>Fitur ini akan menghubungkan ke printer thermal Bluetooth untuk mencetak QR code dari data Google Spreadsheet.</p>
      <p style="margin-top:8px; font-size:12px; color:#555;">(Coming Soon)</p>
    </div>
  `;
}

function loadStatistik(container) {
  container.innerHTML = `
    <div class="stats-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 3v18h18"/>
        <path d="M18 17V9"/>
        <path d="M13 17V5"/>
        <path d="M8 17v-3"/>
      </svg>
      <h2>Statistik</h2>
      <p>Dashboard statistik absensi dan denda akan ditampilkan di sini.</p>
      <p style="margin-top:8px; font-size:12px; color:#555;">(Coming Soon)</p>
    </div>
  `;
}

// ─── Toast Indicator ──────────────────────────────────────────────────────────

function showIndicator(type, message) {
  const indicator = document.getElementById('saveIndicator');
  if (!indicator) return;
  indicator.textContent = message;
  indicator.className = `save-indicator ${type} show`;
  setTimeout(() => indicator.classList.remove('show'), 2000);
}
