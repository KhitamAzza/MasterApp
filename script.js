const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwgwoKQNXSWn7BrwlzZe1XmVlY0JnGgA6CKY7cjVUXols6Oo_7IyBIiuVDmoQh__wO/exec';

let allStudents = [];
let attendanceColumns = [];
let dataLoaded = false;
let currentApp = null;

// QR Printer state
let sumberStudents = [];
let selectedStudent = null;
let bluetoothDevice = null;
let bluetoothServer = null;
let bluetoothCharacteristic = null;

//Kode khusus state
let kodeKhususList = [];
let kodeSelectedStudent = null;
let kodeGeneratedCodes = [];

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
  masterAdmin: { title: 'Master Admin', color: '#00d4ff' },
  qrPrinter:   { title: 'Cetak QR',     color: '#ff6b35' },
  kodeKhusus:  { title: 'Kode Khusus',  color: '#f59e0b' },
  statistik:   { title: 'Statistik',    color: '#c084fc' }
};

// ─── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  window.addEventListener('popstate', handlePopState);
  document.getElementById('studentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'studentModal') document.getElementById('studentModal').classList.remove('show');
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

// ─── Navigation ─────────────────────────────────────────────────────────────

function openAppModal(appId) {
  currentApp = appId;
  const modal = document.getElementById('appModal');
  const content = document.getElementById('appModalContent');
  content.innerHTML = '';
  modal.classList.add('show');
  history.pushState({ app: appId }, '', '#');
  loadAppContent(appId, content);
}

function closeAppModal() {
  const studentModal = document.getElementById('studentModal');
  const appModal = document.getElementById('appModal');

  // If student detail modal is open, close it first (stay in app)
  if (studentModal?.classList.contains('show')) {
    studentModal.classList.remove('show');
    history.pushState({ app: currentApp }, '', '#');
    return;
  }

  // Otherwise close the whole app and return to main menu
  appModal.classList.remove('show');
  currentApp = null;
}

function handlePopState(e) {
  const modal = document.getElementById('appModal');
  const studentModal = document.getElementById('studentModal');

  if (studentModal?.classList.contains('show')) {
    studentModal.classList.remove('show');
    history.pushState({ app: currentApp }, '', '#');
    return;
  }

  if (modal?.classList.contains('show')) {
    modal.classList.remove('show');
    currentApp = null;
  }
}

function loadAppContent(appId, container) {
  if (appId === 'masterAdmin') loadMasterAdmin(container);
  else if (appId === 'qrPrinter') loadQrPrinter(container);
  else if (appId === 'kodeKhusus') loadKodeKhusus(container);
  else if (appId === 'statistik') loadStatistik(container);
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER ADMIN
// ══════════════════════════════════════════════════════════════════════════════

function loadMasterAdmin(container) {
  container.innerHTML = `
    <div class="container">
      <h1>MASTER ADMIN</h1>
      <div class="stats">
        <div class="stat-box"><div class="number" id="totalStudents">-</div><div class="label">Total Siswa</div></div>
        <div class="stat-box"><div class="number" id="totalDays">-</div><div class="label">Hari Tercatat</div></div>
      </div>
      <div class="search-box"><input type="text" id="searchInput" placeholder="Cari nama siswa..." autocomplete="off"></div>
      <div class="loading" id="loading">Memuat data...</div>
      <div class="no-results" id="noResults">Tidak ada siswa dengan nama tersebut</div>
      <div id="studentContainer"></div>
    </div>`;
  container.querySelector('#searchInput').addEventListener('input', handleSearch);
  loadData();
}

async function loadData() {
  try {
    const res = await fetch(`${GAS_URL}?action=masterData`);
    const result = await res.json();
    if (result && result.students) {
      allStudents = result.students;
      attendanceColumns = result.columns || [];
    } else if (Array.isArray(result) && result.length > 0) {
      allStudents = result;
      attendanceColumns = result[0].absenColumns || [];
    } else throw new Error('Format data tidak valid');
    const ts = document.getElementById('totalStudents');
    const td = document.getElementById('totalDays');
    const ld = document.getElementById('loading');
    if (ts) ts.textContent = allStudents.length;
    if (td) td.textContent = attendanceColumns.length;
    if (ld) ld.style.display = 'none';
    dataLoaded = true;
  } catch (err) {
    const ld = document.getElementById('loading');
    if (ld) ld.textContent = 'Error memuat data: ' + err.message;
    console.error(err);
  }
}

function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const container = document.getElementById('studentContainer');
  const noResults = document.getElementById('noResults');
  if (!container) return;
  container.innerHTML = '';
  if (!query) { if (noResults) noResults.style.display = 'none'; return; }
  const matches = allStudents.filter(s => s.nama.toLowerCase().includes(query)).slice(0, 5);
  if (matches.length === 0) { if (noResults) noResults.style.display = 'block'; return; }
  if (noResults) noResults.style.display = 'none';
  matches.forEach(s => container.appendChild(createStudentItem(s)));
}

function createStudentItem(student) {
  const item = document.createElement('div');
  item.className = 'student-item';
  item.innerHTML = `<strong>${student.nama}</strong><span style="color:#888;font-size:13px;margin-left:10px;">${student.kelas} · ${student.ekstra}</span>`;
  item.addEventListener('click', () => openStudentModal(student));
  return item;
}

function openStudentModal(student) {
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
    <div class="info-item"><label>ID</label><div class="value id">${student.id || '-'}</div></div>
    <div class="info-item"><label>Nama</label><div class="value nama">${student.nama}</div></div>
    <div class="info-item"><label>Kelas</label><div class="value kelas">${student.kelas || '-'}</div></div>
    <div class="info-item"><label>Ekstra</label><div class="value ekstra">${student.ekstra || '-'}</div></div>
    <div class="info-item"><label>Denda</label><div class="value">Rp ${Number(student.denda || 0).toLocaleString('id-ID')}</div></div>
    <div class="info-item"><label>Status</label><div class="value">${student.status || '-'}</div></div>`;
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
    select.addEventListener('change', (e) => { updateSelectStyle(e.target, e.target.value); saveAttendance(e.target); });
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
  if (!row || !col) { showIndicator('error', 'Data baris/kolom tidak valid!'); return; }
  try {
    const res = await fetch(`${GAS_URL}?action=updateAttendance&rowIndex=${row}&columnIndex=${col}&value=${encodeURIComponent(value)}`);
    const result = await res.json();
    if (result.status === 'ok') showIndicator('success', `Tersimpan: ${date}`);
    else throw new Error(result.message || 'Unknown error');
  } catch (err) {
    showIndicator('error', 'Gagal menyimpan!');
    console.error('saveAttendance error:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QR PRINTER
// ══════════════════════════════════════════════════════════════════════════════

function loadQrPrinter(container) {
  container.innerHTML = `
    <div class="container">
      <h1>CETAK QR CODE</h1>
      <div class="qr-search-container">
        <div class="search-box">
          <input type="text" id="qrSearchInput" placeholder="Cari nama siswa..." autocomplete="off">
        </div>
        <div class="qr-autocomplete" id="qrAutocomplete"></div>
      </div>
      <div class="loading" id="qrLoading">Memuat data siswa...</div>
      <div id="qrResult"></div>
    </div>`;
  container.querySelector('#qrSearchInput').addEventListener('input', handleQrSearch);
  loadSumberData();
}

async function loadSumberData() {
  try {
    const res = await fetch(`${GAS_URL}?action=getSumberStudents`);
    const result = await res.json();
    if (Array.isArray(result)) {
      sumberStudents = result;
    } else if (result && result.students) {
      sumberStudents = result.students;
    } else {
      throw new Error('Format data tidak valid');
    }
    const ld = document.getElementById('qrLoading');
    if (ld) ld.style.display = 'none';
  } catch (err) {
    const ld = document.getElementById('qrLoading');
    if (ld) ld.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

function handleQrSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const auto = document.getElementById('qrAutocomplete');
  if (!auto) return;
  auto.innerHTML = '';
  if (!query) { auto.classList.remove('show'); return; }
  const matches = sumberStudents.filter(s => s.nama && s.nama.toLowerCase().includes(query)).slice(0, 8);
  if (matches.length === 0) { auto.classList.remove('show'); return; }
  matches.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'qr-autocomplete-item';
    item.innerHTML = `<div class="name">${s.nama || 'Tanpa Nama'}</div><div class="meta">${s.kelas || '-'} · ID: ${s.id || 'KOSONG'}</div>`;
    item.addEventListener('click', () => selectQrStudent(s));
    auto.appendChild(item);
  });
  auto.classList.add('show');
}

function selectQrStudent(student) {
  if (!student || !student.id) {
    showIndicator('error', 'Data siswa tidak lengkap (ID kosong)');
    console.error("Invalid student selected:", student);
    return;
  }
  selectedStudent = student;
  document.getElementById('qrAutocomplete').classList.remove('show');
  document.getElementById('qrSearchInput').value = student.nama || '';
  renderQrCard(student);
}

function renderQrCard(student) {
  const container = document.getElementById('qrResult');
  if (!container) return;
  const safeId = String(student.id || "").trim();
  if (!safeId) {
    container.innerHTML = `<div class="loading" style="color:#f87171;">Error: ID siswa kosong</div>`;
    return;
  }
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(safeId)}&size=200&margin=2&dark=000000&light=ffffff`;
  const isConnected = bluetoothDevice !== null;
  container.innerHTML = `
    <div class="qr-card">
      <div class="qr-card-header">
        <h2>${student.nama || 'Tanpa Nama'}</h2>
        <div class="kelas">${student.kelas || '-'}</div>
      </div>
      <div class="qr-image-wrap">
        <img src="${qrUrl}" alt="QR Code" id="qrImage" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23fff%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23333%22 font-size=%2214%22%3EQR Error%3C/text%3E%3C/svg%3E'">
      </div>
      <div class="qr-id-text">${safeId}</div>
      <button class="qr-connect-btn ${isConnected ? 'connected' : ''}" id="qrConnectBtn" onclick="connectBluetooth()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>
        </svg>
        <span>${isConnected ? 'Printer Terhubung' : 'Hubungkan Printer'}</span>
      </button>
      <br>
      <button class="qr-print-btn" id="qrPrintBtn" onclick="printQrThermal()" ${!isConnected ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        <span>Cetak QR</span>
      </button>
      <div class="qr-status" id="qrStatus">${isConnected ? 'Siap mencetak' : 'Hubungkan printer Bluetooth terlebih dahulu'}</div>
    </div>`;
}

// ─── Bluetooth Connection ───────────────────────────────────────────────────

async function connectBluetooth() {
  const status = document.getElementById('qrStatus');
  const connectBtn = document.getElementById('qrConnectBtn');
  const printBtn = document.getElementById('qrPrintBtn');
  
  try {
    if (status) status.textContent = 'Mencari printer...';
    
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000fee7-0000-1000-8000-00805f9b34fb'
      ]
    });
    
    if (status) status.textContent = 'Menghubungkan...';
    bluetoothServer = await bluetoothDevice.gatt.connect();
    
    const services = await bluetoothServer.getPrimaryServices();
    let targetChar = null;
    
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetChar = char;
          break;
        }
      }
      if (targetChar) break;
    }
    
    if (!targetChar) throw new Error('Printer tidak mendukung write characteristic');
    
    bluetoothCharacteristic = targetChar;
    
    // QR Printer buttons
    if (connectBtn) {
      connectBtn.classList.add('connected');
      connectBtn.querySelector('span').textContent = 'Printer Terhubung';
    }
    if (printBtn) printBtn.disabled = false;
    
    // Kode Khusus buttons ← ADD THIS BLOCK
    const kodeConnectBtn = document.getElementById('kodeConnectBtn');
    const kodePrintBtn = document.getElementById('kodePrintBtn');
    if (kodeConnectBtn) {
      kodeConnectBtn.classList.add('connected');
      kodePrintBtn.querySelector('span').textContent = 'Printer Terhubung';
    }
    if (kodePrintBtn) kodePrintBtn.disabled = false;
    
    if (status) status.textContent = `Terhubung: ${bluetoothDevice.name || 'Unknown'}`;
    
    showIndicator('success', 'Printer terhubung!');
    
  } catch (err) {
    console.error('Bluetooth error:', err);
    if (status) status.textContent = 'Gagal: ' + err.message;
    showIndicator('error', 'Gagal menghubungkan printer');
  }
}

