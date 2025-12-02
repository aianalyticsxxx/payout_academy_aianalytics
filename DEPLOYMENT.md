# 🚀 Payout Academy - Deployment Guide

Complete step-by-step guide to deploy your Payout Academy app.

---

## 📋 Prerequisites

- Node.js 18+ installed
- A GitHub account
- Accounts for services (see Step 1)

---

## Step 1: Get API Keys (15 minutes)

### 🗃️ Database (Supabase) - FREE

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create account with GitHub
4. Click "New Project"
5. Choose a name, password, region
6. Wait for project to create (~2 min)
7. Go to **Settings → Database**
8. Copy the **Connection string (URI)**
   - Replace `[YOUR-PASSWORD]` with your database password

```
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres"
```

### 🟠 Claude (Anthropic) - PAY AS YOU GO

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / Log in
3. Go to **API Keys**
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

```
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 💚 ChatGPT (OpenAI) - PAY AS YOU GO

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Log in
3. Go to **API Keys**
4. Click "Create new secret key"
5. Copy the key

```
OPENAI_API_KEY="sk-proj-..."
```

### 🔵 Gemini (Google) - FREE TIER

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google
3. Click "Get API Key"
4. Create API key in new project
5. Copy the key

```
GOOGLE_AI_API_KEY="AIza..."
```

### ⚡ Grok (xAI) - PAY AS YOU GO

1. Go to [console.x.ai](https://console.x.ai)
2. Sign up / Log in
3. Create API key
4. Copy the key

```
XAI_API_KEY="xai-..."
```

### 🦙 Llama via Groq - 🆓 FREE!

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google/GitHub
3. Go to **API Keys**
4. Create new key
5. Copy the key

```
GROQ_API_KEY="gsk_..."
```

### 🔍 Perplexity - PAY AS YOU GO

1. Go to [perplexity.ai](https://perplexity.ai)
2. Log in
3. Go to **Settings → API**
4. Generate API key
5. Copy the key

```
PERPLEXITY_API_KEY="pplx-..."
```

### 🏀 Sports Data (The Odds API) - FREE TIER

1. Go to [the-odds-api.com](https://the-odds-api.com)
2. Click "Get API Key"
3. Enter email
4. Check email for API key

```
ODDS_API_KEY="..."
```

### 🔐 NextAuth Secret

Generate a secret:
```bash
openssl rand -base64 32
```

```
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"  # Change for production
```

---

## Step 2: Set Up Project Locally (5 minutes)

```bash
# 1. Unzip the project
unzip payout-academy-project.zip
cd payout-academy

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Edit .env.local with your API keys
nano .env.local  # or use any text editor
```

Fill in all the API keys you got in Step 1.

---

## Step 3: Set Up Database (2 minutes)

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push
```

You should see: "Your database is now in sync with your Prisma schema."

---

## Step 4: Test Locally (2 minutes)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see the login page! 🎉

---

## Step 5: Deploy to Vercel (5 minutes)

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? payout-academy
# - In which directory is your code? ./
# - Want to override settings? No
```

### Option B: GitHub + Vercel Dashboard

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/payout-academy.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repo
5. Click "Deploy"

---

## Step 6: Add Environment Variables to Vercel

1. Go to your project on Vercel
2. Click **Settings → Environment Variables**
3. Add ALL variables from your `.env.local`:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase URL |
| `ANTHROPIC_API_KEY` | Your Claude key |
| `OPENAI_API_KEY` | Your OpenAI key |
| `GOOGLE_AI_API_KEY` | Your Gemini key |
| `XAI_API_KEY` | Your Grok key |
| `GROQ_API_KEY` | Your Groq key |
| `PERPLEXITY_API_KEY` | Your Perplexity key |
| `ODDS_API_KEY` | Your Odds API key |
| `NEXTAUTH_SECRET` | Your generated secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

4. Click **Redeploy** to apply changes

---

## Step 7: Set Up Cron Jobs (Automatic with vercel.json)

The `vercel.json` file already configures these cron jobs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/settle-bets` | Every 15 min | Auto-settle bets |
| `/api/cron/update-leaderboard` | Hourly | Recalculate rankings |

These will run automatically on Vercel Pro/Enterprise.  
On Hobby plan, you can use [cron-job.org](https://cron-job.org) (free).

---

## 🎉 You're Live!

Your app should now be running at `https://your-app.vercel.app`

### Test it:
1. Create an account
2. Go to Events tab
3. Click "Ask 7 AIs" on any event
4. Watch the AI Swarm analyze!

---

## 💰 Cost Estimates

| Monthly Usage | Estimated Cost |
|---------------|---------------|
| 100 analyses | ~$30-50 |
| 500 analyses | ~$150-200 |
| 1000 analyses | ~$300-400 |

**Free tier limits:**
- Supabase: 500MB database
- Groq (Llama): Very generous
- The Odds API: 500 requests/month
- Vercel: 100GB bandwidth

---

## 🆘 Troubleshooting

### "Database connection failed"
- Check your `DATABASE_URL` is correct
- Make sure Supabase project is active

### "AI analysis failed"
- Check API keys are correct
- Check you have credits/quota

### "Unauthorized" on login
- Make sure `NEXTAUTH_SECRET` is set
- Make sure `NEXTAUTH_URL` matches your domain

### Build fails
- Run `npm run build` locally first
- Check for TypeScript errors

---

## 📧 Need Help?

- Check the [README.md](./README.md) for more info
- Open an issue on GitHub
- Email: support@payoutacademy.com

---

Made with ❤️ by Payout Academy
