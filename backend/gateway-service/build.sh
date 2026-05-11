#!/bin/bash
# ── Clinova Gateway Build Script ─────────────────────────────
set -e 

echo "📦 Installing core dependencies..."
npm install

echo "🛠️ Installing NestJS CLI explicitly..."
npm install @nestjs/cli @nestjs/schematics

echo "💎 Generating Prisma client..."
npx prisma generate

echo "🚀 Synchronizing database schema..."
npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
npx ts-node prisma/seed.ts

echo "🏗️ Building NestJS application..."
# Using the installed CLI to build
./node_modules/.bin/nest build

echo "✅ Build complete!"
