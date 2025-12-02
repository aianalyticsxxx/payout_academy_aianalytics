#!/bin/bash

# ==========================================
# PAYOUT ACADEMY - DEPLOYMENT SCRIPT
# ==========================================

echo "🎓 Payout Academy Deployment Script"
echo "===================================="
echo ""

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

echo "✅ Node.js and npm are installed"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 2: Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found!"
    echo "   Please copy .env.example to .env.local and add your API keys:"
    echo "   cp .env.example .env.local"
    echo ""
    echo "   Required keys:"
    echo "   - DATABASE_URL (Supabase)"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - GOOGLE_AI_API_KEY"
    echo "   - GROQ_API_KEY (free!)"
    echo "   - ODDS_API_KEY"
    echo "   - NEXTAUTH_SECRET"
    echo ""
    exit 1
fi
echo "✅ .env.local found"
echo ""

# Step 3: Generate Prisma client
echo "🗃️  Step 3: Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated"
echo ""

# Step 4: Push database schema
echo "🗃️  Step 4: Pushing database schema..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to push database schema"
    echo "   Make sure your DATABASE_URL is correct in .env.local"
    exit 1
fi
echo "✅ Database schema pushed"
echo ""

# Step 5: Build the app
echo "🔨 Step 5: Building the app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run locally: npm run dev"
echo "2. Deploy to Vercel: npx vercel --prod"
echo ""
echo "Visit http://localhost:3000 to see your app!"
