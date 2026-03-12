// --- LOGIKA DARK MODE TERCANGGIH & TERINGAN ---
const themeToggleBtn = document.getElementById('themeToggle');

// 1. Cek memori browser saat web pertama kali dibuka
if (localStorage.getItem('localDropTheme') === 'dark') {
    document.body.classList.add('dark-mode');
    if(themeToggleBtn) themeToggleBtn.textContent = '☀️';
}

// 2. Fungsi yang dipanggil saat tombol ditekan
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    
    if (isDark) {
        localStorage.setItem('localDropTheme', 'dark');
        document.getElementById('themeToggle').textContent = '☀️';
    } else {
        localStorage.setItem('localDropTheme', 'light');
        document.getElementById('themeToggle').textContent = '🌙';
    }
}
// ----------------------------------------------

let socket;
let currentPin = sessionStorage.getItem('localDropPin') || '';

// Cek apakah sudah pernah login di sesi ini
if (currentPin) {
    verifyPin(currentPin);
}

// FUNGSI LOGIN / VERIFIKASI PIN
async function verifyPin(pinParam = null) {
    const pin = pinParam || document.getElementById('pinInput').value;
    if (!pin) return;

    try {
        const res = await fetch('/api/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });

        if (res.ok) {
            currentPin = pin;
            sessionStorage.setItem('localDropPin', pin); // Simpan PIN sementara di browser
            
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
            
            initSocket(); // Hubungkan sistem real-time setelah login berhasil
        } else {
            document.getElementById('loginError').style.display = 'block';
            sessionStorage.removeItem('localDropPin');
        }
    } catch (err) {
        alert("Gagal terhubung ke server.");
    }
}

function logout() {
    sessionStorage.removeItem('localDropPin');
    location.reload(); // Muat ulang halaman untuk mengunci kembali
}

// INISIALISASI SOCKET DENGAN PIN
function initSocket() {
    socket = io({
        auth: { pin: currentPin } // Kirim PIN untuk validasi real-time
    });

    socket.on('connect_error', (err) => {
        alert(err.message);
        logout();
    });

    socket.on('textUpdated', (newText) => {
        document.getElementById('textInput').value = newText;
    });

    socket.on('filesShared', (filesArray) => {
        const fileDiv = document.getElementById('latestFile');
        const clearBtn = document.getElementById('clearBtn');
        
        if (!filesArray || filesArray.length === 0) return;

        fileDiv.style.display = 'block';
        clearBtn.style.display = 'inline-block'; 
        
        let linksHtml = '';
        filesArray.forEach(fileData => {
            linksHtml += `<a href="${fileData.url}" download="${fileData.name}">📥 Download: ${fileData.name}</a>`;
        });

        fileDiv.innerHTML = `🎉 <b>${filesArray.length} File Tersedia!</b><br><br>${linksHtml}`;
    });

    socket.on('filesCleared', () => {
        document.getElementById('latestFile').style.display = 'none';
        document.getElementById('latestFile').innerHTML = '';
        document.getElementById('clearBtn').style.display = 'none';
    });
}

// FUNGSI UTAMA APLIKASI
function clearFiles() {
    if (socket) socket.emit('clearFiles');
}

function updateText() {
    const text = document.getElementById('textInput').value;
    if (socket) socket.emit('updateText', text);
    
    const btn = document.querySelector('button[onclick="updateText()"]');
    const originalText = btn.textContent;
    btn.textContent = "Terkirim! ✓";
    setTimeout(() => btn.textContent = originalText, 1500);
}

async function fetchText() {
    try {
        const res = await fetch('/api/text', {
            headers: { 'x-pin': currentPin } // Sisipkan PIN ke header
        });
        if (!res.ok) throw new Error("Akses ditolak");
        const data = await res.json();
        document.getElementById('textInput').value = data.text;
        
        const btn = document.querySelector('button[onclick="fetchText()"]');
        const originalText = btn.textContent;
        btn.textContent = "Dimuat! ✓";
        setTimeout(() => btn.textContent = originalText, 1500);
    } catch (error) {
        alert(error.message);
        logout();
    }
}

function copyText() {
    const text = document.getElementById('textInput');
    text.select();
    text.setSelectionRange(0, 99999); 
    navigator.clipboard.writeText(text.value).then(() => {
        const btn = document.querySelector('button[onclick="copyText()"]');
        const originalText = btn.textContent;
        btn.textContent = "Berhasil Dicopy! ✓";
        setTimeout(() => btn.textContent = originalText, 1500);
    });
}

async function createTextFile() {
    const text = document.getElementById('textToFileInput').value;
    let filename = document.getElementById('fileNameInput').value.trim();
    const btn = document.getElementById('createTxtBtn');

    if (!text) return alert('Isi file tidak boleh kosong!');
    if (!filename) filename = 'Catatan-' + Math.floor(Date.now() / 1000) + '.txt';
    else if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';

    btn.textContent = "Membuat...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/create-txt', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-pin': currentPin 
            },
            body: JSON.stringify({ text, filename })
        });
        if (!res.ok) throw new Error("Akses ditolak");

        document.getElementById('textToFileInput').value = '';
        document.getElementById('fileNameInput').value = '';
        btn.textContent = "Berhasil Dibuat! ✓";
        setTimeout(() => { btn.textContent = "Buat & Bagikan .txt"; btn.disabled = false; }, 1500);
    } catch (error) {
        alert(error.message);
        btn.textContent = "Buat & Bagikan .txt";
        btn.disabled = false;
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) return alert('Pilih file dulu!');

    const files = fileInput.files;
    const uploadBtn = document.getElementById('uploadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let totalSize = 0;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]); 
        totalSize += files[i].size;
    }

    uploadBtn.textContent = "Mengirim...";
    uploadBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressText.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = `0% (0 MB / ${formatBytes(totalSize)})`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('x-pin', currentPin); // Sisipkan PIN

    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `${percentComplete}% (${formatBytes(event.loaded)} / ${formatBytes(event.total)})`;
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            fileInput.value = ''; 
            uploadBtn.textContent = "Upload File";
            uploadBtn.disabled = false;
            progressText.textContent = "Selesai!";
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressText.style.display = 'none';
            }, 3000);
        } else {
            alert("Akses ditolak atau terjadi kesalahan.");
            uploadBtn.textContent = "Upload File";
            uploadBtn.disabled = false;
        }
    };

    xhr.send(formData);
}