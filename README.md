# Translate Gemma Local Service 🚀

This is a local translation service based on the Google **Translate Gemma 4B** model, optimized for **RTX 3060 Laptop (6GB VRAM)**.
It features **Docker containerization**, **WebSocket real-time streaming**, and **4-bit quantization**, providing a secure, private, and efficient translation experience.

![Status](https://img.shields.io/badge/Status-Operational-green)
![GPU](https://img.shields.io/badge/GPU-RTX%203060%20Optimized-blue)
![Model](https://img.shields.io/badge/Model-Translate%20Gemma%204B--IT-purple)

## ✨ Core Features
*   **Real-time Streaming:** Token-by-token streaming via WebSocket, eliminating wait times.
*   **Hardware Optimization:** 
    *   Uses `bitsandbytes` 4-bit quantization, requiring only ~3GB VRAM.
    *   Enabled `bfloat16` and `SDPA` (Scaled Dot Product Attention) for Ampere architecture acceleration.
*   **Modern Interface:** Clean UI built with React 18 and Tailwind CSS, featuring real-time GPU monitoring.
*   **Fully Local:** All inference runs on your local GPU. No internet required (after model download), ensuring data privacy.

## 🛠️ Installation & Setup

### Prerequisites
*   Linux OS (Ubuntu 22.04+ recommended)
*   NVIDIA GPU (VRAM >= 4GB)
*   Docker & Docker Compose
*   **NVIDIA Container Toolkit** (Required for GPU access in containers)
*   **Hugging Face Token** (Access permission for `google/translategemma-4b-it` required)

### Quick Start

1.  **Set Environment Variables**
    Create a `.env` file and add your HF Token:
    ```bash
    HF_TOKEN=hf_xxxxxx
    ```

2.  **Start Services**
    ```bash
    docker compose up -d
    ```
    *First run will download approx. 9GB of model files. Please wait.*

3.  **Access Interface**
    Open your browser at [http://localhost:5173](http://localhost:5173)

## 🏗️ System Architecture

```mermaid
graph LR
    User[Browser Frontend] -- WebSocket --> API[FastAPI Backend]
    API -- Threading --> Model[Translate Gemma 4B (GPU)]
    Model -- Token Stream --> API
    API -- JSON Chunk --> User
```

*   **Frontend:** React 18, Vite, Tailwind CSS (Custom UI), Native WebSocket
*   **Backend:** Python 3.10, FastAPI, Uvicorn (Standard), PyTorch, Transformers

## ⚠️ Troubleshooting

**Q: Translation spinner keeps loading with no response?**
*   Check backend logs: `docker compose logs -f backend`
*   If first run, it might be downloading the model.
*   If `WebSocketDisconnect` occurs, check if browser extensions are blocking WS connections.

**Q: OOM (Out Of Memory)?**
*   Although the 4B model uses only 3GB, running other GPU apps (like games) simultaneously might cause OOM. Please close other heavy applications.

**Q: Why not the 12B model?**
*   The 12B model requires 8-9GB VRAM even with 4-bit quantization, exceeding the RTX 3060 (6GB) limit. Forcing it would trigger CPU Offloading, resulting in extremely slow performance.

## 📜 License
Code is based on the MIT License.
Model weights follow the Google Gemma Terms of Use.

## 👨‍💻 Credits
Developed by [Peanut Chou](https://github.com/choupeanut/translategemma-service)