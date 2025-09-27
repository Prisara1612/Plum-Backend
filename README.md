# Appointment Scheduling Pipeline

Node.js backend for parsing natural language or OCR-derived appointment requests into structured scheduling data with guardrails for ambiguity. The pipeline covers OCR ingestion, entity extraction, normalization to Asia/Kolkata, and a final appointment payload.

## Features
- Text ingestion plus Google Vision REST OCR with confidence scoring and basic noise correction fallbacks.
- Entity extraction via `chrono-node` for temporal phrases and curated department dictionary.
- Date/time normalization with Luxon targeting `Asia/Kolkata`.
- Guardrail responses for low confidence or missing department/time with actionable messages.
- HTTP server exposing `POST /appointments/parse` and CLI demo (`npm start`).
- Deterministic unit tests validating happy-path and guardrail behaviour.


## Configuration
Create a `.env` file (see `.env` scaffolded in the repo) and provide credentials for the OCR provider.

```env
OCR_PROVIDER=google_vision_rest
GOOGLE_VISION_API_KEY=your-real-api-key
# GOOGLE_VISION_API_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
```

The service uses Google Cloud Vision's REST API for OCR when image buffers are supplied. The key requires the Vision API to be enabled in your Google Cloud project.

## Getting Started
```bash
npm install
npm start         # Runs CLI demo showing text + noisy OCR inputs
npm run serve     # Starts HTTP server on :3000
npm test          # Executes node:test specs
```

## Usage
- Text-only: send `{ "text": "Book dentist next Friday at 3pm" }` to `POST /appointments/parse`.
- Local image: run `node scripts/parseImage.js ./path/to/note.jpg` to pipe the image through Google Vision (requires `GOOGLE_VISION_API_KEY`).
- HTTP image upload:
  - Browser/clients can send base64: `{ "imageBase64": "<base64 string>" }`.
  - Provide a publicly accessible `imageUrl` to let the service download and OCR the image server-side.
  - Multipart form (Postman/file input): submit `text`, `imageBase64`, or a file field (e.g. `file`) to `/appointments/parse` with `Content-Type: multipart/form-data`. The first uploaded file is OCR’d.
  - Binary upload: set Postman to **binary** body with `Content-Type: application/octet-stream` (or `image/png`) and send the raw file.

**cURL base64 example**
```bash
IMAGE64=$(base64 -w0 note.jpg 2>/dev/null || base64 note.jpg)
curl -X POST http://localhost:3000/appointments/parse \
  -H 'Content-Type: application/json' \
  -d "{\"imageBase64\":\"$IMAGE64\"}"
```

**Browser fetch snippet**
```js
const file = document.querySelector('input[type=file]').files[0];
const base64 = await file.arrayBuffer().then(buf => btoa(String.fromCharCode(...new Uint8Array(buf))));
const response = await fetch('http://localhost:3000/appointments/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageBase64: base64 })
});
const data = await response.json();
```

Set `OCR_PROVIDER=mock` in `.env` when developing without internet access or API keys.
Uploads are capped at ~5MB per request by default (see `MAX_UPLOAD_BYTES` in `src/server.js`).


### HTTP API
`POST /appointments/parse`
```json
{
  "text": "Book dentist next Friday at 3pm"
}
```
Response:
```json
{
  "status": "ok",
  "appointment": {
    "department": "Dentistry",
    "date": "2025-09-26",
    "time": "15:00",
    "tz": "Asia/Kolkata"
  },
  "intermediates": { /* OCR, entities, normalization trace */ }
}
```

When ambiguity is detected, the service returns:
```json
{
  "status": "needs_clarification",
  "message": "Ambiguous or missing department",
  "context": { "stage": "entity-extraction" }
}
```

## Project Structure
- `src/ocr/ocrService.js` – OCR ingress & provider selection (Google Vision REST or mock fallback)
- `src/entities/entityExtractor.js` – Date/time phrase + department detection
- `src/normalization/normalizer.js` – ISO normalization in Asia/Kolkata
- `src/pipeline/appointmentPipeline.js` – Orchestrates pipeline & guardrails
- `src/server.js` – HTTP wrapper
- `test/pipeline.test.js` – Unit tests

## Extending
- Configure `.env` with credentials for Google Vision or adapt the provider factory to support additional OCR services (AWS Textract, Azure, etc.).
- Expand `DEPARTMENT_CANONICAL_MAP` or plug-in a structured hospital directory.
- Add persistence or calendar integrations after the pipeline returns `status: "ok"`.
