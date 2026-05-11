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

echo "🔍 Verifying build output..."
if [ -d "dist" ]; then
  echo "✅ dist folder found"
  find dist -maxdepth 2
else
  echo "❌ dist folder NOT found"
  exit 1
fi

echo "✅ Build complete!"
