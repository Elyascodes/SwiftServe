# SwiftServe — Restaurant Management System

SwiftServe is a full-stack desktop application for managing restaurant operations including table assignments, order processing, kitchen queue, employee management, timesheets, analytics, and refunds.

---

## Running the App (End Users)

1. **Install Java 21 or newer** if not already installed.
   Download from: https://adoptium.net/temurin/releases/
2. **Extract `SwiftServe-win32-x64.zip`** to any folder (e.g. your Desktop).
3. **Double-click `win-unpacked\SwiftServe.exe`** to launch.
4. The app will open a loading screen, start the backend automatically, then display the login page.

> **Note:** The first launch takes 10–20 seconds while the database is created and seeded with demo data. Subsequent launches are faster.
> The database is stored in `%AppData%\SwiftServe\` and persists across sessions.

---

## Building from Source

### Requirements

| Tool | Version | Download |
|------|---------|----------|
| Java JDK | 21 or newer | https://adoptium.net/temurin/releases/ |
| Node.js | 18 or newer | https://nodejs.org |

### Windows

```
build.bat
```

### Mac / Linux

```bash
chmod +x build.sh
./build.sh
```

The installer is written to `frontend/dist/` when the build completes.

---

## Running in Development (without installer)

**Terminal 1 — Backend:**
```bash
cd backend
./mvnw spring-boot:run        # Mac/Linux
mvnw.cmd spring-boot:run      # Windows
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## Login Credentials

All accounts use the default password: **`Shift1`**

### Manager

| Employee ID | Name | Role |
|-------------|------|------|
| MGR001 | Jordan Mitchell | Manager |

### Waiters

| Employee ID | Name | Assigned Tables |
|-------------|------|-----------------|
| WTR001 | Alex Rivera | A1 – A6 |
| WTR002 | Brianna Cole | B1 – B6 |
| WTR003 | Carlos Mendez | C1 – C6 |
| WTR004 | Dana Owens | D1 – D6 |
| WTR005 | Evan Brooks | E1 – F6 |

### Kitchen Staff (Chefs)

| Employee ID | Name | Role |
|-------------|------|------|
| CHF001 | Hannah Lee | Chef |
| CHF002 | Isaac Grant | Chef |
| CHF003 | Jasmine White | Chef |
| CHF004 | Kevin Brown | Chef |
| CHF005 | Laura Sanchez | Chef |

### Bus Boys

| Employee ID | Name | Role |
|-------------|------|------|
| BSB001 | Faith Harris | Bus Boy |
| BSB002 | Gabriel Torres | Bus Boy |

---

## Role Capabilities

| Role | What they can do |
|------|-----------------|
| **Manager** | Full dashboard: floor map, all orders, employee management, menu/inventory, analytics charts, refund approvals, timesheets |
| **Waiter** | View their assigned tables, create and submit orders (by seat), request refunds, clock in/out |
| **Chef** | Kitchen queue — mark orders ready, toggle item availability |
| **Bus Boy** | Floor map showing dirty tables — select a table to mark it clean |

---

## Special Remarks

- **Demo data is seeded automatically** on first launch: 7 days of earnings, completed orders, menu items with stock levels, timesheet entries, and sample refund requests — so the analytics and reports pages show real data immediately.
- **Database location:** The SQLite database is stored in the OS user-data folder (`AppData\Roaming\SwiftServe\` on Windows). It persists across reinstalls and is never overwritten by an update.
- **Stock deduction** happens automatically when a Chef marks an order as *Ready*.
- **Refund rejections** require the manager to enter a written reason before the rejection is saved.
- **Table assignments** are pre-set by section (one row per waiter). A manager can reassign tables at any time from the Employees tab.

---

## Project Structure

```
SwiftServe/
├── backend/                    # Spring Boot REST API
│   ├── src/main/java/com/elyas/test/
│   │   ├── config/             # DataInitializer (seeds demo data)
│   │   ├── controller/         # REST endpoints
│   │   ├── model/              # JPA entities
│   │   └── repository/         # Spring Data repositories
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
├── frontend/                   # Electron desktop app
│   ├── main.js                 # App entry — starts backend, manages lifecycle
│   ├── splash.html             # Loading screen shown during backend startup
│   ├── index.html              # Login page
│   ├── app.html                # Main app shell (loaded after login)
│   ├── components/
│   │   ├── api.js              # Centralised API client
│   │   └── floormap.js         # Reusable 6×6 table grid component
│   ├── pages/
│   │   ├── waiter.js           # Waiter dashboard
│   │   ├── cook.js             # Chef / kitchen queue
│   │   ├── busboy.js           # Bus boy floor view
│   │   ├── manager.js          # Manager multi-tab dashboard
│   │   └── timesheet.js        # Timesheet overlay (all roles)
│   ├── styles/app.css
│   └── package.json
│
├── build.bat                   # Windows one-command build script
└── build.sh                    # Mac/Linux one-command build script
```
