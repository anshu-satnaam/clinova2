#!/bin/bash
# ── Clinova Gateway Build Script ─────────────────────────────

echo "📦 Installing dependencies..."
npm install

echo "💎 Generating Prisma client..."
npx prisma generate

echo "🚀 Synchronizing database schema..."
# db push is better for initial prototyping/setup when the DB is non-empty
npx prisma db push --accept-data-loss

echo "🌱 Seeding database..."
# We use ts-node to run the seed file
npx ts-node prisma/seed.ts

echo "🏗️ Building NestJS application..."
npx nest build

echo "✅ Build complete!"
