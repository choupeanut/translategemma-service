# Translate Gemma 功能開發規劃 (Docker + Testing Enhanced)

本文件詳細規劃基於 Google Translate Gemma 模型的本地翻譯服務與前端應用程式，所有服務均容器化並包含完整測試流程。

## 1. 硬體環境評估與模型策略

### 硬體狀態
*   **GPU:** NVIDIA GeForce RTX 3060 (Laptop)
*   **VRAM:** 6GB
*   **CUDA:** 13.0
*   **Host OS:** Linux (支援 Docker + NVIDIA Container Toolkit)

### 模型運行策略 (Finalized)
*   **Model:** `google/translategemma-4b-it`
*   **Quantization:** BitsAndBytes 4-bit (NF4)
*   **Dtype:** `torch.bfloat16` (Critical for stability)

---

## 2. 系統架構 (Dockerized & Streaming)

系統採微服務架構，透過 Docker Compose 編排：

1.  **Backend Service (Container):**
    *   **Protocol:** WebSocket (`/ws/translate`) for real-time streaming.
    *   **Libraries:** `fastapi`, `uvicorn[standard]`, `websockets`, `transformers`, `accelerate`, `bitsandbytes`.
    *   **Concurrency:** Thread-based generation using `TextIteratorStreamer`.
2.  **Frontend Service (Container):**
    *   **Framework:** React 18 + Vite.
    *   **Style:** Tailwind CSS (Responsive Full-height Layout).
    *   **Connection:** Native `WebSocket` API with Smart Proxy Detection.

---

## 3. Backend 開發重點

### 關鍵技術決策
*   **WebSocket vs SSE:** 最終選擇 WebSocket，因其全雙工特性且不受部分 HTTP 中間層 (Proxy/Buffering) 的影響，能確保最穩定的即時性。
*   **Threaded Generation:** 為避免 Python GIL 與 FastAPI Event Loop 阻塞，模型推論 (`model.generate`) 必須在獨立 Thread 中執行，並透過 `Streamer` 將 Token 傳回主執行緒。
*   **Force GPU:** 強制指定 `device_map="cuda:0"`，禁止 `auto` 模式下的 CPU Offloading，確保速度。

### API 設計
*   `WEBSOCKET /ws/translate`: 
    *   Input: JSON `{ "text": "...", "source_lang": "en", ... }`
    *   Output: JSON Stream `{ "chunk": "..." }` -> `{ "done": true }`
*   `GET /api/status`: GPU 狀態與當前模型。

---

## 4. Frontend 開發重點

### UI 設計 (v2.2)
*   **Responsive Layout:** 使用 `flex-col` 與 `flex-grow` 實現滿版高度，適應各種螢幕尺寸。
*   **Language Selection:** 實作完整的語言下拉選單，支援 Source/Target 語言切換。
*   **即時回饋:** 翻譯區域採用 Append 模式更新文字，並提供 Copy 功能。
*   **狀態監控:** 頂部顯示 GPU 型號與即時 VRAM 使用量。

### 網路層
*   **Smart Detection:** 自動偵測 `http/https` 協定與埠號。若處於標準埠 (80/443)，自動切換為同源代理模式 (適合 Nginx Reverse Proxy)。

---

## 5. Docker Compose 整合

`docker-compose.yml` 結構保持不變，但 Backend `Dockerfile` 需確保安裝 `uvicorn[standard]` 與 `websockets`。

---

## 6. 效能優化紀錄

### 歷程
1.  **初始版:** HTTP POST，等待 60s+ 才一次回傳 -> 體驗極差。
2.  **優化版 (Attempt 1):** HTTP SSE，但因 Buffer 問題導致卡頓。
3.  **最終版 (Attempt 2):** WebSocket，成功實現 <1s 首字延遲。

### 參數設定
*   `max_new_tokens`: 2048 (支援長文)
*   `repetition_penalty`: 1.1
*   `do_sample`: False (Greedy Search)

---

## 7. 檔案結構預覽

```
project_root/
├── docker-compose.yml
├── README.md
├── PROGRESS.md
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── model_manager.py
│   ├── requirements.txt
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── lib/
        │   ├── api.ts
        │   └── languages.ts
        └── main.tsx
```