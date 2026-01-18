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
*   **Protocol:** 透過原生 `WebSocket` API 與後端建立長連接。
*   **UI/UX:**
    *   即時串流顯示 (Typewriter effect)。
    *   版本標記 `(v2.1 WS Only)`。
    *   即時 GPU VRAM 監控。
    *   自適應錯誤處理 (Connection Error / Parsing Error)。

## 🚀 未來維護指引 (Maintenance Guide)

### 1. 模型升級
若未來硬體升級 (如 VRAM > 12GB)，可嘗試切換至 `google/translategemma-12b-it`。需修改 `model_manager.py` 中的預設模型名稱。

### 2. 圖片翻譯擴充
目前架構已預留 Image Input 介面。若要實作，需在 `model_manager.py` 中引入 `PaliGemmaProcessor` 或對應的多模態處理器，並將圖片編碼後傳入模型。

### 3. vLLM 加速
目前的 PyTorch SDPA 已經很快，但若需要極致併發性能 (Concurrent Requests)，建議將後端推論引擎替換為 **vLLM**。

## ⌨️ 常用指令
```bash
# 完整重啟並重建 (確保依賴更新)
docker compose up -d --build

# 即時監控後端生成日誌
docker compose logs -f backend
```
