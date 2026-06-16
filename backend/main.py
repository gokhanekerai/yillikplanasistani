from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil

app = FastAPI(title="Yıllık Plan Tatil İşaretleyici")

# CORS policy for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
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
async def process_plan(plan_file: UploadFile = File(...), calendar_file: UploadFile = File(None)):
    if not plan_file.filename.endswith(('.docx', '.xlsx')):
        raise HTTPException(status_code=400, detail="Sadece .docx ve .xlsx desteklenmektedir.")
        
    plan_path = os.path.join(UPLOAD_DIR, plan_file.filename)
    
    with open(plan_path, "wb") as buffer:
        shutil.copyfileobj(plan_file.file, buffer)
        
    calendar_path = None
    if calendar_file:
        calendar_path = os.path.join(UPLOAD_DIR, f"calendar_{calendar_file.filename}")
        with open(calendar_path, "wb") as buffer:
            shutil.copyfileobj(calendar_file.file, buffer)
            
    # TODO: Process the files and generate the output
    
    return {"message": "Dosyalar yüklendi ve işleniyor (Stub)", "plan": plan_file.filename}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
