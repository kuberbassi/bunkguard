<p align="center">
  <img src="frontend/public/acadhub-brand-v3.png" alt="AcadHub Logo" width="120" height="120" style="border-radius: 24px"/>
</p>

<h1 align="center">🎓 AcadHub</h1>

<p align="center">
  <strong>Your Smart Academic Companion</strong>
</p>

<p align="center">
  <a href="https://acadhub.kuberbassi.com">
    <img src="https://img.shields.io/badge/🌐_Live-acadhub.kuberbassi.com-6366f1?style=for-the-badge" alt="Live Demo"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask" alt="Flask"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/React_Native-Expo-000020?style=flat-square&logo=expo" alt="Expo"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/>
</p>

---

## ⚡ What is AcadHub?

> **Track attendance. Manage schedules. Stay organized. All in one place.**

AcadHub is a full-stack academic management platform built for college students to effortlessly track their attendance, manage timetables, monitor skills, and stay on top of their academic life.

---

## 🎯 Features at a Glance

<table>
<tr>
<td width="50%">

### 📊 Attendance Tracking
- Real-time percentage calculations
- **Bunk Calculator** - Know when you can skip
- Medical leave tracking
- Multi-semester isolation
- Beautiful calendar heatmaps

</td>
<td width="50%">

### 📅 Smart Timetable
- Customizable periods & breaks
- Quick attendance from schedule
- Today's classes highlighted
- Subject color coding

</td>
</tr>
<tr>
<td width="50%">

### 📈 Analytics Dashboard
- Weekly attendance trends
- Subject-wise breakdowns
- Streak tracking
- Performance insights

</td>
<td width="50%">

### 🎓 Results Management
- SGPA/CGPA calculator
- Grade tracking per subject
- Credit-weighted calculations
- Grading key reference

</td>
</tr>
<tr>
<td width="50%">

### 🎯 Skills Tracker
- Track skill development
- Progress visualization
- Multiple categories
- Level badges

</td>
<td width="50%">

### ⌨️ Keyboard Shortcuts
- `Ctrl+N` → Notifications
- `Ctrl+D` → Dashboard
- `Ctrl+T` → Timetable
- `Esc` → Close modals
- Arrow keys → Scroll modals

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AcadHub                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Frontend   │  │    Mobile    │  │       Backend        │   │
│  │   (React)    │  │  (RN/Expo)   │  │      (Flask)         │   │
│  │              │  │              │  │                      │   │
│  │ • TypeScript │  │ • JavaScript │  │ • Python 3.8+        │   │
│  │ • Tailwind   │  │ • Native UI  │  │ • MongoDB Atlas      │   │
│  │ • Framer     │  │ • MMKV Cache │  │ • Google OAuth       │   │
│  │ • PWA Ready  │  │ • 120fps     │  │ • Socket.IO          │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         └─────────────────┴──────────────────────┘               │
│                           │                                      │
│                    ┌──────┴──────┐                               │
│                    │  MongoDB    │                               │
│                    │   Atlas     │                               │
│                    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+  │  Python 3.8+  │  MongoDB URI  │  Google OAuth Credentials
```

### 🖥️ Web Development

```bash
# Clone & Setup
git clone https://github.com/kuberbassi/acadhub.git
cd acadhub

# Backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python run.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

**Access:** http://localhost:5173

### 📱 Mobile Development

```bash
cd mobile
npm install
npx expo start
```

### 🐳 Docker (Full Stack)

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| MongoDB | localhost:27017 |

---

## ⚙️ Configuration

### Environment Variables

<details>
<summary><strong>Backend (.env)</strong></summary>

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/acadhub
FLASK_SECRET_KEY=your-super-secret-key
FLASK_ENV=development
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

</details>

<details>
<summary><strong>Frontend (.env)</strong></summary>

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

</details>

---

## 📁 Project Structure

