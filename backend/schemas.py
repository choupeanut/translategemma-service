from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TranslationRequest(BaseModel):
    type: str = Field(default="text", description="Type of content to translate (text, image)")
    source_lang: str = Field(default="en", description="Source language code")
    target_lang: str = Field(default="zh-TW", description="Target language code")
    content: str = Field(..., description="Content to translate")
    image_data: Optional[str] = Field(None, description="Base64 encoded image data if type is image")
    model: str = Field(default="4b", description="Model version to use")

class TranslationResponse(BaseModel):
    translation: str
    model_used: str
    time_taken: float

class GPUStatus(BaseModel):
    available: bool
    device_count: int
    current_device: Optional[int]
    device_name: Optional[str]

class ModelStatus(BaseModel):
    status: str
    model: Optional[str]
    vram_usage: float

class SystemStatus(BaseModel):
    gpu: GPUStatus
    model: ModelStatus
