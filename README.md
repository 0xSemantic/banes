# 🏦 Credex Bank — Full Banking Demo Application

A production-grade, fully-featured banking web application built for school demonstrations. Powered by **FastAPI** + **React 19** + **SQLite**, with real-time WebSockets, PWA support, and a complete admin control panel.

---

## ✨ Features

### 👤 User Features
| Feature | Description |
|---------|-------------|
| **Authentication** | Register, login, JWT sessions, change password |
| **Accounts** | Multiple accounts (checking, savings, fixed), account management |
| **Deposits** | Request deposits → admin approves and credits |
| **Withdrawals** | Request withdrawals → admin processes |
| **Transfers** | Interbank transfer requests → admin executes |
| **Savings** | Activate savings plans with daily compound interest, auto tier upgrade |
| **Loans** | Apply for loans, track repayments, EMI calculation |
| **Cards** | Request virtual cards, link external cards, freeze/unfreeze |
| **Notifications** | Real-time push alerts for all account activity |
| **Currency** | Live exchange rates (USD/GBP/EUR + more), converter |
| **KYC** | Identity verification submission flow |
| **PWA** | Installable app, offline support, splash screen |

### 🛡️ Admin Features
| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats overview, analytics charts, pending request banner |
| **Requests** | One-stop hub: approve/reject all user requests with notes |
| **Users** | List, search, view detail, activate/deactivate, add funds directly |
| **Transactions** | Full ledger view of every transaction |
| **Savings Tiers** | Create/edit interest rate tiers with live preview |
| **Settings** | Configuration reference + customization guide |
| **Real-time** | WebSocket-powered live request notifications |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

### 1. Clone / Extract
```bash
cd credex
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate       # Mac/Linux
# OR: venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend (auto-creates DB and admin user)
python run.py
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

### 3. Frontend Setup (separate terminal)
```bash
cd frontend

# Install dependencies
npm install

# Development server (proxies API to :8000)
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 4. Build for Production (serve everything from FastAPI)
```bash
cd frontend
npm run build     # Outputs to frontend/dist/
cd ..
python run.py     # FastAPI now serves the built React app
```

Single URL: **http://localhost:8000** serves everything.

---

## 🔐 Default Credentials

| Role  | Email | Password |
|-------|-------|----------|
| **Admin** | `admin@credexbank.com` | `Admin@Credex2024` |
| **User** | Register a new account | — |

> ⚠️ Change these before any public deployment!

---

## ⚙️ Configuration & Customization

### Easy Rebrand (`.env` file)
Create a `.env` file in the `credex/` root directory:

```env
# Bank Identity
APP_NAME="My Bank"
APP_TAGLINE="Your trusted financial partner"

# Admin Credentials
ADMIN_EMAIL="admin@mybank.com"
ADMIN_PASSWORD="MySecurePass123"

# Theme Colors (CSS hex values)
PRIMARY_COLOR="#e11d48"
ACCENT_COLOR="#f97316"
PWA_THEME_COLOR="#1a0a28"

# Loan Settings
MIN_LOAN_AMOUNT=500
MAX_LOAN_AMOUNT=50000
LOAN_INTEREST_RATE=3.5

# Default Currency
DEFAULT_CURRENCY=GBP

# Session
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Replace Logo
Put your logo PNG at: `frontend/public/logo.png`
- Recommended size: **200×200px** (square)
- Also replace `logo-192.png` and `logo-512.png` for PWA icons

### Add More Currencies
In `backend/config.py`, add to `SUPPORTED_CURRENCIES`:
```python
{"code": "NGN", "name": "Nigerian Naira", "symbol": "₦", "flag": "🇳🇬"},
{"code": "JPY", "name": "Japanese Yen",   "symbol": "¥", "flag": "🇯🇵"},
```

### Adjust Savings Tiers
Either:
1. **Via Admin Panel**: Login as admin → Savings Tiers → Edit
2. **Via config.py**: Edit `DEFAULT_SAVINGS_TIERS` list

---

## 🏗️ Project Structure

```
credex/
├── backend/                    # FastAPI application
│   ├── main.py                # App entry, WebSocket endpoint, lifespan
│   ├── config.py              # ⚡ ALL configuration here - easy to change
│   ├── database.py            # SQLite async connection
│   ├── schemas.py             # Pydantic request/response models
│   ├── utils.py               # Helper functions
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── account.py
│   │   ├── transaction.py
│   │   ├── savings.py
│   │   ├── loan.py
│   │   ├── notification.py
│   │   ├── card.py
│   │   └── settings_model.py
│   ├── routers/               # API route handlers
│   │   ├── auth.py           # Register, login, /me
│   │   ├── users.py          # Profile, KYC
│   │   ├── accounts.py       # Account CRUD
│   │   ├── transactions.py   # Deposits, withdrawals, transfers
│   │   ├── savings.py        # Savings plans
│   │   ├── loans.py          # Loan applications, repayments
│   │   ├── cards.py          # Virtual/external cards
│   │   ├── notifications.py  # User notifications
│   │   ├── admin.py          # ⭐ Full admin control
│   │   └── currency.py       # Exchange rates (free API)
│   └── services/
│       ├── auth_service.py   # JWT, password hashing
│       ├── websocket_manager.py  # Real-time WS (no Redis needed)
│       └── interest_scheduler.py # Auto daily interest engine
│
├── frontend/                  # React 19 application
│   ├── src/
│   │   ├── App.jsx           # Router, auth guards, app init
│   │   ├── main.jsx          # React entry point
│   │   ├── index.css         # Global styles + CSS variables
│   │   ├── store/index.js    # Zustand state management
│   │   ├── utils/
│   │   │   ├── api.js        # Axios client + interceptors
│   │   │   └── helpers.js    # Formatting, constants
│   │   ├── components/
│   │   │   ├── layout/       # DashboardLayout, AdminLayout
│   │   │   └── ui/           # Shared UI components
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── AccountsPage.jsx
│   │       ├── TransactionsPage.jsx
│   │       ├── TransferPage.jsx
│   │       ├── SavingsPage.jsx
│   │       ├── LoansPage.jsx
│   │       ├── CardsPage.jsx
│   │       ├── NotificationsPage.jsx
│   │       ├── ProfilePage.jsx
│   │       ├── CurrencyPage.jsx
│   │       └── admin/
│   │           ├── AdminDashboard.jsx
│   │           ├── AdminRequests.jsx   # ⭐ Core admin workflow
│   │           ├── AdminUsers.jsx
│   │           ├── AdminUserDetail.jsx
│   │           ├── AdminTransactions.jsx
│   │           ├── AdminSavingsTiers.jsx
│   │           └── AdminSettings.jsx
│   ├── public/
│   │   ├── logo.png          # ← Replace with your logo
│   │   ├── logo-192.png      # PWA icon
│   │   └── logo-512.png      # PWA icon
│   ├── package.json
│   ├── vite.config.js        # Vite + PWA configuration
│   └── tailwind.config.js    # Theme colors + animations
│
├── requirements.txt           # Python dependencies
├── run.py                     # Start the server
└── README.md                  # This file
```

---

## 🔄 Admin Workflow

Every user banking action becomes a **notification** in the admin panel:

```
User Action → Notification Created → Admin Sees Alert → Admin Approves/Rejects → User Gets Notified
```

| User Action | Admin Action Needed |
|-------------|---------------------|
| Deposit Request | Approve amount → funds credited |
| Withdrawal Request | Approve → balance debited |
| Transfer Request | Approve → transaction executed |
| Loan Application | Approve (set amount) → disbursed to account |
| Loan Repayment | Approve → balance updated |
| Card Request | Approve → card activated |
| KYC Submission | Approve → user verified |

---

## 📡 API Reference

Full interactive docs at: `http://localhost:8000/docs`

