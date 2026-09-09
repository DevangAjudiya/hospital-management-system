from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
print("Loading IndicTrans2 model... (first run downloads weights, be patient)")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, trust_remote_code=True)
ip = IndicProcessor(inference=True)
print("IndicTrans2 model loaded.")

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False

app = FastAPI()

class TranslateRequest(BaseModel):
    text: str
    src_lang: str = "eng_Latn"
    tgt_lang: str = "hin_Deva"

@app.post("/translate")
def translate_text(req: TranslateRequest):
    text = req.text
    if not text:
        return {"translatedText": ""}

    # Try IndicTrans2 model first
    try:
        batch = ip.preprocess_batch([text], src_lang=req.src_lang, tgt_lang=req.tgt_lang)
        if batch is None or len(batch) == 0:
            raise ValueError("preprocess_batch returned None or empty")
        inputs = tokenizer(batch, padding=True, truncation=True, return_tensors="pt")

        with torch.no_grad():
            generated_tokens = model.generate(**inputs, max_length=256, num_beams=1)

        decoded = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
        translations = ip.postprocess_batch(decoded, lang=req.tgt_lang)

        if translations and translations[0]:
            return {"translatedText": translations[0]}
        raise ValueError("postprocess_batch returned empty result")
    except Exception as model_err:
        print(f"[IndicTrans2] model failed: {model_err}, falling back to GoogleTranslator")

    # Fallback: deep_translator GoogleTranslator
    if TRANSLATOR_AVAILABLE:
        try:
            # Map IndicTrans lang codes to Google lang codes
            lang_map = {
                "hin_Deva": "hi", "ben_Beng": "bn", "tam_Taml": "ta",
                "tel_Telu": "te", "mar_Deva": "mr", "guj_Gujr": "gu",
                "kan_Knda": "kn", "mal_Mlym": "ml", "pan_Guru": "pa",
                "urd_Arab": "ur", "eng_Latn": "en"
            }
            tgt = lang_map.get(req.tgt_lang, req.tgt_lang[:2])
            translated = GoogleTranslator(source="auto", target=tgt).translate(text)
            return {"translatedText": translated}
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=f"Both translation methods failed: {fallback_err}")

    raise HTTPException(status_code=500, detail="Translation model failed and no fallback available") 

from gtts import gTTS
from fastapi.responses import StreamingResponse
import io

class TTSRequest(BaseModel):
    text: str
    lang: str = "hi"

@app.post("/tts")
def text_to_speech(req: TTSRequest):
    try:
        if not req.text:
            raise HTTPException(status_code=400, detail="No text provided")
        tts = gTTS(text=req.text, lang=req.lang)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return StreamingResponse(audio_buffer, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)