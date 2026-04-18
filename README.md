# ShiftServe — Setup & Developer Guide

A restaurant staff management and sign-in system built with Spring Boot (backend) and Electron (frontend).

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Running](#setup--running)
- [Default Accounts](#default-accounts)
- [API Reference](#api-reference)
- [How to Edit Existing Functionality](#how-to-edit-existing-functionality)
- [How to Add New Functionality](#how-to-add-new-functionality)
- [Database](#database)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

```
Test/
├── backend/                    # Spring Boot REST API (Java)
│   ├── src/main/java/com/elyas/test/
│   │   ├── TestApplication.java          # App entry point
│   │   └── controller/
│   │       ├── User.java                 # Employee entity (DB model)
│   │       ├── UserRepository.java       # Database access layer
│   │       ├── UserController.java       # /auth/login endpoint
│   │       └── DataInitializer.java      # Seeds DB on first run
│   ├── src/main/resources/
│   │   └── application.properties        # DB and server config
│   ├── data/mydatabase.db                # SQLite database file
│   └── pom.xml                           # Maven dependencies
│
└── frontend/                   # Electron desktop app
    ├── main.js                           # Electron window setup
    ├── index.html                        # Login UI
    └── package.json                      # Node dependencies
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java JDK | 21+ | Run the Spring Boot backend |
| Node.js | 18+ | Run the Electron frontend |
| npm | Included with Node.js | Install frontend dependencies |

> The project uses a Maven wrapper (`mvnw`), so you do **not** need Maven installed separately.

---

## Setup & Running

### 1. Start the Backend

```bash
cd backend

# Windows
mvnw.cmd spring-boot:run

# Mac / Linux
./mvnw spring-boot:run
```

The backend starts at `http://localhost:8080`. On the **first run**, it auto-creates the SQLite database and seeds 13 employee accounts.

### 2. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install        # only needed the first time
npm start
```

An Electron window opens with the ShiftServe login screen.

### 3. Log In

Use any of the [default accounts](#default-accounts) below. The default password for all accounts is `Shift1`.

---

## Default Accounts

Seeded automatically on first run by [DataInitializer.java](backend/src/main/java/com/elyas/test/controller/DataInitializer.java).

| Employee ID | Name | Role |
|-------------|------|------|
| MGR001 | Jordan Mitchell | MANAGER |
| WTR001 | Alex Johnson | WAITER |
| WTR002 | Sam Rivera | WAITER |
| WTR003 | Taylor Lee | WAITER |
| WTR004 | Morgan Chen | WAITER |
| WTR005 | Casey Williams | WAITER |
| BSB001 | Riley Davis | BUSBOY |
| BSB002 | Quinn Anderson | BUSBOY |
| CHF001 | Jamie Garcia | CHEF |
| CHF002 | Drew Martinez | CHEF |
| CHF003 | Avery Thompson | CHEF |
| CHF004 | Blake Robinson | CHEF |
| CHF005 | Cameron White | CHEF |

**Default password for all accounts:** `Shift1`

---

## API Reference

### `POST /auth/login`

Authenticates an employee.

**Request body:**
```json
{
  "employeeId": "WTR001",
  "password": "Shift1"
}
```

**Success response (200):**
```json
{
  "role": "WAITER",
  "employeeId": "WTR001",
  "name": "Alex Johnson"
}
```

**Failure response (401):**
```json
{
  "error": "Invalid credentials"
}
```

**Validation rules:**
- `employeeId`: exactly 6 alphanumeric characters
- `password`: minimum 4 characters
- Banned passwords: `1111`, `123456`, `000000`, `111111`, `123123`, `654321`, `password`

---

## How to Edit Existing Functionality

### Change an employee's name, role, or password

Edit the seed data in [DataInitializer.java](backend/src/main/java/com/elyas/test/controller/DataInitializer.java).

> **Note:** DataInitializer only runs when the database is **empty**. To re-seed, delete `backend/data/mydatabase.db` and restart the backend.

```java
// Example: change a user's role
users.add(new User("WTR001", encoder.encode("Shift1"), "WAITER", "Alex Johnson"));
//                                                       ^^^^^^ change role here
```

### Add or remove a banned password

Edit the `BANNED_PASSWORDS` list in [UserController.java](backend/src/main/java/com/elyas/test/controller/UserController.java):

```java
private static final List<String> BANNED_PASSWORDS = List.of(
    "1111", "123456", "000000", "111111", "123123", "654321", "password"
    // add more entries here
);
```

### Change the Employee ID or password validation rules

Edit the validation block in [UserController.java](backend/src/main/java/com/elyas/test/controller/UserController.java) inside the `login()` method:

```java
// Employee ID: currently must be exactly 6 alphanumeric chars
if (employeeId == null || !employeeId.matches("[a-zA-Z0-9]{6}")) { ... }

// Password: currently minimum 4 chars
if (password == null || password.length() < 4) { ... }
```

### Change the database location

Edit [application.properties](backend/src/main/resources/application.properties):

```properties
spring.datasource.url=jdbc:sqlite:./data/mydatabase.db
#                                  ^^ change this path
```

### Change the Electron window size

Edit [main.js](frontend/main.js):

```javascript
mainWindow = new BrowserWindow({
  width: 800,   // change width
  height: 600,  // change height
  ...
});
```

### Update the login UI

Edit [index.html](frontend/index.html) directly. It is plain HTML/CSS/JS — no build step required.

---

## How to Add New Functionality

### Add a new API endpoint

1. Create a new controller file in `backend/src/main/java/com/elyas/test/controller/`, or add a method to [UserController.java](backend/src/main/java/com/elyas/test/controller/UserController.java):

```java
@GetMapping("/employees")
public ResponseEntity<?> getAllEmployees() {
    List<User> employees = userRepository.findAll();
    return ResponseEntity.ok(employees);
}
```

2. Restart the backend (`Ctrl+C` then `./mvnw spring-boot:run`).

### Add a new field to the User model

1. Add the field to [User.java](backend/src/main/java/com/elyas/test/controller/User.java):

```java
@Column
private String email;

// Add getter and setter:
public String getEmail() { return email; }
public void setEmail(String email) { this.email = email; }
```

2. Because `spring.jpa.hibernate.ddl-auto=update` is set, the column is added to the database automatically on the next restart. No SQL migration needed.

### Add a new role

1. The `role` field in [User.java](backend/src/main/java/com/elyas/test/controller/User.java) is a plain `String` — just use the new role name:

```java
// In DataInitializer.java
users.add(new User("HST001", encoder.encode("Shift1"), "HOST", "Jamie Host"));
```

2. Update any frontend role-based logic in [index.html](frontend/index.html) to handle the new role.

### Add a new page / screen to the frontend

1. Create a new HTML file in `frontend/`, e.g., `dashboard-manager.html`.
2. In [index.html](frontend/index.html), navigate to it after a successful login:

```javascript
// After successful login response:
if (data.role === "MANAGER") {
    window.location.href = "dashboard-manager.html";
} else if (data.role === "WAITER") {
    window.location.href = "dashboard-waiter.html";
}
```

3. Access the stored session data on the new page:

```javascript
const user = JSON.parse(sessionStorage.getItem("user"));
console.log(user.name, user.role);
```

### Add a new Maven dependency (backend library)

Add it to the `<dependencies>` section in [pom.xml](backend/pom.xml):

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>some-library</artifactId>
    <version>1.0.0</version>
</dependency>
```

Then run `./mvnw spring-boot:run` — Maven downloads it automatically.

### Add a new npm package (frontend library)

```bash
cd frontend
npm install <package-name>
```

Then import it in your HTML or JS files.

---

## Database

- **Type:** SQLite
- **File:** `backend/data/mydatabase.db`
- **Schema managed by:** Hibernate (`ddl-auto=update` — safe to add columns, never drops data)
- **Seeded by:** `DataInitializer.java` on first run (only when the table is empty)

**To reset the database to defaults:**

```bash
# Stop the backend first, then:
rm backend/data/mydatabase.db
# Restart the backend — it will recreate and re-seed automatically
```

**To inspect the database directly**, use any SQLite viewer (e.g., [DB Browser for SQLite](https://sqlitebrowser.org/)) and open `backend/data/mydatabase.db`.

---

## Troubleshooting

**Backend won't start — "port already in use"**
Another process is using port 8080. Either stop it or change the port in `application.properties`:
```properties
server.port=8081
```
Then update the frontend's fetch URL in `index.html` to match.

**Login always fails with valid credentials**
The database may be empty or corrupted. Delete `backend/data/mydatabase.db` and restart the backend to re-seed.

**Electron window is blank / can't connect**
Make sure the backend is running before starting the frontend. The frontend connects to `http://localhost:8080`.

**"Java not found" when running mvnw**
Install a JDK (version 21 or higher) and make sure `java` is on your PATH. Run `java -version` to verify.

**Changes to Java files don't take effect**
The backend must be restarted after any Java source change. Stop it with `Ctrl+C` and run `./mvnw spring-boot:run` again.
