#!/usr/bin/env bash
# ChoreChump — LXC Container Installer & Systemd Service Setup (Debian / Ubuntu / Alpine)
set -euo pipefail

APP_DIR="/opt/chorechump"
DATA_DIR="/var/lib/chorechump"
PORT="${PORT:-3000}"

echo "==> Installing Node.js 20 and build tools for SQLite..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y curl ca-certificates gnupg build-essential python3 sqlite3
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
elif command -v apk >/dev/null 2>&1; then
  apk add --no-cache nodejs npm python3 make g++ sqlite
fi

echo "==> Setting up application directories..."
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r ./* "$APP_DIR/"

cd "$APP_DIR"
echo "==> Installing dependencies and building ChoreChump..."
npm install
npm run build

if command -v systemctl >/dev/null 2>&1; then
  echo "==> Creating systemd service (chorechump.service)..."
  cat >/etc/systemd/system/chorechump.service <<EOF
[Unit]
Description=ChoreChump Family Chore & Room Tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=CHORECHUMP_DATA_DIR=$DATA_DIR
ExecStart=$(command -v node) $APP_DIR/dist/server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now chorechump.service
  echo "==> ChoreChump is running on http://0.0.0.0:$PORT"
else
  echo "==> Built successfully! Start with: CHORECHUMP_DATA_DIR=$DATA_DIR PORT=$PORT node $APP_DIR/dist/server/index.js"
fi
