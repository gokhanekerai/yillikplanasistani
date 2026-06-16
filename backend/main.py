from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
from processor import process_plan_file
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
async def process_plan(plan_file: UploadFile = File(...), academic_year: str = Form("2026-2027")):
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
            
    # Dosyaları işle
    output_path = process_plan_file(plan_path, academic_year)
    
    return FileResponse(
        path=output_path, 
        filename=os.path.basename(output_path),
        media_type="application/octet-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
