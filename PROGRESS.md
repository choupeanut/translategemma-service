# Translate Gemma 專案開發進度報告 (PROGRESS.md)

## 📌 專案當前狀態 (Current Status)
*   **整體狀態:** ✅ 完美運作 (Fully Operational)。
*   **核心成就:** 成功在 RTX 3060 Laptop (6GB VRAM) 上實現 **Translate Gemma 4B** 模型的即時翻譯。
*   **效能優化:** 
    *   **Pre-load:** 服務啟動時自動預載入模型，消除首次請求等待。
    *   **Streaming:** 導入 WebSocket 全雙工串流，實現**逐字即時回傳**，解決了長文翻譯的等待焦慮。
    *   **Precision:** 使用 `bfloat16` 運算精度，完美解決 Ampere 架構下的 NaN/Inf 錯誤。

## 🛠️ 技術實作細節 (Implementation Details)

### Backend (FastAPI + PyTorch)
*   **WebSocket Support:** 
    *   安裝 `uvicorn[standard]` 與 `websockets` 庫。
    *   新增 `/ws/translate` 端點，透過 `TextIteratorStreamer` 將 PyTorch 生成過程導入 WebSocket 通道。
    *   採用 Threading 處理模型生成，避免阻塞主執行緒。
*   **Model Configuration:**
    *   Model: `google/translategemma-4b-it`
    *   Quantization: BitsAndBytes 4-bit (NF4)
    *   Device Map: 強制 `cuda:0`，杜絕 CPU Offloading 導致的效能崩盤。
    *   Compute Dtype: `torch.bfloat16`
    *   Attention: `sdpa` (Scaled Dot Product Attention) 加速。
    *   Generation: Greedy Search, Max Tokens 2048。

### Frontend (React + Tailwind)
*   **Protocol:** 透過原生 `WebSocket` API 與後端建立長連接，支援**智慧自動偵測**反向代理 (Reverse Proxy) 環境。
*   **UI/UX (v2.2):**
    *   **Responsive Layout:** 採用 `h-screen` 滿版設計，輸入/輸出框自動填滿剩餘空間。
    *   **Language Selector:** 支援雙向語言選擇，顯示格式為 `Native Name (Code)`。
    *   **Controls:** 中央懸浮翻譯按鈕，輸出框支援一鍵複製。
    *   **Monitoring:** 頂部 Header 即時顯示 GPU VRAM 使用量。

## 🚀 未來維護指引 (Maintenance Guide)

### 1. 反向代理與外部存取 (Reverse Proxy / Domain)
本系統已支援「智慧自動偵測」，若要透過 `https://domain.com` 部署（方案 B）：
*   **Nginx 設定**: 
    *   將 `/` 代理至前端 (5173)。
    *   將 `/api/` 代理至後端 (8002)。
    *   將 `/ws/` 代理至後端 (8002)，並開啟 WebSocket 支援 (Upgrade header)。
*   **自動偵測**: 當網址不帶埠號時，前端會自動切換為「同源模式」，不再請求 `:8002`，實現完美的單一入口存取。

### 2. 模型升級
若未來硬體升級 (如 VRAM > 12GB)，可嘗試切換至 `google/translategemma-12b-it`。需修改 `model_manager.py` 中的預設模型名稱。

### 3. vLLM 加速
目前的 PyTorch SDPA 已經很快，但若需要極致併發性能 (Concurrent Requests)，建議將後端推論引擎替換為 **vLLM**。

## ⌨️ 常用指令
```bash
# 完整重啟並重建 (確保依賴更新)
docker compose up -d --build

# 即時監控後端生成日誌
docker compose logs -f backend
```