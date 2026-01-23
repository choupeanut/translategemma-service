import json
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from schemas import TranslationRequest, SystemStatus
from dependencies import get_model_manager
from model_manager import ModelManager

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Lifespan Context Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("System Startup: Pre-loading default model (google/translategemma-4b-it)...")
    manager = get_model_manager()
    try:
        # We assume the manager handles its own threading/loading safety
        manager.load_model("google/translategemma-4b-it")
        logger.info("System Startup: Model pre-loading complete.")
    except Exception as e:
        logger.error(f"System Startup Error: Failed to load model: {e}")
    
    yield
    
    logger.info("System Shutdown: Cleaning up resources...")
    # Add any cleanup logic here (e.g., closing DB connections, unloading models)
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

import torch # Imported here for the shutdown logic reference above

app = FastAPI(
    title="TranslateGemma Service",
    version="2.3.0",
    description="High-performance AI Translation API backed by Gemma-4b-it",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/translate")
async def websocket_translate(
    websocket: WebSocket,
    manager: ModelManager = Depends(get_model_manager)
):
    await websocket.accept()
    logger.info("WebSocket connection established.")
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                # Parse and Validate Request
                request_dict = json.loads(data)
                # Validation using Pydantic
                request_data = TranslationRequest(**request_dict)
            except ValidationError as e:
                await websocket.send_text(json.dumps({"error": "Validation Error", "details": e.errors()}))
                continue
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            if request_data.type != "text":
                await websocket.send_text(json.dumps({"error": "Only text supported in this version"}))
                # We don't close the connection, just report error for this request
                continue

            logger.info(f"Processing translation request: {len(request_data.content)} chars -> {request_data.target_lang}")

            try:
                # Streaming Response
                stream = manager.stream_translate(
                    type=request_data.type,
                    source_lang=request_data.source_lang,
                    target_lang=request_data.target_lang,
                    content=request_data.content
                )

                for chunk in stream:
                    await websocket.send_text(json.dumps({"chunk": chunk}))
                    await asyncio.sleep(0) # Yield control

                await websocket.send_text(json.dumps({"done": True}))
            
            except Exception as e:
                logger.error(f"Translation Error: {e}", exc_info=True)
                await websocket.send_text(json.dumps({"error": str(e)}))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected.")
    except Exception as e:
        logger.error(f"WebSocket Unexpected Error: {e}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

@app.get("/api/status", response_model=SystemStatus)
async def get_status(manager: ModelManager = Depends(get_model_manager)):
    """Get the current status of the GPU and loaded Model."""
    gpu_status = {
        "available": torch.cuda.is_available(),
        "device_count": torch.cuda.device_count(),
        "current_device": torch.cuda.current_device() if torch.cuda.is_available() else None,
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }
    model_status = manager.get_status()
    return {"gpu": gpu_status, "model": model_status}

@app.get("/")
async def root():
    return {"message": "Translate Gemma API is running. Connect to /ws/translate for streaming translations."}