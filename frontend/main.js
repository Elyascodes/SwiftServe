const { app, BrowserWindow, dialog, shell } = require('electron');
const path  = require('path');
const http  = require('http');
const fs    = require('fs');
const { spawn, execFile } = require('child_process');

let mainWindow    = null;
let splashWindow  = null;
let backendProc   = null;
const PORT        = 8080;

// ─────────────────────────────────────────────────────────────────────────────
//  Path helpers
// ─────────────────────────────────────────────────────────────────────────────

function getJarPath() {
    // When packaged by electron-builder the JAR lives in resources/
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'backend.jar');
    }
    // During development it is in backend/target/
    return path.join(__dirname, '..', 'backend', 'target', 'swiftserve.jar');
}

function getDbDir() {
    // Packaged: write to the user-specific app-data folder (always writable)
    // Dev:      write alongside the repo as before
    return app.isPackaged
        ? app.getPath('userData')
        : path.join(__dirname, '..', 'backend', 'data');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Java detection
// ─────────────────────────────────────────────────────────────────────────────

function findJava() {
    return new Promise(resolve => {
        // 1. Honour JAVA_HOME if set
        if (process.env.JAVA_HOME) {
            const exe = path.join(
                process.env.JAVA_HOME, 'bin',
                process.platform === 'win32' ? 'java.exe' : 'java'
            );
            if (fs.existsSync(exe)) { resolve(exe); return; }
        }

        // 2. Fall back to whatever 'java' is on PATH
        execFile('java', ['-version'], { timeout: 6000 }, err => {
            resolve(err ? null : 'java');
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Backend lifecycle
// ─────────────────────────────────────────────────────────────────────────────

function startBackend(javaExe) {
    return new Promise((resolve, reject) => {
        const jar = getJarPath();
        if (!fs.existsSync(jar)) {
            reject(new Error(
                'Backend JAR not found:\n' + jar +
                '\n\nBuild the project first with build.bat (Windows) or build.sh (Mac/Linux).'
            ));
            return;
        }

        const dbDir = getDbDir();
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

        // Override Spring Boot datasource so the DB always ends up in a writable location
        const dbUrl = 'jdbc:sqlite:' +
            path.join(dbDir, 'swiftserve.db').replace(/\\/g, '/');

        console.log('[SwiftServe] Starting backend…');
        console.log('[SwiftServe] JAR  :', jar);
        console.log('[SwiftServe] DB   :', dbUrl);
        console.log('[SwiftServe] Java :', javaExe);

        backendProc = spawn(javaExe, [
            '-jar', jar,
            '--spring.datasource.url=' + dbUrl,
            '--server.port=' + PORT
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        backendProc.stdout.on('data', d => process.stdout.write('[BE] ' + d));
        backendProc.stderr.on('data', d => process.stderr.write('[BE] ' + d));
        backendProc.on('error', err =>
            reject(new Error('Failed to launch Java process:\n' + err.message)));

        // Poll the health endpoint until the server responds
        const deadline = Date.now() + 90_000; // 90-second timeout
        const poll = setInterval(() => {
            if (Date.now() > deadline) {
                clearInterval(poll);
                reject(new Error('Backend did not start within 90 seconds.'));
                return;
            }
            const req = http.get(
                `http://localhost:${PORT}/api/tables`,
                res => {
                    if (res.statusCode < 500) {
                        clearInterval(poll);
                        res.resume();
                        console.log('[SwiftServe] Backend ready.');
                        resolve();
                    } else {
                        res.resume();
                    }
                }
            );
            req.on('error', () => { /* not ready yet — keep polling */ });
            req.setTimeout(1000, () => req.destroy());
        }, 1500);
    });
}

function stopBackend() {
    if (backendProc) {
        console.log('[SwiftServe] Stopping backend…');
        backendProc.kill('SIGTERM');
        backendProc = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Windows
// ─────────────────────────────────────────────────────────────────────────────

function createSplash() {
    splashWindow = new BrowserWindow({
        width: 480,
        height: 300,
        frame: false,
        resizable: false,
        center: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        backgroundColor: '#12122a',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    splashWindow.loadFile('splash.html');
}

function createMain() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        backgroundColor: '#12122a',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile('index.html');
    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─────────────────────────────────────────────────────────────────────────────
//  App lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
    createSplash();

    // ── Check for Java ──────────────────────────────────────────────────────
    const javaExe = await findJava();
    if (!javaExe) {
        if (splashWindow) splashWindow.destroy();
        const choice = dialog.showMessageBoxSync({
            type: 'error',
            title: 'Java Not Found',
            message: 'SwiftServe requires Java 21 or newer.',
            detail:
                'Java was not detected on this computer.\n\n' +
                'Please install the latest Java (Eclipse Temurin is recommended) ' +
                'and restart SwiftServe.\n\n' +
                'Click "Get Java" to open the download page.',
            buttons: ['Get Java', 'Quit'],
            defaultId: 0
        });
        if (choice === 0) shell.openExternal('https://adoptium.net/temurin/releases/');
        app.quit();
        return;
    }

    // ── Start backend ───────────────────────────────────────────────────────
    try {
        await startBackend(javaExe);
        createMain();
    } catch (err) {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
        dialog.showErrorBox('SwiftServe — Startup Error', err.message);
        app.quit();
    }
});

app.on('before-quit', stopBackend);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createMain();
});
