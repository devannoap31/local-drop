# ⚡ Local Drop

Local Drop is a lightweight, Node.js-based web application designed for transferring text, links, and files between devices (PC/Laptop and Mobile) in real-time over a local area network (WLAN/Mobile Hotspot).

This application was built as a faster, more lightweight, and private alternative to WhatsApp Web for personal file transfers. Since it operates entirely on a local network, transferring massive files (up to Gigabytes) will not consume any of your internet data quota.

## ✨ Key Features
* **🚀 Real-time Text Sync:** Type on your phone and watch it instantly appear on your laptop screen without the need to refresh the page (powered by Socket.IO).
* **📁 Multiple File Upload:** Send multiple images, videos, or documents simultaneously.
* **📊 Progress Bar Indicator:** Accurately monitor the upload percentage and progress of large files.
* **📝 Text-to-File Generator:** Instantly convert long notes or text into a physical `.txt` file ready to be downloaded.
* **🕒 Smart File Naming:** Automatically renames uploaded files using a neat `YYYYMMDD_HHMMSS` format to prevent overwriting and keep your storage organized.
* **🔒 PIN / Password Protected:** Secured with an authentication gateway to prevent unauthorized access or file drops from strangers on the same public Wi-Fi network.
* **🌙 Dark Mode:** Eye-friendly user interface with automatic theme state saving using `localStorage`.
* **⚡ Reactive UI:** Built with Alpine.js for a fast, lightweight, and modern reactive user interface without the overhead of heavy frameworks.
* **📡 Auto IP Detection:** Automatically detects and displays your local IP addresses in the terminal for easy mobile access.

## 🛠️ Tech Stack
* **Frontend:** `HTML5`, `CSS3`, `Alpine.js`
* **Backend:** `Node.js`, `Express.js`
* **Real-time Engine:** `Socket.IO`
* **File Handling:** `Multer`, `Node.js File System (fs)`

## 📥 Installation and Usage

1. Ensure you have **Node.js** installed on your machine.

2. Clone this repository:
   ```bash
   git clone https://github.com/devannoap31/local-drop.git
   ```

3. Navigate to the project directory:
   ```bash
   cd local-drop
   ```

4. Install all required dependencies:
   ```bash
   npm install
   ```

5. Open `server.js`, locate the `SECRET_PIN` variable, and change the default password to your own secure PIN/Password.

6. Start the server:
   ```bash
   node server.js
   ```

7. Open a web browser on your devices:
   * **On the Host Laptop:** Access http://localhost:3000
   * **On your Mobile Device:** Access the IP address displayed in your terminal (e.g., http://192.168.x.x:3000)

## 👨‍💻 Author
Created by **Devanno Andhika Putra**.