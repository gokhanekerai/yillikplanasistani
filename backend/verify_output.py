import openpyxl
import sys

# Windows PowerShell encoding fix
sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook('../processed/duzenlenmis_test_yillik_plan.xlsx')
ws = wb.active
print('TATIL OLARAK ISARETLENEN SATIRLAR:')
holiday_count = 0
for row in ws.iter_rows(min_row=2):
    cell = row[0]
    fill = cell.fill
    if fill and fill.fgColor and fill.fgColor.rgb not in ('00000000', 'FFFFFFFF', 'FF2C3E50', 'FFF8FAFC', 'FFEFF6FF'):
        note_val = row[-1].value if row[-1].value else ''
        # Remove emoji for printing
        note_clean = str(note_val).encode('ascii', errors='replace').decode('ascii')
        week_clean = str(cell.value).encode('ascii', errors='replace').decode('ascii')
        print(f'  Satir {cell.row}: [{week_clean}] -> Renk: {fill.fgColor.rgb} | Not: {note_clean}')
        holiday_count += 1

print(f'\nToplam {holiday_count} tatil haftasi isaretlendi.')
