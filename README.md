# 🗳️ Secure Electronic Voting System (Module 1: Admin & Election Management)

A modern, responsive, and secure electronic voting management system built with **React (Vite)**, **Tailwind CSS**, **Node.js (Express)**, **SQLite**, **JWT**, and **bcryptjs**.

Designed with a modular architecture to seamlessly accommodate future modules (Voter Registration, Video Verification, Voting, and Results) with zero database schema alterations.

---

## 🚀 Prerequisites (What to Install)

To run this project on any computer (e.g. your friend's PC), you need:

1. **Node.js** (v18 or higher recommended, including v20, v22, v24)
   - Download from: [nodejs.org](https://nodejs.org/)
   - Verify installation:
     ```bash
     node -v
     npm -v
     ```
2. **Git** (for cloning the repository)
   - Download from: [git-scm.com](https://git-scm.com/)

*(No separate database server like MySQL or PostgreSQL is required — SQLite is file-based and runs out of the box).*

---

## 📦 Setup & Installation Instructions

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd secure-voting-system
```

### 2. Install Dependencies
Install dependencies for both the backend server and frontend client:

```bash
# Install Server Dependencies
cd server
npm install

# Seed the Database (Creates initial tables & sample elections/candidates)
npm run seed

# Install Client Dependencies
cd ../client
npm install
```

---

## 🏃 Running the Application

Open **two separate terminals**:

### Terminal 1: Backend Server
```bash
cd server
npm start
```
> Server runs at: `http://localhost:5000`

### Terminal 2: Frontend Client
```bash
cd client
npm run dev
```
> Client runs at: `http://localhost:5173`

---

## 🔐 Default Admin Credentials

- **Username:** `admin` *(or `vaseem`)*
- **Password:** `admin123`

---

## 📁 Project Structure

```
secure-voting-system/
├── client/                     # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI (Buttons, Inputs, Modals, Cards, Badges)
│   │   │   ├── layout/         # Sidebar, Header, AppLayout
│   │   │   └── ui/             # Core UI components
│   │   ├── context/            # AuthContext (JWT auth state)
│   │   ├── pages/
│   │   │   ├── admin/          # Dashboard, Elections, Candidates management
│   │   │   └── auth/           # Login Page
│   │   ├── services/           # Axios API service layer
│   │   ├── App.jsx             # Router & Protected Routes
│   │   └── main.jsx
│   └── package.json
│
├── server/                     # Node.js + Express + SQLite Backend
│   ├── config/
│   │   └── db.js               # SQLite connection & 6-table schema
│   ├── controllers/            # Auth, Elections, Candidates, Dashboard controllers
│   ├── middleware/             # Auth JWT verification, Multer upload, Error handler
│   ├── routes/                 # Express API routes
│   ├── uploads/                # Candidate profile photos storage
│   ├── seed.js                 # Seed script for initial setup
│   └── server.js               # Entry point
│
└── package.json                # Root package.json
```
