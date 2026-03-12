# ⚡ Local Drop

Local Drop adalah aplikasi web ringan berbasis Node.js untuk mentransfer teks, tautan, dan file antar perangkat (Laptop dan HP) secara *real-time* melalui jaringan lokal (WLAN/Hotspot). 

Aplikasi ini dibuat sebagai alternatif yang jauh lebih ringan, cepat, dan privat dibandingkan menggunakan WhatsApp Web untuk transfer file pribadi. Karena berjalan di jaringan lokal, transfer file berukuran besar (Gigabyte) tidak akan menyedot kuota internet sama sekali.

## ✨ Fitur Utama
* **🚀 Real-time Text Sync:** Ketik di HP, langsung muncul di layar laptop tanpa perlu di-*refresh* (didukung oleh Socket.IO).
* **📁 Multiple File Upload:** Kirim banyak gambar, video, atau dokumen sekaligus.
* **📊 Progress Bar Indikator:** Pantau persentase dan kecepatan *upload* file berukuran besar secara akurat.
* **📝 Text-to-File Generator:** Ubah catatan panjang menjadi file `.txt` fisik secara instan.
* **🔒 Password / PIN Protected:** Dilengkapi gerbang keamanan sehingga orang asing di jaringan Wi-Fi yang sama (misal: Wi-Fi kampus) tidak bisa mengintip atau mengirim file sembarangan.
* **🌙 Dark Mode:** Tampilan antarmuka yang nyaman di mata dengan penyimpanan tema otomatis.
* **📡 Auto IP Detection:** Menampilkan alamat IP jaringan secara otomatis di terminal.

## 🛠️ Teknologi yang Digunakan
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Real-time Engine:** Socket.IO
* **File Handling:** Multer, File System (fs)

## 📥 Cara Instalasi dan Penggunaan

1. Pastikan Node.js sudah terinstal di komputer Anda.
2. Clone repositori ini:
   git clone https://github.com/USERNAME_GITHUB_ANDA/local-drop.git

3. Masuk ke direktori proyek:
   cd local-drop

4. Instal semua dependensi yang dibutuhkan:
   npm install

5. Buka file server.js, cari variabel SECRET_PIN, dan ubah password default-nya sesuai keinginan Anda.

6. Jalankan server:
   node server.js

7. Buka browser di perangkat Anda:
   * Di Laptop/Server: Akses http://localhost:3000
   * Di HP (Satu jaringan Wi-Fi/Hotspot): Akses URL IP yang muncul di terminal.

## 👨‍💻 Pembuat
Dibuat oleh **Devanno Andhika Putra**.