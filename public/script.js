document.addEventListener('alpine:init', () => {
    Alpine.data('localDropApp', () => ({
        // --- 1. STATE (Variabel Penyimpan Data) ---
        isLoggedIn: false,
        loginError: false,
        pin: sessionStorage.getItem('localDropPin') || '',
        theme: localStorage.getItem('localDropTheme') || 'light',
        socket: null,
        
        sharedText: '',
        txtFilename: '',
        txtContent: '',
        sharedFiles: [],
        
        isUploading: false,
        progressPercent: 0,
        progressText: '0%',
        isCreatingTxt: false,
        
        // Label Tombol Dinamis
        btnKirimText: 'Kirim Teks',
        btnCopyText: 'Copy Teks',
        btnMuatText: 'Muat Ulang',
        btnBuatTxt: 'Buat & Bagikan .txt',
        btnUploadText: 'Upload File',

        // --- 2. FUNGSI INISIALISASI ---
        init() {
            // Terapkan tema saat web dimuat
            if (this.theme === 'dark') document.body.classList.add('dark-mode');
            // Coba login otomatis jika ada PIN di memori
            if (this.pin) this.verifyPin();
        },

        // --- 3. FUNGSI-FUNGSI UTAMA ---
        toggleTheme() {
            const isDark = document.body.classList.toggle('dark-mode');
            this.theme = isDark ? 'dark' : 'light';
            localStorage.setItem('localDropTheme', this.theme);
        },

        async verifyPin() {
            if (!this.pin) return;
            try {
                const res = await fetch('/api/verify-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: this.pin })
                });

                if (res.ok) {
                    sessionStorage.setItem('localDropPin', this.pin);
                    this.isLoggedIn = true;
                    this.loginError = false;
                    this.initSocket();
                } else {
                    this.loginError = true;
                    sessionStorage.removeItem('localDropPin');
                }
            } catch (err) {
                alert("Gagal terhubung ke server.");
            }
        },

        logout() {
            sessionStorage.removeItem('localDropPin');
            location.reload();
        },

        initSocket() {
            this.socket = io({ auth: { pin: this.pin } });

            this.socket.on('connect_error', (err) => {
                alert(err.message);
                this.logout();
            });

            // Saat Socket menerima data, Alpine otomatis mengupdate HTML!
            this.socket.on('textUpdated', (newText) => {
                this.sharedText = newText;
            });

            this.socket.on('filesShared', (filesArray) => {
                this.sharedFiles = filesArray || [];
            });

            this.socket.on('filesCleared', () => {
                this.sharedFiles = [];
            });
        },

        updateText() {
            if (this.socket) this.socket.emit('updateText', this.sharedText);
            this.btnKirimText = "Terkirim! ✓";
            setTimeout(() => this.btnKirimText = "Kirim Teks", 1500);
        },

        async fetchText() {
            try {
                const res = await fetch('/api/text', { headers: { 'x-pin': this.pin } });
                if (!res.ok) throw new Error("Akses ditolak");
                const data = await res.json();
                this.sharedText = data.text;
                
                this.btnMuatText = "Dimuat! ✓";
                setTimeout(() => this.btnMuatText = "Muat Ulang", 1500);
            } catch (error) {
                alert(error.message);
                this.logout();
            }
        },

        copyText() {
            navigator.clipboard.writeText(this.sharedText).then(() => {
                this.btnCopyText = "Berhasil Dicopy! ✓";
                setTimeout(() => this.btnCopyText = "Copy Teks", 1500);
            });
        },

        async createTextFile() {
            if (!this.txtContent) return alert('Isi file tidak boleh kosong!');
            
            let filename = this.txtFilename.trim();
            if (!filename) filename = 'Catatan-' + Math.floor(Date.now() / 1000) + '.txt';
            else if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';

            this.isCreatingTxt = true;
            this.btnBuatTxt = "Membuat...";

            try {
                const res = await fetch('/api/create-txt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-pin': this.pin },
                    body: JSON.stringify({ text: this.txtContent, filename })
                });
                
                if (!res.ok) throw new Error("Akses ditolak");

                this.txtContent = '';
                this.txtFilename = '';
                this.btnBuatTxt = "Berhasil Dibuat! ✓";
            } catch (error) {
                alert(error.message);
                this.btnBuatTxt = "Gagal Dibuat";
            } finally {
                setTimeout(() => { 
                    this.btnBuatTxt = "Buat & Bagikan .txt"; 
                    this.isCreatingTxt = false; 
                }, 1500);
            }
        },

        formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        },

        uploadFile() {
            // Mengambil file menggunakan x-ref dari Alpine
            const files = this.$refs.fileInput.files;
            if (files.length === 0) return alert('Pilih file dulu!');

            let totalSize = 0;
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]); 
                totalSize += files[i].size;
            }

            this.isUploading = true;
            this.btnUploadText = "Mengirim...";
            this.progressPercent = 0;
            this.progressText = `0% (0 MB / ${this.formatBytes(totalSize)})`;

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload', true);
            xhr.setRequestHeader('x-pin', this.pin);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    this.progressPercent = Math.round((event.loaded / event.total) * 100);
                    this.progressText = `${this.progressPercent}% (${this.formatBytes(event.loaded)} / ${this.formatBytes(event.total)})`;
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    this.$refs.fileInput.value = ''; 
                    this.progressText = "Selesai!";
                    setTimeout(() => {
                        this.isUploading = false;
                        this.btnUploadText = "Upload File";
                    }, 2000);
                } else {
                    alert("Akses ditolak atau terjadi kesalahan.");
                    this.isUploading = false;
                    this.btnUploadText = "Upload File";
                }
            };

            xhr.send(formData);
        },

        clearFiles() {
            if (this.socket) this.socket.emit('clearFiles');
        }
    }));
});