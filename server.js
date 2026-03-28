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
    return `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
}

// --- FUNGSI PERAKIT NAMA FILE (ANTI-KEDOBELAN) ---
function generateSafeFileName(originalName) {
    const extWithDot = path.extname(originalName);
    const extClean = extWithDot.substring(1);
    let baseName = path.basename(originalName, extWithDot);

    // 1. Bersihkan Prefix: Hapus tulisan "docx_" di depan jika sudah ada
    if (extClean && baseName.startsWith(`${extClean}_`)) {
        baseName = baseName.substring(extClean.length + 1);
    }

    // 2. Bersihkan Suffix: Hapus timestamp lama di belakang jika ada
    // Pola Regex: Cari garis bawah (_), diikuti 8 angka, strip (-), lalu 6 angka tepat sebelum string berakhir ($)
    const oldTimestampPattern = /_\d{8}-\d{6}$/;
    baseName = baseName.replace(oldTimestampPattern, '');

    // 3. Rakit ulang dengan waktu yang baru
    const timeString = getFormattedTime();
    return extClean 
        ? `${extClean}_${baseName}_${timeString}${extWithDot}`
        : `${baseName}_${timeString}`;
}
// ------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        // Panggil fungsi pintar kita
        cb(null, generateSafeFileName(file.originalname));
    }
});
const upload = multer({ storage });

let sharedText = "Belum ada teks.";
let sharedFiles = [];

app.get('/api/text', checkPin, (req, res) => res.json({ text: sharedText }));

app.post('/api/create-txt', checkPin, (req, res) => {
    const { text, filename } = req.body;
    
    // Panggil fungsi pintar kita juga untuk pembuatan file .txt
    const safeFilename = generateSafeFileName(filename);
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
    const uploadedFiles = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        name: file.filename
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