const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- PASTIKAN FOLDER UPLOADS SELALU ADA SAAT SERVER MENYALA ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
// --------------------------------------------------------------

// --- KONFIGURASI KEAMANAN ---
const SECRET_PIN = "1234"; 

app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads'));

const checkPin = (req, res, next) => {
    const pin = req.headers['x-pin'];
    if (String(pin) === String(SECRET_PIN)) {
        next(); 
    } else {
        res.status(401).json({ success: false, message: 'Akses Ditolak: PIN Salah' });
    }
};

app.post('/api/verify-pin', (req, res) => {
    if (String(req.body.pin) === String(SECRET_PIN)) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// --- FUNGSI FORMAT WAKTU (YYYYMMDD-HHMMSS) ---
function getFormattedTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0'); 
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0'); 
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    // Sesuai permintaan Anda, pemisah antara tanggal dan jam menggunakan strip (-)
    return `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
}
// ---------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Karena folder dijamin sudah dibuat saat server menyala, 
        // kita langsung suruh Multer menaruhnya di sana.
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        // 1. Ambil ekstensi dengan titik (misal: ".docx")
        const extWithDot = path.extname(file.originalname);
        // 2. Ambil ekstensi tanpa titik (misal: "docx")
        const extClean = extWithDot.substring(1);
        // 3. Ambil nama file asli tanpa ekstensi (misal: "sponsorship - nunggu revisi")
        const baseName = path.basename(file.originalname, extWithDot);
        // 4. Ambil waktu saat ini
        const timeString = getFormattedTime();
        // 5. Rakit sesuai format Anda: docx_namafile_20260326-220119.docx
        // (Jika kebetulan file tidak punya ekstensi, kita tangani agar tidak ada tulisan "_namafile...")
        const newFileName = extClean 
            ? `${extClean}_${baseName}_${timeString}${extWithDot}`
            : `${baseName}_${timeString}`;

        cb(null, newFileName);
    }
});

const upload = multer({ storage });

let sharedText = "Belum ada teks.";
let sharedFiles = [];

app.get('/api/text', checkPin, (req, res) => res.json({ text: sharedText }));

app.post('/api/create-txt', checkPin, (req, res) => {
    const { text, filename } = req.body;
    
    // Terapkan logika penamaan yang sama untuk fitur pembuat file .txt
    const extWithDot = path.extname(filename) || '.txt';
    const extClean = extWithDot.substring(1);
    const baseName = path.basename(filename, extWithDot);
    const timeString = getFormattedTime();

    // Akan menghasilkan misal: txt_CatatanKampus_20260326-220119.txt
    const safeFilename = `${extClean}_${baseName}_${timeString}${extWithDot}`;
    const filepath = path.join(__dirname, 'uploads', safeFilename);

    fs.writeFile(filepath, text, (err) => {
        if (err) return res.status(500).json({ success: false });
        const newFile = { url: `/uploads/${safeFilename}`, name: safeFilename };
        sharedFiles.push(newFile);
        io.emit('filesShared', sharedFiles); 
        res.json({ success: true });
    });
});

app.post('/api/upload', checkPin, upload.array('files'), (req, res) => {
    // Tampilkan nama file yang sudah dirakit di layar HP/Laptop
    const uploadedFiles = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        name: file.filename // Menggunakan file.filename agar yang muncul di layar adalah nama baru, bukan nama lama
    }));
    sharedFiles = sharedFiles.concat(uploadedFiles);
    io.emit('filesShared', sharedFiles); 
    res.json({ success: true });
});

io.use((socket, next) => {
    const pin = socket.handshake.auth.pin;
    if (String(pin) === String(SECRET_PIN)) {
        next();
    } else {
        next(new Error("Akses ditolak oleh server"));
    }
});

io.on('connection', (socket) => {
    socket.emit('textUpdated', sharedText);
    if (sharedFiles.length > 0) socket.emit('filesShared', sharedFiles);

    socket.on('updateText', (newText) => {
        sharedText = newText;
        io.emit('textUpdated', sharedText);
    });

    socket.on('clearFiles', () => {
        sharedFiles = []; 
        io.emit('filesCleared'); 
    });
});

function getAllLocalIps() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (let devName in interfaces) {
        let iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                ips.push({ name: devName, ip: alias.address });
            }
        }
    }
    return ips;
}

const PORT = 3000;
const localIps = getAllLocalIps();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🔒 Server Local Drop (Protected) Berjalan!`);
    console.log(`💻 Akses di Laptop : http://localhost:${PORT}`);
    console.log(`\n📱 Akses di HP (Pilih salah satu IP di bawah ini):`);
    localIps.forEach(net => {
        console.log(`   - [${net.name}] : http://${net.ip}:${PORT}`);
    });
});