Key endpoints:
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/accounts/
POST   /api/transactions/deposit-request
POST   /api/transactions/withdrawal-request
POST   /api/transactions/transfer-request

GET    /api/savings/tiers
POST   /api/savings/activate

POST   /api/loans/apply
POST   /api/loans/repay

POST   /api/cards/request-virtual
POST   /api/cards/link-external

GET    /api/currency/rates?base=USD
GET    /api/currency/convert?amount=100&from_currency=USD&to_currency=GBP

GET    /api/admin/stats
GET    /api/admin/notifications
POST   /api/admin/notifications/respond
GET    /api/admin/users
POST   /api/admin/accounts/add-funds

WS     /ws/{client_id}
```

---

## 🎓 Demo Presentation Flow

1. **Register** a new user account
2. **Admin approves KYC** → user gets verified badge
3. **Admin adds funds** to the account directly
4. **User requests deposit** → admin approves in real-time
5. **User activates savings** → show daily interest accumulation
6. **User applies for loan** → admin approves → funds disbursed
7. **User requests virtual card** → admin activates
8. **Show currency converter** with live exchange rates
9. **Admin dashboard** → charts, stats, full control

---

## 🛠️ Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI | Fast, async, auto docs |
| Database | SQLite + aiosqlite | Zero config, portable |
| ORM | SQLAlchemy 2.0 | Async, type-safe |
| Auth | JWT (python-jose) + bcrypt | Industry standard |
| Real-time | WebSockets (built-in) | No Redis needed |
| Frontend | React 19 + Vite | Modern, fast HMR |
| Styling | Tailwind CSS 3 | Utility-first, consistent |
| State | Zustand | Lightweight, simple |
| Charts | Recharts | React-native charting |
| PWA | vite-plugin-pwa + Workbox | Offline support |
| HTTP | Axios | Interceptors, error handling |
| Icons | Lucide React | Consistent, tree-shakeable |

---

## 📱 PWA Installation

The app is installable as a PWA on mobile and desktop:
1. Visit `http://localhost:8000` on Chrome/Safari
2. Browser shows "Add to Home Screen" prompt
3. App installs with Credex Bank icon
4. Runs in standalone mode (no browser bar)
5. Basic offline support for cached pages

---

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Make sure you're in the credex/ directory
# Make sure venv is activated
pip install -r requirements.txt --upgrade
python run.py
```

**Frontend build fails:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**CORS errors in dev:**
The Vite dev server proxies `/api` and `/ws` to `localhost:8000`.
Make sure backend is running on port 8000.

**Database reset:**
```bash
rm credex.db  # Delete database
python run.py  # Re-creates with fresh admin
```

---

## 📄 License

Built for educational/demonstration purposes.
© 2024 Credex Bank Demo — School Project
