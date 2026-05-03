# 🛒 Rufus AI Shopper - Amazon Shopping Assistant Clone

A production-ready AI-powered shopping assistant that simulates how Amazon Rufus answers shopping queries using real product data, reviews, and reasoning. Built with Next.js, Node.js, Google Gemini AI, and FAISS vector database.

## 🎯 Features

- **AI-Powered Product Search**: Ask natural language questions about products
- **Review Analysis**: Analyzes 100-500 reviews per product using Gemini AI
- **Smart Recommendations**: Ranks products by relevance, rating, and sentiment
- **Structured Answers**: Returns "Best Overall", "Best Budget", and "Best for Specific Use Case"
- **Review-Based Insights**: Extracts pros, cons, and patterns from reviews
- **Comparison Tables**: Compare top 3 products side-by-side
- **Transparency Layer**: Shows "Based on X reviews analyzed"
- **Real-Time Chat Interface**: ChatGPT-like UI with smart query suggestions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Rufus AI Shopper                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)    │   Backend (Node.js + Express)                   │
│  ┌─────────────────┐   │   ┌─────────────────────────────────────────────┐ │
│  │ Chat Interface  │   │   │ Data Ingestion Pipeline                  │ │
│  │ Product Cards   │◄──┼───┤ • Scrape Amazon products/reviews         │ │
│  │ Comparison View │   │   │ • Generate embeddings                      │ │
│  └─────────────────┘   │   │ • Store in FAISS + SQLite                  │ │
│                        │   └─────────────────────────────────────────────┘ │
│                        │   ┌─────────────────────────────────────────────┐ │
│                        │   │ Query Engine (RAG)                        │ │
│                        │   │ • Convert query → embedding                │ │
│                        │   │ • FAISS vector search                      │ │
│                        │   │ • Rank by relevance + sentiment            │ │
│                        │   └─────────────────────────────────────────────┘ │
│                        │   ┌─────────────────────────────────────────────┐ │
│                        │   │ Gemini AI Integration                      │ │
│                        │   │ • Review summarization                     │ │
│                        │   │ • Structured recommendation generation      │ │
│                        │   │ • Chat response generation                 │ │
│                        │   └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API Key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
- (Optional) Apify Token for advanced scraping

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/rufus-ai-shopper.git
   cd rufus-ai-shopper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY
   ```

4. **Seed the database with sample data:**
   ```bash
   npm run seed
   ```

5. **Start the development server:**
   ```bash
   # Terminal 1 - Start backend
   npm run server
   
   # Terminal 2 - Start frontend
   npm run dev
   ```

6. **Open the app:**
   Navigate to `http://localhost:3000`

## 📝 Environment Variables

Create a `.env` file in the project root:

```env
# Required - Get from Google AI Studio
GOOGLE_API_KEY=your_google_api_key_here

# Optional - Get from Apify for advanced scraping
APIFY_TOKEN=your_apify_token_here

# Database paths
FAISS_INDEX_PATH=./backend/data/faiss/index.bin
METADATA_DB_PATH=./backend/data/processed/products.db
RAW_DATA_PATH=./backend/data/raw

# Server
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 💻 Usage

### Basic Queries

Try asking questions like:

- "Best magnesium supplement for seniors"
- "Best budget mechanical keyboard under 3000 INR"
- "Which protein powder has least side effects?"
- "Best wireless headphones for gym"

### Scraping New Products

To scrape Amazon products by keyword:

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"keyword": "magnesium supplement", "maxResults": 5}'
```

Or use the backend script:

```bash
npm run scrape -- --keyword "protein powder" --maxResults 5
```

## 🧪 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/search` | POST | Search products with AI recommendations |
| `/api/chat` | POST | Chat with the AI assistant |
| `/api/scrape` | POST | Scrape and process new products |
| `/api/stats` | GET | Get system statistics |
| `/api/products` | GET | Get all products (with optional filters) |

