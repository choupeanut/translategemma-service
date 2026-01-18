# Translate Gemma Local Service 🚀

這是一個基於 Google **Translate Gemma 4B** 模型的本地化翻譯服務，專為 **RTX 3060 Laptop (6GB VRAM)** 優化。
它具備 **Docker 容器化**、**WebSocket 即時串流**、以及 **4-bit 量化** 等特性，提供安全、隱私且高效的翻譯體驗。

![Status](https://img.shields.io/badge/Status-Operational-green)
![GPU](https://img.shields.io/badge/GPU-RTX%203060%20Optimized-blue)
![Model](https://img.shields.io/badge/Model-Translate%20Gemma%204B--IT-purple)

## ✨ 核心功能
*   **即時串流 (Streaming):** 透過 WebSocket 技術，翻譯內容逐字跳出，無須等待。
*   **硬體優化:** 
    *   使用 `bitsandbytes` 4-bit 量化，記憶體佔用僅約 **3GB**。
    *   啟用 `bfloat16` 與 `SDPA` 加速，適配 Ampere 架構。
*   **現代化介面:** 基於 React 18 與 Tailwind CSS 打造的簡潔 UI，即時監控 GPU 狀態。
*   **完全本地:** 所有運算皆在本地 GPU 執行，無需聯網 (模型下載後)，保障資料隱私。

## 🛠️ 安裝與啟動

### 前置需求
*   Linux 作業系統 (Ubuntu 22.04+ 推薦)
*   NVIDIA GPU (VRAM >= 4GB)
*   Docker & Docker Compose
*   **NVIDIA Container Toolkit** (必須安裝，否則容器無法存取 GPU)
*   **Hugging Face Token** (需有權限存取 `google/translategemma-4b-it`)

### 快速開始

1.  **設定環境變數**
    建立 `.env` 檔案並填入你的 HF Token：
    ```bash
    HF_TOKEN=hf_xxxxxx
    ```

2.  **啟動服務**
    ```bash
    docker compose up -d
    ```
    *首次啟動後端會自動下載約 9GB 的模型檔案，請耐心等待。*

3.  **訪問介面**
    打開瀏覽器訪問 [http://localhost:5173](http://localhost:5173)

## 🏗️ 系統架構

```mermaid
graph LR
    User[瀏覽器 Frontend] -- WebSocket --> API[FastAPI Backend]
    API -- Threading --> Model[Translate Gemma 4B (GPU)]
    Model -- Token Stream --> API
    API -- JSON Chunk --> User
```

*   **Frontend:** React 18, Vite, Tailwind CSS (Custom UI), Native WebSocket
*   **Backend:** Python 3.10, FastAPI, Uvicorn (Standard), PyTorch, Transformers

## ⚠️ 常見問題排查

**Q: 翻譯一直轉圈圈沒有反應？**
*   檢查後端日誌：`docker compose logs -f backend`
*   如果是第一次執行，可能正在下載模型。
*   如果出現 `WebSocketDisconnect`，請確認瀏覽器無擋廣告插件阻擋 WS 連線。

**Q: 顯示 OOM (Out Of Memory)？**
*   雖然 4B 模型僅需 3GB，但若同時開啟其他 GPU 應用 (如遊戲)，可能導致顯存不足。請關閉其他佔用顯存的程式。

**Q: 為什麼不是 12B 模型？**
*   12B 模型即便在 4-bit 量化下也需要約 8-9GB VRAM，超過了 RTX 3060 (6GB) 的物理極限。若強制執行會觸發 CPU Offloading，導致速度極慢。

## 📜 授權
本專案程式碼基於 MIT License。
模型權重遵循 Google Gemma Terms of Use。
