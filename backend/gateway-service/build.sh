#!/bin/bash
# ── Clinova Gateway Build Script ─────────────────────────────
set -e # Exit immediately if a command exits with a non-zero status

echo "📦 Installing dependencies..."
npm install

echo "💎 Generating Prisma client..."
npx prisma generate

echo "🚀 Synchronizing database schema..."
npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
npx ts-node prisma/seed.ts

echo "🏗️ Building NestJS application..."
./node_modules/.bin/nest build

echo "✅ Build complete!"
