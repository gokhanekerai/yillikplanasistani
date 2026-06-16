import os
import win32com.client as win32

def convert_xls_to_xlsx(input_path):
    """
    Kullanıcının yüklediği .xls dosyasını Excel COM kullanarak .xlsx formatına dönüştürür.
    Format ve stillerin bozulmamasını sağlar.
    """
    if not input_path.lower().endswith('.xls'):
        return input_path
        
    output_path = input_path + 'x' # .xls -> .xlsx
    
    # Excel COM nesnesini başlat
    try:
        excel = win32.gencache.EnsureDispatch('Excel.Application')
        excel.Visible = False
        excel.DisplayAlerts = False
        
        # Mutlak yol kullanımı şarttır (win32com göreceli yollarda hata verebilir)
        abs_input = os.path.abspath(input_path)
        abs_output = os.path.abspath(output_path)
        
        wb = excel.Workbooks.Open(abs_input)
        wb.SaveAs(abs_output, FileFormat=51) # 51 = xlOpenXMLWorkbook
        wb.Close()
        excel.Application.Quit()
        
        # Orijinal .xls dosyasını sil (isteğe bağlı)
        try:
            os.remove(input_path)
        except:
            pass
            
        return output_path
    except Exception as e:
        print(f"Excel Dönüştürme Hatası: {e}")
        try:
            excel.Application.Quit()
        except:
            pass
        raise e

def convert_doc_to_docx(input_path):
    if not input_path.lower().endswith('.doc'):
        return input_path
        
    output_path = input_path + 'x' # .doc -> .docx
    
    try:
        word = win32.gencache.EnsureDispatch('Word.Application')
        word.Visible = False
        word.DisplayAlerts = 0
        
        abs_input = os.path.abspath(input_path)
        abs_output = os.path.abspath(output_path)
        
        doc = word.Documents.Open(abs_input)
        # 16 = wdFormatXMLDocument (.docx)
        doc.SaveAs2(abs_output, FileFormat=16)
        doc.Close()
        word.Quit()
        
        try:
            os.remove(input_path)
        except:
            pass
            
        return output_path
    except Exception as e:
        print(f"Word Dönüştürme Hatası: {e}")
        try:
            word.Quit()
        except:
            pass
        raise e

