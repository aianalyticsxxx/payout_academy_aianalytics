#!/bin/bash
# ==========================================
# APPLY RLS POLICIES TO SUPABASE
# ==========================================
# This script helps you apply RLS policies to your Supabase database
#
# Usage:
#   ./scripts/apply-rls.sh
#
# Prerequisites:
#   - Supabase CLI installed: npm install -g supabase
#   - Logged in: supabase login
#   - Project linked: supabase link --project-ref YOUR_PROJECT_REF

set -e

echo "=========================================="
echo "APPLYING ROW LEVEL SECURITY POLICIES"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo ""
    echo "Install options:"
    echo "  npm install -g supabase"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Or apply manually:"
    echo "  1. Go to Supabase Dashboard > SQL Editor"
    echo "  2. Paste contents of prisma/rls-policies.sql"
    echo "  3. Click 'Run'"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "prisma/rls-policies.sql" ]; then
    echo "❌ Run this script from the project root directory"
    exit 1
fi

echo "📋 RLS Policies file: prisma/rls-policies.sql"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked. Run:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Or apply manually in Supabase Dashboard > SQL Editor"
    echo ""
    read -p "Do you want to apply manually? (y/n): " manual
    if [ "$manual" = "y" ]; then
        echo ""
        echo "Instructions:"
        echo "1. Go to https://supabase.com/dashboard"
        echo "2. Select your project"
        echo "3. Go to SQL Editor"
        echo "4. Create a new query"
        echo "5. Paste the contents of prisma/rls-policies.sql"
        echo "6. Click 'Run'"
        echo ""
        echo "📄 Opening the file..."
        cat prisma/rls-policies.sql | head -50
        echo ""
        echo "... (truncated, see full file at prisma/rls-policies.sql)"
    fi
    exit 0
fi

echo "🚀 Applying RLS policies..."
supabase db execute --file prisma/rls-policies.sql

echo ""
echo "✅ RLS policies applied successfully!"
echo ""
echo "Verify in Supabase Dashboard:"
echo "  Database > Tables > Select table > RLS Policies"
