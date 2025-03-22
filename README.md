# LLM Evaluation Platform

## Project Structure


## Prerequisites

- Node.js v18+
- npm v9+
- Docker & Docker Compose
- MongoDB (for manual setup)
- Redis (for manual setup)

## Installation

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd frontend
npm install
```

## Configuration

### Backend (.env)
```
MONGO_URI=mongodb+srv://mafex:mafex@cluster0.p1ckn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
OPENROUTER_API_KEY=your_key

```

### Frontend (.env)
```
NEXT_PUBLIC_API_BASE=http://localhost:3000/
```

## Running the Project

### Backend
```bash
cd backend
node server.js
```

### Frontend
```bash
cd frontend
npm run dev
```

## Key Dependencies

### Backend
- **Express.js** 4.21
- **MongoDB** 8.12
- **Redis** 4.7
- **Bull** 4.16 (Queue system)
- **Socket.io** 4.8

### Frontend
- **Next.js** 15.2
- **React** 19
- **Recharts** 2.15
- **Radix UI Primitives**
- **Socket.io Client** 4.8

## Evaluation Workflow
1. Upload CSV dataset through `/upload` endpoint
2. Start evaluation from frontend interface
3. Monitor real-time progress via WebSocket
4. View results in interactive dashboard

