#!/usr/bin/env bash
# ChoreChump — LXC Container Installer & Systemd Service Setup (Debian / Ubuntu / Alpine)
# Can be run inside a cloned repo (`./lxc-install.sh`) OR directly in a fresh Proxmox LXC container:
#   curl -fsSL https://raw.githubusercontent.com/thegoatmilkguy/ChoreChump/main/lxc-install.sh | bash
set -euo pipefail

REPO_URL="https://github.com/thegoatmilkguy/ChoreChump.git"
APP_DIR="/opt/chorechump"
DATA_DIR="/var/lib/chorechump"
PORT="${PORT:-3000}"

echo "==> Installing Node.js 20, git, and build tools for SQLite..."
if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y curl ca-certificates gnupg git build-essential python3 sqlite3
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
elif command -v apk >/dev/null 2>&1; then
  apk add --no-cache curl git nodejs npm python3 make g++ sqlite
fi

echo "==> Setting up application and persistent SQLite directories..."
mkdir -p "$DATA_DIR"

if [ -f "./package.json" ] && grep -q '"chorechump"' ./package.json 2>/dev/null; then
  mkdir -p "$APP_DIR"
  cp -r ./* "$APP_DIR/"
else
  if [ -d "$APP_DIR/.git" ]; then
    echo "==> Updating existing ChoreChump repo in $APP_DIR..."
    git -C "$APP_DIR" pull --ff-only
  else
    echo "==> Cloning ChoreChump from $REPO_URL to $APP_DIR..."
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
  fi
fi

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
  IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
  echo "============================================================"
  echo "✅ ChoreChump is running!"
  echo "🌐 Open: http://${IP_ADDR}:${PORT}"
  echo "💾 SQLite DB: ${DATA_DIR}/chorechump.db"
  echo "🔑 Default Parent PIN: 1234"
  echo "============================================================"
else
  echo "==> Built successfully! Start with: CHORECHUMP_DATA_DIR=$DATA_DIR PORT=$PORT node $APP_DIR/dist/server/index.js"
fi
