# Translate Gemma Functional Specifications (Docker + Testing Enhanced)

This document details the planning for the local translation service based on Google Translate Gemma, fully containerized with testing workflows.

## 1. Hardware Assessment & Strategy

### Hardware Status
*   **GPU:** NVIDIA GeForce RTX 3060 (Laptop)
*   **VRAM:** 6GB
*   **CUDA:** 13.0
*   **Host OS:** Linux (Docker + NVIDIA Container Toolkit supported)

### Model Strategy (Finalized)
*   **Model:** `google/translategemma-4b-it`
*   **Quantization:** BitsAndBytes 4-bit (NF4)
*   **Dtype:** `torch.bfloat16` (Critical for stability)

---

## 2. System Architecture (Dockerized & Streaming)

Microservices architecture orchestrated via Docker Compose:

1.  **Backend Service (Container):**
    *   **Protocol:** WebSocket (`/ws/translate`) for real-time streaming.
    *   **Libraries:** `fastapi`, `uvicorn[standard]`, `websockets`, `transformers`, `accelerate`, `bitsandbytes`.
    *   **Concurrency:** Thread-based generation using `TextIteratorStreamer`.
    *   **Structure:** Follows `fastapi-templates` (dependencies, schemas, lifespan management).
2.  **Frontend Service (Container):**
    *   **Framework:** React 18 + Vite.
    *   **Style:** Tailwind CSS (Responsive Full-height Layout).
    *   **Connection:** Native `WebSocket` API with Smart Proxy Detection.

---

## 3. Backend Development Key Points

### Key Technical Decisions
*   **WebSocket vs SSE:** WebSocket was chosen for its full-duplex nature and resilience against HTTP intermediate buffering (Proxy/Nginx), ensuring stable low-latency streaming.
*   **Threaded Generation:** To avoid blocking Python GIL and FastAPI Event Loop, model inference (`model.generate`) runs in a separate thread, piping tokens back to the main thread via `Streamer`.
*   **Force GPU:** Forced `device_map="cuda:0"` to strictly ban CPU Offloading, preserving performance.

### API Design
*   `WEBSOCKET /ws/translate`: 
    *   Input: JSON `{ "text": "...", "source_lang": "en", ... }`
    *   Output: JSON Stream `{ "chunk": "..." }` -> `{ "done": true }`
*   `GET /api/status`: GPU status and current model info.

---

## 4. Frontend Development Key Points

### UI Design (v2.3)
*   **Responsive Layout:** Uses `flex-col`, `flex-grow`, and `overflow-hidden` to ensure a single-page application feel without body scrollbars.
*   **Language Selection:** Enhanced dropdowns with localized names and ISO codes.
*   **Real-time Feedback:** Append-mode text updates with Copy support.
*   **Monitoring:** Header displays GPU model and VRAM usage.

### Networking
*   **Smart Detection:** Detects `http/https` protocol and ports. If on standard ports (80/443), switches to same-origin proxy mode (ideal for Nginx Reverse Proxy).

---

## 5. Docker Compose Integration

`docker-compose.yml` structure remains standard, ensuring `uvicorn[standard]` and `websockets` are installed in the backend.

---

## 6. Performance Optimization Log

### History
1.  **Initial:** HTTP POST, 60s+ wait time -> Poor UX.
2.  **Optimization (Attempt 1):** HTTP SSE, failed due to buffering issues.
3.  **Final (Attempt 2):** WebSocket, achieved <1s start latency.

### Parameter Tuning
*   `max_new_tokens`: 2048 (Long text support)
*   `repetition_penalty`: 1.1
*   `do_sample`: False (Greedy Search)

---

## 7. File Structure

```
project_root/
├── docker-compose.yml
├── README.md
├── PROGRESS.md
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── model_manager.py
│   ├── schemas.py
│   ├── dependencies.py
│   ├── requirements.txt
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── components/
        │   └── ui/
        ├── hooks/
        │   └── useTranslation.ts
        ├── lib/
        │   └── languages.ts
        └── main.tsx
```