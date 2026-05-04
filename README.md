# 🤖 Rufus AI Shopper

> An AI-powered product discovery and review analysis system that reverse-engineers Amazon's Rufus-style shopping assistant.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-cyan)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Google-orange)](https://ai.google.dev/)

A production-ready AI shopping assistant that helps users discover products through natural language queries, analyzes thousands of reviews using Google's Gemini AI, and provides intelligent recommendations with transparent reasoning.

---

## 🚀 What It Does

**Rufus AI Shopper** simulates how Amazon's Rufus AI assistant answers shopping queries. It combines real product data, AI-powered review analysis, and intelligent ranking to help users make informed purchase decisions.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| 🔍 **Smart Search** | Ask natural questions like "best watches for girls under 2000" |
| 🛒 **Real Products** | Get actual Amazon products with title, image, price, and links |
| 🧠 **AI Review Analysis** | Gemini AI analyzes 100-500 reviews per product |
| 💬 **Chat Interface** | Conversational recommendations (ChatGPT-style) |
| 🧠 **Context-Aware** | Maintains conversation history across multiple chats |
| 📊 **Structured Results** | "Best Overall", "Best Budget", "Best Premium" categories |
| 🔐 **Authentication** | Secure login, signup, and password reset |
| 📧 **Email System** | Production-safe Brevo API (no SMTP issues) |

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library with hooks
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Node.js** + **Express.js** - API server
- **TypeScript** - Type-safe development

### AI & Data
- **Google Gemini 1.5 Flash** - LLM for analysis & chat
- **FAISS** - Vector similarity search
- **Gemini Embeddings** - Semantic search vectors

### Scraping
- **Apify** - Amazon product & review scraping

### Database
- **PostgreSQL** (Neon) - Multi-chat conversations, user data
- **SQLite** - Product metadata storage

### Email
- **Brevo API** - Transactional emails (password reset)

---

## 🎬 Demo

### Screenshots

| Search Results | Chat Interface | Product Cards |
|----------------|----------------|---------------|
| ![Search](docs/screenshots/search.png) | ![Chat](docs/screenshots/chat.png) | ![Products](docs/screenshots/products.png) |

### Video Demo

