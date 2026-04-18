#!/usr/bin/env bash
set -e

REPO="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo " ================================================"
echo "  SwiftServe  --  Build Installer"
echo " ================================================"
echo ""

# ── 1. Build Spring Boot JAR ──────────────────────────────────────────────────
echo "[1/3] Building backend (Spring Boot)..."
cd "$REPO/backend"

chmod +x mvnw
./mvnw clean package -DskipTests

if [ ! -f "target/swiftserve.jar" ]; then
    echo ""
    echo " ERROR: swiftserve.jar was not produced. Check Maven output above."
    exit 1
fi

echo " Backend JAR built successfully."
echo ""

# ── 2. Install Node dependencies ──────────────────────────────────────────────
echo "[2/3] Installing frontend dependencies..."
cd "$REPO/frontend"
npm install

echo " Dependencies installed."
echo ""

# ── 3. Package with electron-builder ─────────────────────────────────────────
echo "[3/3] Packaging Electron app..."

# Auto-detect platform
case "$(uname -s)" in
    Darwin) npm run dist:mac  ;;
    Linux)  npm run dist:linux ;;
    *)      npm run dist      ;;
esac

echo ""
echo " ================================================"
echo "  Build complete!"
echo "  Installer is in:  frontend/dist/"
echo " ================================================"
echo ""
