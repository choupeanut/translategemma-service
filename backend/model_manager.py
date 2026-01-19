import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TextIteratorStreamer
from threading import Thread
import gc
import sys

# DEBUG STREAMER
class DebugStreamer(TextIteratorStreamer):
    def put(self, value):
        # Print a dot for every token received to visualize generation
        print(".", end="", flush=True)
        super().put(value)

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.tokenizer = None
            cls._instance.current_model_name = None
            cls._instance.is_loading = False
        return cls._instance

    def load_model(self, model_name="google/translategemma-4b-it", quantize=True):
        if self.is_loading:
            raise RuntimeError("Model is currently loading.")
        
        if self.current_model_name == model_name and self.model is not None:
            return 

        self.is_loading = True
        import os
        token = os.getenv("HF_TOKEN")
        
        try:
            if self.model is not None:
                del self.model
                del self.tokenizer
                torch.cuda.empty_cache()
                gc.collect()

            print(f"Loading model: {model_name}...")
            
            bnb_config = None
            if quantize:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.bfloat16, 
                )

            self.tokenizer = AutoTokenizer.from_pretrained(model_name, token=token)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                quantization_config=bnb_config if quantize else None,
                device_map="cuda:0", 
                torch_dtype=torch.bfloat16,
                token=token,
                attn_implementation="sdpa" 
            )
            
            self.current_model_name = model_name
            print(f"Model {model_name} loaded successfully on GPU.")
            print(f"Memory Footprint: {self.model.get_memory_footprint() / 1024**3:.2f} GB")
            
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e
        finally:
            self.is_loading = False

    def get_status(self):
        if self.model is None:
            return {"status": "not_loaded", "vram_usage": self._get_vram_usage()}
        return {
            "status": "loaded", 
            "model": self.current_model_name, 
            "vram_usage": self._get_vram_usage()
        }

    def _get_vram_usage(self):
        try:
            return torch.cuda.memory_allocated() / 1024**3 
        except:
            return 0

    def stream_translate(self, type: str, source_lang: str, target_lang: str, content: str = None):
        if not self.model:
            self.load_model()
            
        # Prompt Engineering for specific languages
        # Gemma models sometimes default to Simplified Chinese for "zh" or "zh-TW"
        # We explicitly instruct it in the content if needed.
        final_content = content
        final_target_lang = target_lang

        if target_lang == "zh-TW":
            # Append explicit instruction. 
            # Note: Changing target_lang_code to "zh" might be safer if "zh-TW" is not strictly supported by the tokenizer's special tokens,
            # but usually the model handles the text instruction better.
            # Strategy: Keep code as zh-TW (or zh) but add prompt nuance.
            # Experiment shows explicit text instruction works best.
            final_content = f"Translate the following text into Traditional Chinese (繁體中文):\n{content}"
            # Some models prefer standard codes. Let's keep passing zh-TW but rely on the prompt.
        
        if type == "text":
            input_content = [{
                "type": "text",
                "source_lang_code": source_lang,
                "target_lang_code": target_lang,
                "text": final_content
            }]
        else:
            raise NotImplementedError("Image not supported in stream mode yet")

        messages = [{"role": "user", "content": input_content}]
        
        prompt = self.tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        # USE DEBUG STREAMER
        streamer = DebugStreamer(self.tokenizer, skip_prompt=True, skip_special_tokens=True)
        
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=2048,
            do_sample=False,
            num_beams=1,
            repetition_penalty=1.1,
            eos_token_id=[self.tokenizer.eos_token_id, self.tokenizer.convert_tokens_to_ids("<end_of_turn>")]
        )

        print("DEBUG: Starting generation thread...")
        thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
        thread.start()
        
        print("DEBUG: Entering stream loop...")
        for new_text in streamer:
            # print(f"DEBUG: Chunk: {repr(new_text)}")
            yield new_text
        print("\nDEBUG: Stream finished.")

    def translate(self, type: str, source_lang: str, target_lang: str, content: str = None, image_data: str = None):
        generator = self.stream_translate(type, source_lang, target_lang, content)
        return "".join([chunk for chunk in generator])

model_manager = ModelManager()
