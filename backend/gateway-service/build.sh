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
# Force npx to use the @nestjs/cli package specifically
npx -p @nestjs/cli nest build

echo "✅ Build complete!"
