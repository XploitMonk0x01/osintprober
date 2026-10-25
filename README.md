# OSINTprober

An open-source intelligence research interface for reverse email and username lookup across public endpoints.

## Features

- **Email Lookup** - Resolve mailbox domains, check Gravatar hashes, and find public identities
- **Username Enumeration** - Probe 50+ public sources for username handles
- **Live SSE Streaming** - Results stream in real-time as each endpoint responds
- **Session-based Rate Limiting** - Built-in 24-hour rolling scan quota

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Motion
- **Backend**: Express.js + TypeScript
- **Build**: TypeScript + Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend API at http://localhost:3001

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
├── src/              # React frontend components and pages
├── server/           # Express.js backend API
│   ├── server.ts     # Main API server
│   ├── osintEngine.ts # Scanning pipeline
│   ├── probes.ts     # Platform-specific probes
│   └── platforms.ts  # Platform catalog
└── public/           # Static assets
```

## API Endpoints

- `GET /api/site-settings` - Site configuration
- `GET /api/auth/me` - Session info and scan quota
- `POST /api/scan/stream` - SSE scan stream
- `POST /api/socialscrape/scrape` - Dashboard lookup

## License

MIT
