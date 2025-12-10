# 🎓 Zalogche

AI-powered sports betting analysis platform with 7-model swarm intelligence.

![Brand Colors](https://img.shields.io/badge/Brand-FFD608-FFD608?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

| Variable | Required | Get it from |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | [Supabase](https://supabase.com) |
| `ANTHROPIC_API_KEY` | ✅ | [Anthropic Console](https://console.anthropic.com) |
| `OPENAI_API_KEY` | ✅ | [OpenAI Platform](https://platform.openai.com) |
| `GOOGLE_AI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com) |
| `XAI_API_KEY` | ⚡ | [xAI Console](https://console.x.ai) |
| `GROQ_API_KEY` | 🆓 | [Groq Console](https://console.groq.com) |
| `PERPLEXITY_API_KEY` | 📡 | [Perplexity Settings](https://perplexity.ai/settings/api) |
| `ODDS_API_KEY` | ✅ | [The Odds API](https://the-odds-api.com) |

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio
npx prisma studio
```

Or run the SQL directly in Supabase:
- Go to Supabase Dashboard → SQL Editor
- Paste contents of `prisma/supabase-setup.sql`
- Run

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
zalogche/
├── app/                    # Next.js 14 App Router
│   ├── api/
│   │   ├── ai/
│   │   │   └── swarm/     # AI Swarm analysis endpoint
│   │   ├── sports/
│   │   │   └── events/    # Sports data endpoint
│   │   └── ...
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/             # React components
├── lib/
│   ├── ai/                # AI implementations
│   │   ├── types.ts       # TypeScript types
│   │   ├── swarm.ts       # Main orchestrator
│   │   ├── claude.ts      # Anthropic Claude
│   │   ├── openai.ts      # OpenAI GPT-4o
│   │   ├── gemini.ts      # Google Gemini
│   │   ├── grok.ts        # xAI Grok
│   │   ├── llama.ts       # Meta Llama (via Groq)
│   │   └── perplexity.ts  # Perplexity (live web)
│   ├── db/                # Database functions
│   ├── sports/            # Sports data APIs
│   └── redis.ts           # Caching
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── supabase-setup.sql # Direct SQL setup
└── ...
```

---

## 🤖 AI Agents

| Agent | Provider | Model | Personality |
|-------|----------|-------|-------------|
| 🟠 Claude | Anthropic | claude-sonnet-4-20250514 | Thoughtful, balanced |
| 💚 ChatGPT | OpenAI | gpt-4o | Enthusiastic, data-driven |
| 🔵 Gemini | Google | gemini-1.5-pro | Current events focused |
| ⚡ Grok | xAI | grok-2 | Witty, contrarian |
| 🦙 Llama | Groq | llama-3.3-70b | Straightforward |
| 🤖 Copilot | OpenAI | gpt-4o-mini | Technical, statistical |
| 🔍 Perplexity | Perplexity | sonar-large | Research with live web |

---

## 📡 API Endpoints

### AI Swarm Analysis

```bash
POST /api/ai/swarm
```

**Request:**
```json
{
  "event": {
    "id": "abc123",
    "sportTitle": "NBA",
    "homeTeam": "Los Angeles Lakers",
    "awayTeam": "Boston Celtics",
    "commenceTime": "2024-01-15T19:30:00Z"
  },
  "options": {
    "parallel": true,
    "savePrediction": true
  }
}
```

**Response:**
```json
{
  "eventId": "abc123",
  "eventName": "Boston Celtics @ Los Angeles Lakers",
  "analyses": [...],
  "consensus": {
    "verdict": "SLIGHT EDGE",
    "score": "0.75",
    "betVotes": 5,
    "passVotes": 2,
    "confidence": "MEDIUM"
  },
  "betSelection": "Los Angeles Lakers ML",
  "betOdds": 1.85
}
```

### Sports Events

```bash
GET /api/sports/events?sport=basketball_nba
```

---

## 💰 Cost Estimates

| AI Provider | Cost per 1000 analyses | Notes |
|-------------|----------------------|-------|
| Claude | ~$3.00 | Best quality |
| GPT-4o | ~$2.50 | Great all-around |
| Gemini | ~$0.50 | Google's offering |
| Grok | ~$2.00 | Unique perspective |
| Llama (Groq) | **FREE** | Very fast |
| GPT-4o-mini | ~$0.15 | Budget option |
| Perplexity | ~$0.50 | Live web access |

**Monthly estimate (1000 users, 10 analyses/day):**
- Conservative: ~$300-500/month
- Full swarm: ~$800-1200/month

---

## 🚢 Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

```bash
vercel --prod
```

### Cron Jobs (Auto-configured in vercel.json)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/settle-bets` | Every 15 min | Auto-settle finished bets |
| `/api/cron/update-leaderboard` | Hourly | Recalculate rankings |
| `/api/cron/cleanup-cache` | Daily | Clear old cache |

---

## 📊 Database Schema

See `prisma/schema.prisma` for full schema.

**Key Tables:**
- `User` - User profiles & auth
- `Bet` - User bet history
- `AIPrediction` - AI swarm predictions
- `AILeaderboard` - AI model performance
- `GlobalLeaderboard` - User competition rankings

---

## 🔐 Security Notes

- All API keys stored server-side only
- Rate limiting on AI endpoints (10/min)
- Row Level Security on Supabase
- No real money handling - entertainment only

---

## 📜 Legal

**DISCLAIMER:** Zalogche Analytics is for entertainment and educational purposes only. We do not facilitate actual gambling. Users must comply with local laws. Past AI performance does not guarantee future results. Gamble responsibly.

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Submit PR

---

## 📧 Support

- GitHub Issues
- Discord: [Coming Soon]
- Email: support@zalogche.com

---

Made with ❤️ and 🤖 by Zalogche
