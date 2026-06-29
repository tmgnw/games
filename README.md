# Game Center 🎮

Koleksi 16 game web yang dibangun dengan HTML/CSS/JavaScript murni.
Tidak butuh build step — langsung deploy ke web server statis.

## 📁 Struktur Folder

```
.
├── index.html          # Dashboard utama (entry point)
├── README.md           # File ini
├── assets/
│   └── gamehub.js      # Modul lintas-game: profil, koin, achievement, daily challenge
└── games/
    ├── game-1.html     # Teka-teki Kotak Warna
    ├── game-2.html     # Tic-Tac-Toe
    ├── game-3.html     # Snake Classic
    ├── game-4.html     # Tetris
    ├── game-5.html     # 2048
    ├── game-6.html     # Ular Tangga
    ├── game-7.html     # Catur
    ├── game-8.html     # Monopoli
    ├── game-9.html     # Space Invaders
    ├── game-10.html    # Dice Defense
    ├── game-11.html    # Minesweeper
    ├── game-12.html    # Sokoban
    ├── game-13.html    # Match-3 Mania
    ├── game-14.html    # Brick Breaker
    ├── game-15.html    # Memory Card
    └── game-16.html    # Ludo
```

## 🚀 Cara Deploy

### Deploy ke web server statis (paling mudah)

Folder ini bisa langsung di-upload ke layanan hosting statis manapun:

- **Netlify / Vercel / Cloudflare Pages**: drag-and-drop folder atau push ke git
- **GitHub Pages**: push ke branch `gh-pages` atau ke root
- **Server Apache/Nginx**: copy folder ke `htdocs/` (XAMPP) atau `/var/www/html`
- **Firebase Hosting**: `firebase deploy` setelah init

**Entry point:** `index.html` di root folder.

### XAMPP Lokal

```
/Applications/XAMPP/xamppfiles/htdocs/cihuy/
```

Akses: `http://localhost/cihuy/`

## 🛠 Teknologi

- **Vanilla HTML + CSS + JavaScript** — tidak ada framework
- **Tidak butuh build tool** — langsung jalan
- **`localStorage`** untuk save state per game
- **`gamehub.js`** untuk state lintas-game (profil, koin, achievement, daily)
- **Web Audio API** untuk sound effects
- **Canvas / SVG / DOM** sesuai kebutuhan game

## 📦 Tidak Ada Dependency Eksternal

Hanya satu CDN font (`Poppins` dari Google Fonts) — bisa di-host lokal jika perlu offline.

## 🎯 Fitur Lintas-Game (`assets/gamehub.js`)

- **Profil pemain**: nama + avatar emoji
- **Koin universal**: satu wallet untuk semua game
- **33 Achievement** lintas-game
- **Daily Challenge** seeded by date (rotasi otomatis)
- **Toast notifications** untuk unlock & klaim

## 📐 Mobile-Friendly

Semua game responsive — touch + keyboard input.

## 🏗 Ukuran Aset

Total folder: ~870KB (semua HTML + 1 JS).
