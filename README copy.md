# Tablafut

A full-featured sports league management platform built with React + Firebase.

## Tech Stack
- **React + Vite** — frontend
- **Firebase Auth** — email/password + Google sign-in
- **Firestore** — database
- **Firebase Storage** — logos & player photos
- **React Router v6** — routing

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Enable Firebase services
In your [Firebase Console](https://console.firebase.google.com/project/leagues-533e5):

- **Authentication** → Sign-in methods → Enable **Email/Password** and **Google**
- **Firestore Database** → Create database (start in test mode, then apply rules below)
- **Storage** → Get started

### 3. Apply Firestore Security Rules
In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`

### 4. Enable Google Auth Domain
In Firebase Console → Authentication → Settings → Authorized domains,
make sure `localhost` is listed (it is by default).

### 5. Run locally
```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Top nav, auth-aware
│   └── ProtectedRoute.jsx  # Redirects to login if not authed
├── context/
│   └── AuthContext.jsx     # Global auth state
├── firebase/
│   └── config.js           # Firebase initialization
├── pages/
│   ├── HomePage.jsx         # Public homepage + league search
│   ├── AdminLoginPage.jsx   # Login + signup + Google auth
│   ├── AdminDashboard.jsx   # Admin's league list
│   └── PlaceholderPages.jsx # Phase 2+ pages (coming soon)
├── styles/
│   └── global.css          # Design system + utility classes
├── App.jsx                  # Routes
└── main.jsx                 # Entry point
```

---

## 🗺️ Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Homepage with league search |
| `/leagues/:id` | Public | League public page (Phase 4) |
| `/admin/login` | Public | Admin login / signup |
| `/admin/dashboard` | Admin only | All leagues for this admin |
| `/admin/leagues/new` | Admin only | Create a league (Phase 2) |
| `/admin/leagues/:id` | Admin only | Manage a league (Phase 2) |

---

## 🏗️ Build Phases

- ✅ **Phase 1** — Foundation (auth, routing, homepage, dashboard shell)
- 🔜 **Phase 2** — Admin: create leagues, teams, players, stat templates
- 🔜 **Phase 3** — Admin: schedule + enter scores & player stats
- 🔜 **Phase 4** — Public league pages (standings, schedule, leaderboard, profiles)
- 🔜 **Phase 5** — Polish, branding, mobile, direct share links

---

## 🚢 Deploy

```bash
npm run build
# then deploy /dist to Firebase Hosting or Vercel
```
