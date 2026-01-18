from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from model_manager import model_manager
import torch
import json
import asyncio

app = FastAPI()

# Pre-load model on startup
@app.on_event("startup")
async def startup_event():
    print("System Startup: Pre-loading default model (google/translategemma-4b-it)...")
    try:
        model_manager.load_model("google/translategemma-4b-it")
        print("System Startup: Model pre-loading complete.")
    except Exception as e:
        print(f"System Startup Error: Failed to load model: {e}")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    type: str 
    source_lang: str
    target_lang: str
    content: str = None
    image_data: str = None
    model: str = "4b"

@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        # Extract params
        source_lang = request_data.get("source_lang", "en")
        target_lang = request_data.get("target_lang", "zh-TW")
        content = request_data.get("content", "")
        type_ = request_data.get("type", "text")
        
        print(f"DEBUG: WebSocket request received. Content length: {len(content)}")

        if type_ != "text":
             await websocket.send_text(json.dumps({"error": "Only text supported"}))
             await websocket.close()
             return

        # Use the synchronous generator in a thread is handled by TextIteratorStreamer
        # We just iterate the streamer
        stream = model_manager.stream_translate(
            type=type_,
            source_lang=source_lang,
            target_lang=target_lang,
            content=content
        )
        
        for chunk in stream:
            # Send raw chunk directly
            await websocket.send_text(json.dumps({"chunk": chunk}))
            await asyncio.sleep(0) # Yield

        await websocket.send_text(json.dumps({"done": True}))
        await websocket.close()

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
            await websocket.close()
        except:
            pass

# DELETED: Keep REST endpoints for compatibility
# @app.post("/api/translate")
# async def translate(request: TranslationRequest):
#     try:
#         import time
#         start_time = time.time()
#         result = model_manager.translate(
#             type=request.type,
#             source_lang=request.source_lang,
#             target_lang=request.target_lang,
#             content=request.content,
#             image_data=request.image_data
#         )
#         end_time = time.time()
#         return {
#             "translation": result,
#             "model_used": model_manager.current_model_name,
#             "time_taken": end_time - start_time
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def get_status():
    gpu_status = {
        "available": torch.cuda.is_available(),
        "device_count": torch.cuda.device_count(),
        "current_device": torch.cuda.current_device() if torch.cuda.is_available() else None,
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }
    model_status = model_manager.get_status()
    return {"gpu": gpu_status, "model": model_status}

@app.get("/")
async def root():
    return {"message": "Translate Gemma API is running"}
