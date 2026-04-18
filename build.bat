@echo off
setlocal EnableDelayedExpansion

echo.
echo  ================================================
echo   SwiftServe  --  Build Windows Installer
echo  ================================================
echo.

:: ── 1. Build Spring Boot JAR ─────────────────────────────────────────────────
echo [1/3] Building backend (Spring Boot)...
cd /d "%~dp0backend"

call mvnw.cmd clean package -DskipTests
if ERRORLEVEL 1 (
    echo.
    echo  ERROR: Maven build failed. Make sure Java 21+ is installed.
    pause
    exit /b 1
)

if not exist "target\swiftserve.jar" (
    echo.
    echo  ERROR: swiftserve.jar was not produced. Check Maven output above.
    pause
    exit /b 1
)

echo  Backend JAR built successfully.
echo.

:: ── 2. Install Node dependencies ─────────────────────────────────────────────
echo [2/3] Installing frontend dependencies...
cd /d "%~dp0frontend"

call npm install
if ERRORLEVEL 1 (
    echo.
    echo  ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo  Dependencies installed.
echo.

:: ── 3. Package with electron-builder ─────────────────────────────────────────
echo [3/3] Packaging Electron app...
call npm run dist
if ERRORLEVEL 1 (
    echo.
    echo  ERROR: electron-builder failed.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   Build complete!
echo   Installer is in:  frontend\dist\
echo  ================================================
echo.
pause
