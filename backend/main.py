from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from ai_extractor import process_file_with_gemini
from generator import create_excel_plan
from converter import convert_xls_to_xlsx, convert_doc_to_docx

app = FastAPI(title="Yıllık Plan Tatil İşaretleyici")

# CORS policy for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"status": "Yıllık Plan API is running"}

@app.post("/api/process-plan")
async def process_plan(
    plan_file: UploadFile = File(...), 
    academic_year: str = Form("2026-2027"),
    plan_title: str = Form(None)
):
    filename = plan_file.filename.lower()
    
    if not filename.endswith(('.docx', '.xlsx', '.doc', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece .docx, .doc, .xlsx, .xls desteklenmektedir.")
        
    plan_path = os.path.join(UPLOAD_DIR, plan_file.filename)
    
    with open(plan_path, "wb") as buffer:
        shutil.copyfileobj(plan_file.file, buffer)
        
    # Eğer format eski ise dönüştür
    if filename.endswith('.xls'):
        plan_path = convert_xls_to_xlsx(plan_path)
    elif filename.endswith('.doc'):
        plan_path = convert_doc_to_docx(plan_path)
            
    try:
        # 1. Gemini ile veriyi JSON'a çek
        json_data = process_file_with_gemini(plan_path)
        
        if not json_data or not isinstance(json_data, list):
            raise ValueError("Yapay zeka veriyi ayıklayamadı. Lütfen geçerli bir yıllık plan yükleyin.")
            
        # 2. Yeni temiz Excel dosyasını üret
        output_filename = "duzenlenmis_" + os.path.splitext(plan_file.filename)[0] + ".xlsx"
        output_path = os.path.join(PROCESSED_DIR, output_filename)
        
        output_path = create_excel_plan(
            json_data=json_data,
            academic_year=academic_year,
            custom_title=plan_title,
            output_path=output_path
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return FileResponse(
        path=output_path, 
        filename=os.path.basename(output_path),
        media_type="application/octet-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
