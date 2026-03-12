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

// --- KONFIGURASI KEAMANAN ---
const SECRET_PIN = "devanno318"; // Ganti angka ini dengan PIN rahasia Anda

app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads'));

// Middleware: Penjaga Pintu Gerbang API
const checkPin = (req, res, next) => {
    const pin = req.headers['x-pin'];
    if (pin === SECRET_PIN) {
        next(); // PIN benar, silakan masuk
    } else {
        res.status(401).json({ success: false, message: 'Akses Ditolak: PIN Salah' });
    }
};

// Endpoint khusus untuk mengecek PIN saat pertama kali login
app.post('/api/verify-pin', (req, res) => {
    if (req.body.pin === SECRET_PIN) res.json({ success: true });
    else res.status(401).json({ success: false });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

let sharedText = "Belum ada teks.";
let sharedFiles = [];

// Semua rute API sekarang dipasangi checkPin
app.get('/api/text', checkPin, (req, res) => res.json({ text: sharedText }));

app.post('/api/create-txt', checkPin, (req, res) => {
    const { text, filename } = req.body;
    const safeFilename = Date.now() + '-' + filename;
    const filepath = path.join(__dirname, 'uploads', safeFilename);

    fs.writeFile(filepath, text, (err) => {
        if (err) return res.status(500).json({ success: false });
        const newFile = { url: `/uploads/${safeFilename}`, name: filename };
        sharedFiles.push(newFile);
        io.emit('filesShared', sharedFiles); 
        res.json({ success: true });
    });
});

app.post('/api/upload', checkPin, upload.array('files'), (req, res) => {
    const uploadedFiles = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        name: file.originalname
    }));
    sharedFiles = sharedFiles.concat(uploadedFiles);
    io.emit('filesShared', sharedFiles); 
    res.json({ success: true });
});

// Penjaga Pintu Gerbang untuk koneksi Socket.IO (Real-time)
io.use((socket, next) => {
    const pin = socket.handshake.auth.pin;
    if (pin === SECRET_PIN) {
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