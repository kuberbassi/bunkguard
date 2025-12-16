# BunkGuard - React Frontend

Modern attendance tracking application with React + TypeScript + Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Python 3.x with Flask backend running

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
The `.env` file is already configured for local development:
```
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```
Frontend will run on **http://localhost:5173**

### 4. Start Backend (in separate terminal)
```bash
# From project root
python run.py
```
Backend will run on **http://localhost:5000**

## 📦 Available Scripts

- `npm run dev` - Start development server with Hot Module Replacement
- `npm run build` - Build for production (output to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## 🎨 Features

- ✨ **Premium UI** - Glassmorphism, dark mode, smooth animations
- 🔐 **Google OAuth** - Secure authentication
- 📊 **Dashboard** - Real-time attendance overview
- 🎯 **Bunk Guard** - Smart attendance calculations
- 📱 **Responsive** - Works on all devices
- 🌙 **Dark Mode** - Beautiful dark theme by default

## 🏗️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS with custom design system
- **Routing**: React Router v6
- **HTTP**: Axios with interceptors
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts (ready to use)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/ui/      # Reusable UI components
│   ├── contexts/           # React context providers
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main app with routing
│   └── main.tsx            # Entry point
├── tailwind.config.js      # Design system
└── vite.config.ts          # Build configuration
```

## 🔧 Configuration

### Path Aliases
The project uses `@/` as an alias for `src/`:
```typescript
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
```

### API Proxy
Vite dev server proxies `/api/*` requests to Flask backend automatically.

## 🎯 What's Implemented

✅ **Core Infrastructure**
- Vite + React + TypeScript setup
- Tailwind CSS with premium design tokens
- Path aliases and build optimization

✅ **Authentication**
- Google OAuth flow
- Protected routes
- Auth context provider

✅ **UI Components**
- Button (multiple variants)
- Card (glassmorphism effects)
- Modal (with animations)
- Input (with validation)
- Loading Spinner
- Toast Notifications

✅ **Pages**
- Login page (animated, glassmorphism)
- Dashboard (KPI cards, subject overview)

✅ **API Integration**
- Complete service layer (35+ endpoints)
- Axios interceptors for auth headers
- Error handling

## 🔜 Next Steps

The following pages are planned for development:

- **Mark Attendance** - Calendar interface for marking attendance
- **Reports** - Analytics dashboards with charts
- **Schedule** - Timetable editor
- **Settings** - Subject management, preferences, data import/export

## 🐛 Troubleshooting

### Common Issues & Fixes

**1. Backend "ModuleNotFoundError"**
If you see missing modules (`flask_cors`, `authlib`):
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

**2. Frontend "PostCSS" or "Tailwind" Errors**
If you see `[postcss] ...` errors:
- Ensure you are using **Tailwind CSS v3** (v4 is currently beta and requires different config)
- We explicitly installed `tailwindcss@3.4.17` to match our configuration.
- Check `src/index.css` for invalid `@apply` rules (e.g., `border-border` which was fixed).

**3. "Fatal error in launcher" (Python)**
This happens if the virtual environment is moved or corrupted.
**Fix**: Delete the `venv` folder and recreate it:
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 📝 Development Notes

- TypeScript strict mode enabled
- All imports use type-only syntax where appropriate
- Dark mode implemented via Tailwind's class strategy
- Session-based auth (compatible with existing Flask backend)

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

---

**Built with ❤️ using modern web technologies**