### Example API Requests

**Search Products:**
```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Best magnesium supplement for seniors",
    "maxResults": 5
  }'
```

**Chat:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which one is better for sleep?"
  }'
```

## 📁 Project Structure

```
rufus-ai-shopper/
├── src/                          # Next.js frontend
│   ├── app/                      # App router pages
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # React components
│   │   ├── ChatInterface.tsx
│   │   └── ProductRecommendations.tsx
│   ├── lib/                      # Utilities
│   │   └── api.ts
│   └── types/                    # TypeScript types
│       └── index.ts
├── backend/                      # Node.js backend
│   ├── src/
│   │   ├── services/             # Core services
│   │   │   ├── scraper.ts       # Amazon scraping
│   │   │   ├── gemini.ts        # Gemini AI integration
│   │   │   ├── embeddings.ts    # Review processing
│   │   │   ├── vectorStore.ts   # FAISS database
│   │   │   ├── metadataStore.ts # SQLite database
│   │   │   ├── queryEngine.ts   # RAG engine
│   │   │   └── dataPipeline.ts  # Data pipeline
│   │   ├── controllers/          # API controllers
│   │   ├── routes/               # Express routes
│   │   ├── utils/                # Utilities
│   │   └── types/                # TypeScript types
│   ├── data/                     # Data storage
│   │   ├── raw/                 # Raw scraped data
│   │   ├── processed/           # Processed data
│   │   └── faiss/               # FAISS index
│   └── server.ts                 # Express server
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

## 🧠 System Components

### 1. Data Ingestion Pipeline
- Scrapes Amazon product data (title, price, rating, reviews)
- Supports both Apify and fallback mock data
- Stores raw data for processing

### 2. Review Processing Engine
- Cleans and preprocesses reviews
- Chunks reviews into semantically meaningful segments
- Generates embeddings using Gemini
- Stores in FAISS vector database

### 3. Insight Extraction Module
- Uses Gemini to analyze review clusters
- Extracts pros, cons, and patterns
- Identifies hidden insights (e.g., "causes stomach upset in seniors")

### 4. Query Engine (RAG)
- Converts user queries to embeddings
- Retrieves relevant review chunks from FAISS
- Ranks products by relevance, rating, and sentiment
- Uses RAG (Retrieval Augmented Generation) for grounded responses

### 5. Response Generation
- Gemini generates structured JSON output
- Categories: Best Overall, Best Budget, Best for Specific Use
- Includes pros/cons and target audience for each product

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **AI**: Google Gemini 1.5 Flash API
- **Vector DB**: FAISS (local)
- **Metadata DB**: SQLite3
- **Scraping**: Apify Client (with fallback)
- **Embeddings**: Gemini Embeddings API

## 🔥 Advanced Features

### 1. "Why this recommendation?" Section
Every recommendation shows the actual review insights that led to the suggestion.

### 2. Competitor Comparison Table
Compare top 3 products on:
- Price
- Rating
- Key strengths
- Key weaknesses

### 3. Transparency Layer
Shows "Based on X reviews analyzed" to build trust.

### 4. Smart Query Suggestions
Auto-suggests queries like "Best for seniors" and "Least side effects".

## ⚠️ Important Notes

- **Free Tools Only**: Uses Gemini API free tier and local FAISS database
- **API Usage**: Optimized for low API usage by caching embeddings
- **No Hallucination**: All responses are grounded in retrieved review data
- **Mock Data**: Includes fallback mock data for testing without scraping

## 📊 Performance

- **Search Latency**: ~2-5 seconds (depends on Gemini API response time)
- **Database**: Local FAISS index for sub-millisecond vector search
- **Embeddings**: Cached to minimize API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for the powerful LLM
- FAISS team for the vector search library
- Apify for the Amazon scraping actors

---

**Built with ❤️ for AI enthusiasts and shoppers alike!**
