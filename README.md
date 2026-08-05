# MediGuardian AI

**AI-Powered Medical Report & Prescription Cross-Checker**
Built for the **YGC AI Buildathon 2026 — Round 1**

Your prescriptions and lab reports live in different hospitals, in different formats, written by different doctors. No single visit sees the whole picture. MediGuardian AI reads them all, merges them into one patient timeline, and flags what only becomes visible **across** visits: duplicate medicines, conflicting dosages, allergy contradictions, risky drug interactions, and lab values drifting out of range.

> **Information only — not a diagnosis.** MediGuardian AI surfaces things worth checking and always recommends confirming with a qualified doctor or pharmacist.

---

## What it does

| Stage | What happens |
|-------|--------------|
| **Upload** | Drag and drop multiple PDFs or images from different visits and providers. |
| **Read** | Digital PDFs are parsed with PyMuPDF; scanned pages fall back to Tesseract OCR. |
| **Extract** | Groq (Llama 3.3 70B) converts raw text into strict structured JSON, validated by Pydantic. |
| **Timeline** | Records from every provider are merged and ordered into one chronological history. |
| **Cross-check** | A deterministic engine detects duplicates, dosage conflicts, allergy contradictions, drug interactions and abnormal labs. |
| **Lab trends** | The same test is tracked across visits, charted against its normal range, and explained in plain language. |
| **Ask** | A grounded assistant answers questions across all documents with a confidence score, supporting sources, and a disclaimer. |

---

## The core design decision

**The LLM explains. Deterministic code decides.**

Every safety-critical finding — is this a duplicate? does this contradict a recorded allergy? did the dose change? — is produced by explicit rules in `backend/services/safety_service.py`, not by free-form model output. The same records always produce the same alerts. The language model is used where language is the right tool: reading messy OCR text into structure, explaining a trend, and answering questions.

That engine understands real medical relationships rather than matching strings:

- **Brand → generic:** *Panadol* and *Paracetamol* are recognised as the same drug, so a duplicate across two hospitals is caught.
- **Drug families:** an allergy to *Penicillin* correctly flags a later *Amoxicillin* prescription.
- **Dose comparison:** free-text frequencies (`once daily`, `1 tablet three times a day`) are normalised to doses-per-day, so a Metformin change from 1/day to 3/day is detected as a conflict.
- **Interaction table:** curated pairs (e.g. Warfarin + Aspirin) are checked against concurrently prescribed drugs.

---

## Tech stack

**Frontend** — Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Recharts
**Backend** — FastAPI, SQLAlchemy, SQLite, Pydantic
**AI** — Groq API (`llama-3.3-70b-versatile`), JSON mode, temperature 0
**Documents** — PyMuPDF (digital PDFs), Tesseract OCR (scanned pages)

---

## Running it locally

**Prerequisites:** Node.js 18+, Python 3.10+, and a free [Groq API key](https://console.groq.com/keys).
Optional: [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) — only needed to read *scanned* documents.

### 1. Backend

```bash
cd backend

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env        # Windows: copy .env.example .env
# then open .env and paste in your GROQ_API_KEY

uvicorn main:app --reload
```

Backend runs at `http://localhost:8000` — interactive API docs at `http://localhost:8000/docs`.
Check everything is wired up: `http://localhost:8000/api/v1/health`

### 2. Frontend

In a second terminal:

```bash
cd frontend

npm install

cp .env.example .env.local  # Windows: copy .env.example .env.local

npm run dev
```

Open `http://localhost:3000`.

### 3. Try it

Go to **Upload Reports**, drop in two or more documents for the same patient from different dates, and wait for processing. Then visit **Patient Timeline**, **Medical Safety**, **Lab Trends**, and **AI Assistant**.

---

## API reference

Base path: `/api/v1`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Database + Groq connectivity |
| `POST` | `/upload` | Upload files, extract text |
| `POST` | `/ai/extract/{document_id}` | LLM extraction into structured data |
| `GET` | `/patients` | Patients found across records |
| `GET` | `/medical-records` | All extracted records |
| `GET` | `/timeline` · `/timeline/{patient}` | Merged chronological history |
| `GET` | `/safety-analysis` · `/safety-analysis/{patient}` | Cross-check findings + risk score |
| `GET` | `/lab-trends` · `/lab-trends/{patient}` | Lab series, trend direction, AI explanation |
| `POST` | `/chat` · `/chat/{patient}` | Grounded Q&A across documents |
| `DELETE` | `/records` | Clear the workspace |

---

## Project structure

```
backend/
  main.py                    FastAPI app + CORS
  database.py                SQLAlchemy engine/session
  models.py                  UploadedDocument, MedicalRecord
  schemas.py                 Pydantic extraction contract
  api/routes.py              All HTTP endpoints
  services/
    document_service.py      PDF text + OCR
    groq_service.py          LLM client (JSON mode)
    ai_service.py            Text -> structured medical data
    timeline_service.py      Merge + order visits
    safety_service.py        Deterministic cross-checking engine
    lab_trend_service.py     Longitudinal lab analysis
    chat_service.py          Grounded RAG-style assistant

frontend/src/
  app/page.tsx               Landing page
  app/dashboard/             Overview, upload, timeline, safety, trends, assistant
  components/Brand.tsx       Logo, wordmark, medical disclaimer
  lib/api.ts                 Typed backend client
```

---

## Deployment

The frontend deploys to Vercel as-is. The backend is a Python service, so it needs a Python host (Render, Railway, or Hugging Face Spaces) — Vercel's serverless functions can't run it.

1. Deploy `backend/` to Render as a Web Service:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add `GROQ_API_KEY` as an environment variable.
2. Deploy `frontend/` to Vercel, setting the root directory to `frontend` and adding
   `NEXT_PUBLIC_API_URL=https://<your-backend>/api/v1`.

> SQLite storage on free tiers is ephemeral — fine for a demo, but a managed Postgres instance would be the production path (only `DATABASE_URL` changes).

---

## How this maps to the judging criteria

- **AI Depth & Use (30%)** — the LLM performs extraction from messy OCR text, trend explanation, and grounded cross-document Q&A, with a deterministic safety layer beneath it so critical decisions are reproducible.
- **Technical Execution (30%)** — complete pipeline from file intake through OCR, extraction, persistence and analysis to a working UI; clean service-layer separation; typed API client; documented endpoints.
- **Originality & Innovation (20%)** — reasons *across* documents using brand→generic resolution, drug-family allergy matching and normalised dose comparison, rather than storing files or matching strings.
- **Usefulness & Impact (10%)** — targets a real and dangerous gap: nobody is checking whether the medicines from two different hospitals are safe together.
- **Presentation & UX (10%)** — one connected timeline, colour-coded severity, plain-language explanations, confidence scores, and disclaimers wherever the AI makes a clinical-sounding statement.

---

## Safety posture

MediGuardian AI never presents itself as a diagnosis. Answers are grounded strictly in uploaded documents; when information isn't there, the assistant says so rather than guessing. Every safety finding carries a recommendation to consult a professional, and confidence scores are surfaced rather than hidden. If OCR is unavailable, the system reports the error instead of substituting placeholder content — it will never invent medical data.