🎥 [Watch Demo Video](https://www.youtube.com/watch?v=your-video-link)

---

## 🧪 How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ User Query  │────▶│  Apify API   │────▶│ Real Amazon Data│
│  (Chat)     │     │  (Scraping)  │     │ (Products)      │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                    │
                          ┌─────────────────────────┘
                          ▼
                   ┌──────────────┐
                   │ Review Data  │
                   │  (100-500)   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Gemini AI    │
                   │ (Analysis)   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  FAISS DB    │
                   │(Embeddings)  │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐     ┌─────────────┐
                   │ Query Engine │────▶│  Ranked     │
                   │ (RAG)        │     │  Results    │
                   └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │     UI       │
                                        │ (Cards/Chat) │
                                        └──────────────┘
```

### Flow Explanation

1. **User enters query** → Natural language question
2. **Apify fetches data** → Real Amazon products & reviews
3. **Reviews collected** → 100-500 reviews per product
4. **Gemini analyzes** → Extracts pros, cons, insights
5. **FAISS retrieves** → Vector similarity search
6. **Backend ranks** → By relevance, rating, sentiment
7. **UI displays** → Structured recommendations

---

## ⚠️ Real-World Challenges Solved

This project tackles production-level problems that many AI applications face:

### 1. API Rate Limits (429 Errors)
**Problem**: Gemini API has strict rate limits that break the app.

**Solution**: 
- Implemented intelligent retry logic with exponential backoff
- Added request batching to minimize API calls
- Built caching layer for embeddings to avoid redundant processing
- Graceful degradation with fallback responses

### 2. SMTP Failure on Cloud (ETIMEDOUT)
**Problem**: Traditional SMTP (nodemailer) fails on Render/Railway with `connect ETIMEDOUT`.

**Solution**:
- Migrated from SMTP to **Brevo API** (HTTPS-based)
- No port blocking issues (uses standard HTTPS 443)
- Works reliably in serverless/cloud environments

### 3. Scraped Data Quality Issues
**Problem**: Apify returns incomplete/wrong product data (missing images, broken links).

**Solution**:
- Data validation pipeline with schema checks
- Fallback logic for missing images
- URL normalization to fix broken product links
- Mock data fallback for testing without scraping

### 4. Query-Product Mismatch
**Problem**: User searches "watches for girls" but gets unrelated products.

**Solution**:
- Semantic search using FAISS vector embeddings
- Query intent classification with Gemini
- Relevance scoring algorithm
- Multi-factor ranking (relevance + rating + sentiment)

### 5. AI Failures & Hallucinations
**Problem**: Gemini sometimes returns malformed JSON or hallucinates products.

**Solution**:
- Structured output prompting (JSON mode)
- Response validation against schema
- Retry with corrected prompts on failure
- RAG (Retrieval Augmented Generation) to ground responses in real data

### 6. Production Email Delivery
**Problem**: Password reset emails not reaching users.

**Solution**:
- Brevo API with 99.9% delivery rate
- Email template optimization for spam filters
- Both HTML and plain text versions
- Token display in email as backup

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- API keys for Gemini, Apify, Brevo

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/rufus-ai-shopper.git
cd rufus-ai-shopper
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
# AI & Scraping (Required)
GOOGLE_API_KEY=your_gemini_api_key_here
APIFY_API_KEY=your_apify_api_key_here

# Database (Required)
DATABASE_URL=postgresql://user:pass@host/db

# Email (Required for password reset)
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_FROM=rufus.ai.project@gmail.com

# Frontend URL (Required for reset links)
FRONTEND_URL=http://localhost:3000

# Paths (Optional - defaults provided)
FAISS_INDEX_PATH=./backend/data/faiss/index.bin
METADATA_DB_PATH=./backend/data/processed/products.db
RAW_DATA_PATH=./backend/data/raw

# Server (Optional)
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Setup Database

```bash
# Seed with sample data
npm run seed
```

### 4. Run Development

```bash
# Terminal 1 - Backend API
npm run server

# Terminal 2 - Frontend
npm run dev
```

### 5. Open App

Navigate to `http://localhost:3000`

---

## 🔐 Environment Variables Reference

| Variable | Required | Source | Purpose |
|----------|----------|--------|---------|
| `GOOGLE_API_KEY` | ✅ Yes | [Google AI Studio](https://makersuite.google.com/app/apikey) | Gemini AI analysis |
| `APIFY_API_KEY` | ✅ Yes | [Apify Console](https://console.apify.com) | Amazon scraping |
| `DATABASE_URL` | ✅ Yes | [Neon](https://neon.tech) or local Postgres | User & chat data |
| `BREVO_API_KEY` | ✅ Yes | [Brevo](https://app.brevo.com/settings/keys) | Password reset emails |
| `EMAIL_FROM` | ⚠️ Recommended | Your verified email | Sender address |
| `FRONTEND_URL` | ✅ Yes | Your domain | Reset link base URL |

---

## 📝 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/search` | POST | AI-powered product search |
| `/api/chat` | POST | Chat with AI assistant |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/scrape` | POST | Trigger product scraping |

### Example: Search Products

```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best watches for girls under 2000",
    "maxResults": 5
  }'
```

### Example: Chat

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which watch is best for daily wear?",
    "chatId": "optional-existing-chat-id"
  }'
```

---

## 📁 Project Structure

```
rufus-ai-shopper/
├── src/                          # Next.js frontend
│   ├── app/                      # App router pages
│   │   ├── forgot-password/         # Password reset UI
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # React components
│   │   ├── ChatInterface.tsx        # Main chat UI
│   │   ├── MultiChatInterface.tsx   # Multi-chat sidebar
│   │   ├── LandingPage.tsx          # Hero section
│   │   ├── ProductRecommendations.tsx
│   │   └── SearchBar.tsx
│   ├── lib/                      # Utilities
│   │   ├── api.ts                   # API client
│   │   └── auth.ts                  # Auth helpers
│   └── types/                    # TypeScript types
│
├── backend/                      # Node.js backend
│   ├── src/
│   │   ├── services/             # Core business logic
│   │   │   ├── auth.ts              # Authentication
│   │   │   ├── emailService.ts      # Brevo email
│   │   │   ├── gemini.ts            # Gemini AI
│   │   │   ├── scraper.ts           # Apify scraping
│   │   │   ├── embeddings.ts        # Vector embeddings
│   │   │   ├── vectorStore.ts       # FAISS database
│   │   │   ├── queryEngine.ts       # RAG engine
│   │   │   └── db.ts                # PostgreSQL
│   │   ├── routes/               # API routes
│   │   └── utils/                # Utilities
│   └── server.ts                    # Express server
│
├── backend/data/                 # Data storage
│   ├── raw/                      # Scraped data
│   ├── processed/                # Processed data
│   └── faiss/                    # Vector index
│
├── .env.example                     # Environment template
├── package.json
└── README.md
```

---

## 📈 Future Improvements

- [ ] **Better Ranking Algorithm** - ML-based product ranking
- [ ] **Real-time Scraping** - Live product data updates
- [ ] **More AI Personalization** - User preference learning
- [ ] **Better UI Animations** - Smooth transitions
- [ ] **Multi-language Support** - Hindi, Spanish, etc.
- [ ] **Price Tracking** - Historical price charts
- [ ] **Voice Search** - Speech-to-text queries
- [ ] **Mobile App** - React Native version

---

## 🎯 Why This Project Matters

### Real-World Problem Solving
This isn't a toy project. It solves actual e-commerce discovery problems that millions face daily.

### AI + Full-Stack Integration
Combines cutting-edge AI (Gemini, RAG, embeddings) with production-grade full-stack development.

### Production-Level Debugging
Every challenge solved here (rate limits, SMTP issues, data quality) mirrors real production problems.

---

## 👨‍💻 Author

**Rachit Chandekar**

- 🔗 [LinkedIn](https://linkedin.com/in/rachit-chandekar)
- 🐙 [GitHub](https://github.com/Rachit220504)

---

## 🤝 Contributing

Contributions welcome! Please follow:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ and ☕ for AI enthusiasts and smart shoppers!**

⭐ Star this repo if you find it useful!
