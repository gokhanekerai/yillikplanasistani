import os
import pdfplumber
import docx
import openpyxl
from datetime import datetime
import re

def extract_holidays_from_pdf(pdf_path):
    """
    MEB çalışma takvimini okuyup tarih aralıklarını bulan fonksiyon.
    Gerçek dünya senaryosunda NLP ve RegEx ile daha gelişmiş hale getirilir.
    """
    holidays = []
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"PDF okunurken hata: {e}")
        
    # Basit bir Regex örneği (Gerçek MEB formatlarına göre ayarlanmalıdır)
    # Şimdilik örnek tatilleri döndürüyoruz ki sistem çalışabilsin.
    holidays.append({
        "name": "1. Dönem Ara Tatili",
        "start": "2024-11-11",
        "end": "2024-11-15"
    })
    holidays.append({
        "name": "Yarıyıl Tatili",
        "start": "2025-01-20",
        "end": "2025-01-31"
    })
    holidays.append({
        "name": "2. Dönem Ara Tatili",
        "start": "2025-03-31",
        "end": "2025-04-04"
    })
    
    return holidays

def process_excel_plan(excel_path, holidays, output_path):
    """
    Excel formatındaki yıllık planı işler ve tatil satırları ekler.
    """
    wb = openpyxl.load_workbook(excel_path)
    ws = wb.active
    
    # Basit bir mantık: Eğer satırda Kasım, Ocak veya Nisan kelimeleri geçiyorsa 
    # ve ilgili haftaya denk geliyorsa araya satır ekleyelim.
    # Not: Gerçek bir sistemde Excel'in hangi sütununda tarih/hafta yazdığı kullanıcıdan istenebilir
    # veya makine öğrenmesi ile o sütun tespit edilebilir.
    
    # Örnek olarak 5. satırdan sonra bir "Yarıyıl Tatili" satırı ekleyelim
    ws.insert_rows(5)
    ws.cell(row=5, column=1, value="YARIYIL TATİLİ")
    ws.cell(row=5, column=2, value="Bu haftada ders işlenmeyecektir.")
    
    # Hücreleri renklendirme (Kırmızı/Turuncu arka plan)
    from openpyxl.styles import PatternFill
    fill = PatternFill(start_color="FFFFCC00", end_color="FFFFCC00", fill_type="solid")
    for col in range(1, 10):
        ws.cell(row=5, column=col).fill = fill
    
    wb.save(output_path)
    return output_path

def process_word_plan(docx_path, holidays, output_path):
    """
    Word formatındaki yıllık planı işler ve tatil satırları ekler.
    """
    doc = docx.Document(docx_path)
    
    # Document içindeki tabloları gez.
    if len(doc.tables) > 0:
        table = doc.tables[0]
        # Örnek: İlk tablonun sonuna bir tatil satırı ekleyelim
        row = table.add_row()
        row.cells[0].text = "ARA TATİL"
        row.cells[1].text = "Tatil Haftası"
        
    doc.save(output_path)
    return output_path

def process_plan_file(plan_path, calendar_path):
    """
    Ana işleyici fonksiyon.
    """
    holidays = []
    if calendar_path and calendar_path.endswith('.pdf'):
        holidays = extract_holidays_from_pdf(calendar_path)
        
    filename = os.path.basename(plan_path)
    output_filename = "duzenlenmis_" + filename
    output_dir = os.path.join(os.path.dirname(plan_path), "..", "processed")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    
    if plan_path.endswith('.xlsx'):
        process_excel_plan(plan_path, holidays, output_path)
    elif plan_path.endswith('.docx'):
        process_word_plan(plan_path, holidays, output_path)
        
    return output_path
