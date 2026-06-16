"""
Debug: parse_week_cell fonksiyonunu tüm haftalar için test et
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from processor import parse_week_cell, find_overlapping_holidays
from holidays import get_holidays_by_year

academic_year = "2026-2027"
holidays = get_holidays_by_year(academic_year)

test_weeks = [
    "14-18 EYLUL",
    "26-30 EKIM",    # Cumhuriyet Bayramı
    "16-20 KASIM",   # Ara Tatil
    "28 ARALIK - 1 OCAK",  # Yılbaşı
    "19-23 NISAN",   # 23 Nisan
    "17-21 MAYIS",   # Kurban + 19 Mayıs
    "8-12 MART",     # 2. Dönem Ara Tatil
    # Türkçe aksan variantları
    "26-30 EK\u0130M",   # İ ile
    "16-20 KASIM",
    "19-23 N\u0130SAN",  # İ ile NİSAN
]

print("PARSE TEST SONUCLARI:")
for w in test_weeks:
    result = parse_week_cell(w, academic_year)
    if result:
        start, end = result
        overlapping = find_overlapping_holidays(start, end, holidays)
        ov_names = [h["name"] for h in overlapping]
        print(f"  '{w}' -> {start.date()} - {end.date()} | Tatil: {ov_names or 'YOK'}")
    else:
        print(f"  '{w}' -> PARSE EDILEMEDI")
