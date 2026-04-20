
    // CONFIG - Replace with your GAS Web App URL
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzwgwoKQNXSWn7BrwlzZe1XmVlY0JnGgA6CKY7cjVUXols6Oo_7IyBIiuVDmoQh__wO/exec';
    
    let allStudents = [];
    let attendanceColumns = [];
    
    // Status options
    const STATUS_OPTIONS = [
  { value: '', label: 'Kosong', class: '' },
  { value: 'HADIR', label: 'HADIR', class: 'status-hadir' },
  { value: 'IZIN', label: 'IZIN', class: 'status-izin' },
  { value: 'SAKIT', label: 'SAKIT', class: 'status-sakit' },
  { value: 'ALPHA', label: 'ALPHA', class: 'status-alpha' },
  { value: 'TERLAMBAT', label: 'TERLAMBAT', class: 'status-alpha' },
  { value: 'PAGI', label: 'PAGI', class: 'status-hadir' }
];
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      loadData();
      document.getElementById('searchInput').addEventListener('input', handleSearch);
    });
    
    async function loadData() {
      try {
        const response = await fetch(`${GAS_URL}?action=masterData`);
        const result = await response.json();
        console.log(result);

        if (Array.isArray(result) && result.length > 0) {
          allStudents = result;
          attendanceColumns = result[0].absenColumns || [];
          
          document.getElementById('totalStudents').textContent = result.length;
          document.getElementById('totalDays').textContent = attendanceColumns.length;
          
          document.getElementById('loading').style.display = 'none';
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        document.getElementById('loading').textContent = 'Error: ' + err.message;
      }
    }
    
    function handleSearch(e) {
      const query = e.target.value.trim().toLowerCase();
      const container = document.getElementById('studentContainer');
      const noResults = document.getElementById('noResults');
      
      container.innerHTML = '';
      
      if (!query) {
        noResults.style.display = 'none';
        return;
      }
      
      const matches = allStudents.filter(s => 
        s.nama.toLowerCase().includes(query)
      );
      
      if (matches.length === 0) {
        noResults.style.display = 'block';
        return;
      }
      
      noResults.style.display = 'none';
      matches.forEach(student => {
        container.appendChild(createStudentCard(student));
      });
    }
    
    function createStudentCard(student) {
      const card = document.createElement('div');
      card.className = 'student-card active';
      
      // Info section
      const info = document.createElement('div');
      info.className = 'student-info';
      info.innerHTML = `
        <div class="info-item">
          <label>ID</label>
          <div class="value id">${student.id}</div>
        </div>
        <div class="info-item">
          <label>Nama</label>
          <div class="value nama">${student.nama}</div>
        </div>
        <div class="info-item">
          <label>Kelas</label>
          <div class="value kelas">${student.kelas}</div>
        </div>
        <div class="info-item">
          <label>Ekstra</label>
          <div class="value ekstra">${student.ekstra}</div>
        </div>
        <div class="info-item">
          <label>Denda</label>
          <div class="value">Rp ${student.denda.toLocaleString()}</div>
        </div>
        <div class="info-item">
          <label>Status</label>
          <div class="value">${student.status}</div>
        </div>
      `;
      
      // Attendance section
      const attSection = document.createElement('div');
      attSection.className = 'attendance-section';
      attSection.innerHTML = '<h3>Edit Absensi Harian</h3>';
      
      const grid = document.createElement('div');
      grid.className = 'attendance-grid';
      
      attendanceColumns.forEach((col, idx) => {
       const currentValue = (student.absensi[idx] || '').toUpperCase();
        const item = document.createElement('div');
        item.className = 'attendance-item';
        
        const select = document.createElement('select');
        select.dataset.row = student.rowIndex;
        select.dataset.col = col.col + 1; // 1-based for Sheets
        select.dataset.date = col.header;
        
        STATUS_OPTIONS.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (opt.value === currentValue) option.selected = true;
          select.appendChild(option);
        });
        
        // Apply color class
        updateSelectStyle(select, currentValue);
        
        select.addEventListener('change', (e) => {
          updateSelectStyle(e.target, e.target.value);
          saveAttendance(e.target);
        });
        
        item.innerHTML = `<label>${col.header}</label>`;
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
      if (option && option.class) {
        select.classList.add(option.class);
      }
    }

      async function saveAttendance(select) {
  const row = parseInt(select.dataset.row);
  const col = parseInt(select.dataset.col);
  const value = select.value;

  try {
    const response = await fetch(
      `${GAS_URL}?action=updateAttendance&rowIndex=${row}&columnIndex=${col}&value=${value}`
    );

    const result = await response.json();

    if (result.status === 'ok') {
      showIndicator('success', `Tersimpan: ${select.dataset.date}`);
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showIndicator('error', 'Gagal menyimpan!');
    console.error(err);
  }
}
    
    function showIndicator(type, message) {
      const indicator = document.getElementById('saveIndicator');
      indicator.textContent = message;
      indicator.className = `save-indicator ${type} show`;
      
      setTimeout(() => {
        indicator.classList.remove('show');
      }, 2000);
    }
