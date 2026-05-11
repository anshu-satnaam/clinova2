#!/bin/bash
# ── Clinova Gateway Build Script ─────────────────────────────
set -e 

echo "📦 Installing dependencies..."
npm install

echo "💎 Generating Prisma client..."
npx prisma generate

echo "🚀 Synchronizing database schema..."
npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
npx ts-node prisma/seed.ts

echo "🏗️ Building NestJS application..."
npx -p @nestjs/cli nest build

echo "🔍 Verifying and fixing build output..."
if [ -d "dist/src" ]; then
  echo "📂 Found dist/src, ensuring files are in dist root..."
  # Move files if they are nested in dist/src
  cp -r dist/src/* dist/
fi

if [ -f "dist/main.js" ]; then
  echo "✅ dist/main.js is ready"
else
  echo "❌ dist/main.js NOT found!"
  find dist -maxdepth 3
  exit 1
fi

echo "✅ Build complete!"