// ─── Bitmap QR Helpers ────────────────────────────────────────────────────────

async function renderQrToBitmap(text, moduleSize = 7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: 'M',
      margin: 3,
      scale: moduleSize,
      color: { dark: '#000000', light: '#ffffff' }
    }, (err) => {
      if (err) return reject(err);
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h).data;
      const byteWidth = Math.ceil(w / 8);
      const bitmap = [];
      for (let y = 0; y < h; y++) {
        for (let bx = 0; bx < byteWidth; bx++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = bx * 8 + bit;
            if (x < w) {
              const idx = (y * w + x) * 4;
              if (imageData[idx] < 128) byte |= (0x80 >> bit);
            }
          }
          bitmap.push(byte);
        }
      }
      resolve({ bitmap, width: byteWidth, height: h });
    });
  });
}

async function buildQrBitmapCommands(text) {
  const { bitmap, width, height } = await renderQrToBitmap(text, 7);
  const commands = [];
  const xL = width & 0xFF;
  const xH = (width >> 8) & 0xFF;
  const yL = height & 0xFF;
  const yH = (height >> 8) & 0xFF;
  commands.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);
  commands.push(...bitmap);
  return commands;
}

// ─── printQrThermal (full replacement) ───────────────────────────────────────

async function printQrThermal() {
  if (!selectedStudent) {
    showIndicator('error', 'Pilih siswa terlebih dahulu');
    return;
  }
  if (!selectedStudent.id) {
    showIndicator('error', 'ID siswa kosong, tidak bisa mencetak');
    return;
  }
  if (!bluetoothCharacteristic) {
    showIndicator('error', 'Hubungkan printer dulu');
    return;
  }

  const status = document.getElementById('qrStatus');
  const printBtn = document.getElementById('qrPrintBtn');

  try {
    if (printBtn) printBtn.disabled = true;
    if (status) status.textContent = 'Menyiapkan QR...';

    const encoder = new EscPosEncoder();
    const safeId = String(selectedStudent.id).trim();
    let commands = [];

    // Init printer
    commands.push(0x1B, 0x40);

    // Center align
    commands.push(0x1B, 0x61, 0x01);

    // Name — bold + double height + double width
    commands.push(0x1B, 0x21, 0x30);
    commands.push(...encoder.encodeText(selectedStudent.nama || 'Siswa'));
    commands.push(0x0A);

    // Class — normal
    commands.push(0x1B, 0x21, 0x00);
    commands.push(...encoder.encodeText(selectedStudent.kelas || '-'));
    commands.push(0x0A, 0x0A);

    // ─── Bitmap QR ────────────────────────────────────────────────────────────
    if (status) status.textContent = 'Merender QR...';
    const qrCommands = await buildQrBitmapCommands(safeId);
    commands.push(...qrCommands);
    commands.push(0x0A, 0x0A);

    // ID below QR — slightly bold
    commands.push(0x1B, 0x21, 0x10);
    commands.push(...encoder.encodeText(safeId));
    commands.push(0x0A, 0x0A);

    // Feed and cut
    commands.push(0x1B, 0x64, 0x03);
    commands.push(0x1D, 0x56, 0x00);

    // ─── Send in chunks ───────────────────────────────────────────────────────
    if (status) status.textContent = 'Mencetak...';
    const chunkSize = 64;
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = new Uint8Array(commands.slice(i, i + chunkSize));
      if (bluetoothCharacteristic.properties.writeWithoutResponse) {
        await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await bluetoothCharacteristic.writeValueWithResponse(chunk);
      }
      await new Promise(r => setTimeout(r, 50));
    }

    if (status) status.textContent = 'Selesai mencetak!';
    showIndicator('success', 'QR berhasil dicetak!');

  } catch (err) {
    console.error('Print error:', err);
    if (status) status.textContent = 'Gagal mencetak: ' + err.message;
    showIndicator('error', 'Gagal mencetak');
  } finally {
    if (printBtn) printBtn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTIK PLACEHOLDER
// ══════════════════════════════════════════════════════════════════════════════

function loadStatistik(container) {
  container.innerHTML = `
    <div class="stats-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
      </svg>
      <h2>Statistik</h2>
      <p>Dashboard statistik absensi dan denda akan ditampilkan di sini.</p>
      <p style="margin-top:8px;font-size:12px;color:#555;">(Coming Soon)</p>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// KODE KHUSUS
// ══════════════════════════════════════════════════════════════════════════════

function loadKodeKhusus(container) {
  container.innerHTML = `
    <div class="container">
      <h1 style="background: linear-gradient(90deg, #f59e0b, #d97706); -webkit-background-clip: text;">KODE KHUSUS</h1>
      <div class="loading" id="kodeLoading">Memuat data...</div>
      <div id="kodeContainer"></div>
    </div>`;
  loadKodeKhususData();
}

async function loadKodeKhususData() {
  try {
    const res = await fetch(`${GAS_URL}?action=getKodeKhusus`);
    const result = await res.json();
    if (Array.isArray(result)) {
      kodeKhususList = result;
    } else if (result && result.codes) {
      kodeKhususList = result.codes;
    } else {
      kodeKhususList = [];
    }
    const ld = document.getElementById('kodeLoading');
    if (ld) ld.style.display = 'none';
    renderKodeKhususList();
  } catch (err) {
    const ld = document.getElementById('kodeLoading');
    if (ld) ld.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

function renderKodeKhususList() {
  const container = document.getElementById('kodeContainer');
  if (!container) return;

  const unused = kodeKhususList.filter(k => !k.status || k.status === '');
  const used = kodeKhususList.filter(k => k.status === 'used');

  let html = '';

  // Unused codes
  if (unused.length > 0) {
    html += `
      <div class="kode-section">
        <div class="kode-section-title">Kode Belum Digunakan (${unused.length})</div>
        <div class="kode-list">
          ${unused.map(k => kodeItemHTML(k, false)).join('')}
        </div>
      </div>`;
  }

  // Used codes
  if (used.length > 0) {
    html += `
      <div class="kode-section">
        <div class="kode-section-title">Kode Sudah Digunakan (${used.length})</div>
        <div class="kode-list">
          ${used.slice(0, 10).map(k => kodeItemHTML(k, true)).join('')}
        </div>
        ${used.length > 10 ? `<div style="text-align:center;color:#555;font-size:12px;padding:12px;">...dan ${used.length - 10} lainnya</div>` : ''}
      </div>`;
  }

  // Empty state
  if (kodeKhususList.length === 0) {
    html += `<div style="text-align:center;padding:40px;color:#555;">Belum ada kode khusus</div>`;
  }

  // Add button
  html += `
    <button class="kode-add-btn" onclick="showKodeGenerateForm()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Tambah Kode Khusus</span>
    </button>`;

  container.innerHTML = html;
}

function kodeItemHTML(kode, isUsed) {
  return `
    <div class="kode-item">
      <div class="kode-item-info">
        <div class="kode-item-name">${kode.nama || '-'}</div>
        <div class="kode-item-meta">${kode.kelas || '-'} · ID: ${kode.idSiswa || '-'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="kode-item-code">${kode.kode || '-----'}</div>
        <span class="kode-item-status ${isUsed ? 'kode-status-used' : 'kode-status-unused'}">${isUsed ? 'Used' : 'Unused'}</span>
      </div>
    </div>`;
}

function showKodeGenerateForm() {
  const container = document.getElementById('kodeContainer');
  if (!container) return;

  kodeSelectedStudent = null;
  kodeGeneratedCodes = [];

  container.innerHTML = `
    <div class="kode-generate-form">
      <h3>Buat Kode Khusus Baru</h3>
      <div class="kode-search-wrap">
        <div class="search-box">
          <input type="text" id="kodeSearchInput" placeholder="Cari nama siswa..." autocomplete="off">
        </div>
        <div class="qr-autocomplete" id="kodeAutocomplete"></div>
      </div>
      <div id="kodeSelectedStudent"></div>
      <div id="kodeGeneratedCodes"></div>
      <div id="kodeActionButtons"></div>
      <button class="kode-cancel-btn" onclick="renderKodeKhususList()">Batal</button>
    </div>`;

  // Load sumber students if not already loaded
  if (sumberStudents.length === 0) {
    loadSumberData().then(() => setupKodeSearch());
  } else {
    setupKodeSearch();
  }
}

function setupKodeSearch() {
  const input = document.getElementById('kodeSearchInput');
  const auto = document.getElementById('kodeAutocomplete');
  if (!input || !auto) return;

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    auto.innerHTML = '';
    if (!query) { auto.classList.remove('show'); return; }

    const matches = sumberStudents.filter(s => s.nama && s.nama.toLowerCase().includes(query)).slice(0, 8);
    if (matches.length === 0) { auto.classList.remove('show'); return; }

    matches.forEach(s => {
      const item = document.createElement('div');
      item.className = 'qr-autocomplete-item';
      item.innerHTML = `<div class="name">${s.nama || 'Tanpa Nama'}</div><div class="meta">${s.kelas || '-'} · ID: ${s.id || 'KOSONG'}</div>`;
      item.addEventListener('click', () => selectKodeStudent(s));
      auto.appendChild(item);
    });
    auto.classList.add('show');
  });
}

function selectKodeStudent(student) {
  if (!student || !student.id) {
    showIndicator('error', 'Data siswa tidak lengkap');
    return;
  }
  kodeSelectedStudent = student;

  const auto = document.getElementById('kodeAutocomplete');
  const input = document.getElementById('kodeSearchInput');
  if (auto) auto.classList.remove('show');
  if (input) input.value = student.nama || '';

  const container = document.getElementById('kodeSelectedStudent');
  if (container) {
    container.innerHTML = `
      <div class="kode-selected-student">
        <div class="label">Siswa Terpilih</div>
        <div class="name">${student.nama}</div>
        <div class="meta">${student.kelas || '-'} · ID: ${student.id}</div>
      </div>`;
  }

  renderKodeActionButtons();
}

function renderKodeActionButtons() {
  const container = document.getElementById('kodeActionButtons');
  if (!container) return;

    if (kodeGeneratedCodes.length === 2) {
    const isConnected = bluetoothCharacteristic !== null;
    container.innerHTML = `
      <button class="qr-connect-btn ${isConnected ? 'connected' : ''}" id="kodeConnectBtn" onclick="connectBluetooth()" style="margin-bottom:12px;width:100%;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>
        </svg>
        <span>${isConnected ? 'Printer Terhubung' : 'Hubungkan Printer'}</span>
      </button>
      <button class="kode-print-btn" id="kodePrintBtn" onclick="printKodeThermal()" ${!isConnected ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        <span>Cetak Kode</span>
      </button>`;
  } else {
    // Show generate button
    container.innerHTML = `
      <button class="kode-generate-btn" id="kodeGenerateBtn" onclick="generateKodeKhusus()" ${!kodeSelectedStudent ? 'disabled' : ''}>
        Generate 2 Kode
      </button>`;
  }
}

function generateKodeKhusus() {
  if (!kodeSelectedStudent) return;

  const existingCodes = new Set(kodeKhususList.map(k => k.kode));
  kodeGeneratedCodes = [];
  let attempts = 0;
  
  while (kodeGeneratedCodes.length < 2 && attempts < 100) {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    if (!existingCodes.has(code) && !kodeGeneratedCodes.includes(code)) {
      kodeGeneratedCodes.push(code);
    }
    attempts++;
  }
  
  if (kodeGeneratedCodes.length < 2) {
    showIndicator('error', 'Gagal generate kode unik, coba lagi');
    return;
  }

  renderKodeActionButtons();
}

async function printKodeThermal() {
  if (!kodeSelectedStudent || kodeGeneratedCodes.length !== 2) {
    showIndicator('error', 'Generate kode terlebih dahulu');
    return;
  }
if (!bluetoothCharacteristic) {   // ← ADD THIS BLOCK
    showIndicator('error', 'Hubungkan printer dulu');
    return;
  }
  const printBtn = document.getElementById('kodePrintBtn');
  
  try {
    if (printBtn) printBtn.disabled = true;

    // Save to sheet first — FIX: action goes in body, not URL
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveKodeKhusus',  // ← action goes here
        idSiswa: kodeSelectedStudent.id,
        nama: kodeSelectedStudent.nama,
        kelas: kodeSelectedStudent.kelas || '',
        kodes: kodeGeneratedCodes
      })
    });
    
    const result = await res.json();
    if (result.status !== 'ok') throw new Error(result.message || 'Gagal menyimpan');

    // Print via Bluetooth
    await sendKodeToPrinter();

    showIndicator('success', 'Kode tersimpan & dicetak!');
    
    setTimeout(() => {
      kodeSelectedStudent = null;
      kodeGeneratedCodes = [];
      loadKodeKhususData();
    }, 1500);

  } catch (err) {
    console.error('Kode print error:', err);
    showIndicator('error', err.message || 'Gagal mencetak');
    if (printBtn) printBtn.disabled = false;
  }
}
async function sendKodeToPrinter() {
  //if (!bluetoothCharacteristic) {
    //throw new Error('Printer belum terhubung');
  //}

  const encoder = new EscPosEncoder();
  let commands = [];

  // Init
  commands.push(0x1B, 0x40);
  // Center align
  commands.push(0x1B, 0x61, 0x01);
  // Bold + big title
  commands.push(0x1B, 0x21, 0x30);
  commands.push(...encoder.encodeText('KODE KHUSUS'));
  commands.push(0x0A, 0x0A);
  // Normal
  commands.push(0x1B, 0x21, 0x00);
  commands.push(...encoder.encodeText(kodeSelectedStudent.nama || 'Siswa'));
  commands.push(0x0A);
  commands.push(...encoder.encodeText(kodeSelectedStudent.kelas || '-'));
  commands.push(0x0A, 0x0A);

  // Codes
  kodeGeneratedCodes.forEach((code, idx) => {
    commands.push(0x1B, 0x21, 0x20);
    commands.push(...encoder.encodeText(`KODE ${idx + 1}`));
    commands.push(0x0A);
    commands.push(0x1B, 0x21, 0x30);
    commands.push(...encoder.encodeText(code));
    commands.push(0x0A, 0x0A);
  });

  // Reset + cut
  commands.push(0x1B, 0x21, 0x00);
  commands.push(0x1B, 0x64, 0x03);
  commands.push(0x1D, 0x56, 0x00);

  // Send chunks
  const chunkSize = 64;
  for (let i = 0; i < commands.length; i += chunkSize) {
    const chunk = new Uint8Array(commands.slice(i, i + chunkSize));
    if (bluetoothCharacteristic.properties.writeWithoutResponse) {
      await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await bluetoothCharacteristic.writeValueWithResponse(chunk);
    }
    await new Promise(r => setTimeout(r, 50));
  }
}

// ─── Toast Indicator ────────────────────────────────────────────────────────

function showIndicator(type, message) {
  const indicator = document.getElementById('saveIndicator');
  if (!indicator) return;
  indicator.textContent = message;
  indicator.className = `save-indicator ${type} show`;
  setTimeout(() => indicator.classList.remove('show'), 2000);
}

