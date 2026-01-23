# Translate Gemma Development Progress (PROGRESS.md)

## 📌 Current Status
*   **Overall:** ✅ Fully Operational.
*   **Achievement:** Successfully implemented real-time translation using **Translate Gemma 4B** on RTX 3060 Laptop (6GB VRAM).
*   **Optimizations:** 
    *   **Pre-load:** Model loads automatically on startup to eliminate cold start latency.
    *   **Streaming:** Implemented WebSocket full-duplex streaming for **token-by-token** response, resolving long wait times.
    *   **Precision:** Switched to `bfloat16` to fix NaN/Inf errors on Ampere architecture.

## 🛠️ Implementation Details

### Backend (FastAPI + PyTorch)
*   **WebSocket Support:** 
    *   Installed `uvicorn[standard]` and `websockets` libraries.
    *   Added `/ws/translate` endpoint, piping PyTorch generation to WebSocket via `TextIteratorStreamer`.
    *   Used Threading for model generation to prevent blocking the main event loop.
*   **Model Configuration:**
    *   Model: `google/translategemma-4b-it`
    *   Quantization: BitsAndBytes 4-bit (NF4)
    *   Device Map: Forced `cuda:0` to prevent performance drops from CPU Offloading.
    *   Compute Dtype: `torch.bfloat16`
    *   Attention: `sdpa` (Scaled Dot Product Attention) acceleration.
    *   Generation: Greedy Search, Max Tokens 2048.
*   **Refactoring (v2.3):**
    *   Adopted `fastapi-templates` structure.
    *   Separated concerns: `schemas.py`, `dependencies.py`, `model_manager.py`.
    *   Enhanced logging and Pydantic validation.

### Frontend (React + Tailwind)
*   **Protocol:** Uses native `WebSocket` API with **Smart Detection** for Reverse Proxy environments.
*   **UI/UX (v2.3):**
    *   **Layout:** Full-width `max-w-[1800px]` responsive layout without scrollbars (single page app feel).
    *   **Components:** Modularized UI (`components/ui`), custom hooks (`useTranslation`).
    *   **Languages:** Enhanced language selector with localized names and ISO codes (e.g., `繁體中文 (zh-TW)`).
    *   **Monitoring:** Real-time GPU VRAM usage display.

## 🚀 Future Maintenance Guide

### 1. Reverse Proxy & External Access
The system now uses a **Vite Proxy** architecture for robust connectivity:
*   **Unified Origin:** Frontend requests `/api` and `/ws` relative to its own origin.
*   **Internal Proxy:** Vite dev server proxies these requests to `http://backend:8000`.
*   **Allowed Hosts:** Configured `server.allowedHosts: true` to support any domain/IP (Synology, Localhost, etc.).
*   **Benefit:** Eliminates CORS issues, mixed content errors (wss/ws), and complex Nginx configuration. Works out-of-the-box for both local IP (192.168.x.x) and public HTTPS domains.

### 2. Model Upgrades
If hardware is upgraded (VRAM > 12GB), consider switching to `google/translategemma-12b-it`. Update the default model name in `model_manager.py`.

### 3. vLLM Acceleration
PyTorch SDPA is fast, but for extreme concurrency, consider replacing the backend inference engine with **vLLM**.

## ⌨️ Common Commands
```bash
# Full rebuild and restart (ensures dependencies update)
docker compose up -d --build

# Monitor backend logs real-time
docker compose logs -f backend
```