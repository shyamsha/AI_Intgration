# NotebookLM Clone — Frontend + Backend

This repository contains a ready-to-run **frontend** (Vite + React + TypeScript) and a minimal **backend** (Node + Express) implementing:

- PDF upload UI and progress bar
- PDF preview using `react-pdf`
- Chat-like UI that returns mock assistant replies and citation buttons that navigate to PDF pages

This is **starter code** to meet the assignment requirements and to be extended with AI/vector tools for full functionality.

## What I included

- `/frontend` — Vite + React + TypeScript app for PDF upload, preview, and chat UI
- `/backend` — Node + Express server that accepts PDF uploads and has a placeholder chat endpoint

## How to run locally

### Backend

```bash
cd backend
npm install
node index.js
# backend runs at http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
# Install peer deps for react-pdf if needed:
# npm install react-pdf pdfjs-dist
npm run dev
# open http://localhost:5173
```

## Notes & Next steps

- The backend currently only stores uploaded PDFs to `backend/uploads/`. Replace the placeholder processing with:
  - PDF parsing and chunking (e.g., `pdf-parse`, `pdfjs`, or LlamaParse).
  - Vectorization and an embedding model.
  - A query endpoint that takes a user question and returns an answer + citations (page numbers).