```
acadhub/
├── 🌐 frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   └── contexts/         # React contexts
│   └── public/               # Static assets
│
├── 📱 mobile/                # React Native + Expo
│   ├── src/
│   │   ├── screens/          # Navigation screens
│   │   ├── components/       # Native components
│   │   ├── services/         # API + caching
│   │   └── contexts/         # Theme, Auth contexts
│   └── android/              # Android build files
│
├── 🔧 api/                   # Flask + MongoDB
│   ├── routes/               # API route handlers
│   ├── middleware/           # Security, logging
│   └── utils/                # Helper functions
│
├── 📄 vercel.json            # Deployment config
├── 🐳 docker-compose.yml     # Container orchestration
└── 📖 README.md              # You are here!
```

---

## 🔑 API Endpoints

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/callback` | OAuth callback |
| POST | `/api/auth/logout` | End session |
| GET | `/api/current_user` | Get logged-in user |

</details>

<details>
<summary><strong>Subjects & Attendance</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subjects` | List all subjects |
| POST | `/api/subjects` | Create subject |
| PUT | `/api/subjects/:id` | Update subject |
| DELETE | `/api/subjects/:id` | Delete subject |
| POST | `/api/mark_attendance` | Mark attendance |
| GET | `/api/attendance_logs` | Get logs by date |

</details>

<details>
<summary><strong>Dashboard & Analytics</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard_data` | Dashboard overview |
| GET | `/api/reports_data` | Analytics data |
| GET | `/api/calendar_data` | Calendar heatmap |

</details>

---

## 🎨 Theming

AcadHub supports **12 accent colors** with automatic dark/light mode:

| Color | Hex |
|-------|-----|
| 🔵 Blue | `#0A84FF` |
| 💜 Purple | `#BF5AF2` |
| 🟢 Green | `#30D158` |
| 🟠 Orange | `#FF9F0A` |
| 🔴 Red | `#FF453A` |
| 🌸 Pink | `#FF375F` |
| 🟡 Yellow | `#FFD60A` |
| 🩵 Teal | `#64D2FF` |
| 🟤 Brown | `#AC8E68` |
| 🟣 Indigo | `#5E5CE6` |
| ⚪ Mint | `#66D4CF` |
| 🩶 Graphite | `#8E8E93` |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Open Notifications |
| `Ctrl + D` | Go to Dashboard |
| `Ctrl + T` | Open Timetable |
| `Ctrl + A` | Open Analytics |
| `Ctrl + Shift + C` | Open Calendar |
| `Ctrl + Shift + S` | Open Settings |
| `Escape` | Close any modal |
| `↑ / ↓` | Scroll in modals |
| `Page Up/Down` | Fast scroll |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Deploy automatically on push

**Live at:** [acadhub.kuberbassi.com](https://acadhub.kuberbassi.com)

### Mobile Release

```bash
# Build APK
cd mobile
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/
```

---

## 📊 Performance

| Metric | Score |
|--------|-------|
| Lighthouse | 95+ |
| Mobile FPS | 120fps (ProMotion) |
| API Response | <100ms |
| Bundle Size | ~250KB gzipped |

---

## 🛡️ Security

- ✅ Google OAuth 2.0 authentication
- ✅ JWT token validation
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ XSS protection headers
- ✅ Secure session management

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

<p align="center">
  <strong>Kuber Bassi</strong>
</p>

<p align="center">
  <a href="https://github.com/kuberbassi">
    <img src="https://img.shields.io/badge/GitHub-kuberbassi-181717?style=for-the-badge&logo=github" alt="GitHub"/>
  </a>
  <a href="https://kuberbassi.com">
    <img src="https://img.shields.io/badge/Website-kuberbassi.com-6366f1?style=for-the-badge&logo=safari" alt="Website"/>
  </a>
  <a href="mailto:kuberbassi2007@gmail.com">
    <img src="https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail" alt="Email"/>
  </a>
</p>

---

<p align="center">
  <sub>Built with ❤️ and ☕ using Agentic AI</sub>
</p>

<p align="center">
  <sub>© 2024-2026 AcadHub. All rights reserved.</sub>
</p>
