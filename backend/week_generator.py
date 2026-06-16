"""
2026-2027 eğitim öğretim yılı hafta üreticisi.
14 Eylül 2026 (Pazartesi)'den başlayarak haftalık tarih aralıkları üretir.
Her hafta için tatil kesişimi hesaplanır.
"""
from datetime import datetime, timedelta
from holidays import get_holidays_by_year

TURKISH_MONTHS = {
    1: "OCAK", 2: "ŞUBAT", 3: "MART", 4: "NİSAN",
    5: "MAYIS", 6: "HAZİRAN", 7: "TEMMUZ", 8: "AĞUSTOS",
    9: "EYLÜL", 10: "EKİM", 11: "KASIM", 12: "ARALIK"
}


def format_week_label(start: datetime, end: datetime) -> str:
    """'14-18 EYLÜL' veya '28 EYLÜL - 2 EKİM' formatında hafta etiketi üretir."""
    if start.month == end.month:
        return f"{start.day}-{end.day} {TURKISH_MONTHS[start.month]}"
    else:
        return f"{start.day} {TURKISH_MONTHS[start.month]} - {end.day} {TURKISH_MONTHS[end.month]}"


def get_holiday_overlap(week_start: datetime, week_end: datetime, holidays: list) -> dict:
    """
    Bu hafta ile tatillerin kesişimini döndürür.
    
    Returns:
        {
            "is_full": bool,        # Tüm hafta tatil mi?
            "is_partial": bool,     # Kısmi tatil mi?
            "names": [str],         # Tatil isimleri
            "holiday_days": int,    # Tatile denk gelen iş günü sayısı (Pzt-Cum)
        }
    """
    overlapping = []
    for h in holidays:
        try:
            h_start = datetime.strptime(h["start"], "%Y-%m-%d")
            h_end = datetime.strptime(h["end"], "%Y-%m-%d")
        except Exception:
            continue
        if week_start <= h_end and week_end >= h_start:
            overlapping.append((h_start, h_end, h["name"]))

    if not overlapping:
        return {"is_full": False, "is_partial": False, "names": [], "holiday_days": 0}

    # Tatile denk gelen iş günlerini say (Pzt-Cum)
    holiday_days_set = set()
    for h_start, h_end, _ in overlapping:
        current = max(week_start, h_start)
        stop = min(week_end, h_end)
        while current <= stop:
            if current.weekday() < 5:  # Pzt=0 ... Cum=4
                holiday_days_set.add(current.date())
            current += timedelta(days=1)

    # Haftanın tüm iş günleri
    all_work_days = set()
    current = week_start
    while current <= week_end:
        if current.weekday() < 5:
            all_work_days.add(current.date())
        current += timedelta(days=1)

    holiday_days = len(holiday_days_set)
    is_full = holiday_days >= len(all_work_days)
    is_partial = 0 < holiday_days < len(all_work_days)

    names = list(dict.fromkeys(name for _, _, name in overlapping))  # deduplicate, preserve order

    return {
        "is_full": is_full,
        "is_partial": is_partial,
        "names": names,
        "holiday_days": holiday_days,
        "work_days": len(all_work_days),
    }


def generate_weeks(academic_year: str = "2026-2027") -> list[dict]:
    """
    Akademik yılın tüm haftalarını üretir.
    
    Returns list of:
        {
            "label": str,           # "14-18 EYLÜL"
            "start": datetime,
            "end": datetime,
            "is_yariyil": bool,     # Yarıyıl tatili haftası mı?
            "is_full_holiday": bool,
            "is_partial_holiday": bool,
            "holiday_names": [str],
            "holiday_days": int,    # Bu haftadaki tatil gün sayısı
            "work_days": int,       # Normal ders günü (tatil hariç)
        }
    """
    holidays = get_holidays_by_year(academic_year)

    # Yarıyıl tatili tarihlerini bul
    yariyil_start = None
    yariyil_end = None
    for h in holidays:
        if "yarıyıl" in h["name"].lower() or "yari" in h["name"].lower().replace("ı", "i"):
            yariyil_start = datetime.strptime(h["start"], "%Y-%m-%d")
            yariyil_end = datetime.strptime(h["end"], "%Y-%m-%d")
            break

    # Akademik yıl başlangıcı: 14 Eylül 2026 (Pazartesi)
    parts = academic_year.split("-")
    start_year = int(parts[0])
    end_year = int(parts[1])

    # İlk Pazartesi: 14 Eylül start_year
    week_start = datetime(start_year, 9, 14)
    # Öğretim yılı sonu: Haziran sonu
    year_end = datetime(end_year, 6, 27)

    weeks = []
    while week_start <= year_end:
        week_end = week_start + timedelta(days=4)  # Cuma

        # Yarıyıl tatili kontrolü
        is_yariyil = False
        if yariyil_start and yariyil_end:
            # Bu hafta tamamen yarıyıl tatili içinde mi?
            if week_start >= yariyil_start and week_end <= yariyil_end:
                is_yariyil = True
            # Ya da kısmen örtüşüyor mu?
            elif week_start <= yariyil_end and week_end >= yariyil_start:
                is_yariyil = True  # Kısmi yarıyıl tatili de yarıyıl sayılır

        overlap = get_holiday_overlap(week_start, week_end, holidays)

        label = format_week_label(week_start, week_end)

        weeks.append({
            "label": label,
            "start": week_start,
            "end": week_end,
            "is_yariyil": is_yariyil,
            "is_full_holiday": overlap["is_full"],
            "is_partial_holiday": overlap["is_partial"],
            "holiday_names": overlap["names"],
            "holiday_days": overlap.get("holiday_days", 0),
            "work_days": overlap.get("work_days", 5) - overlap.get("holiday_days", 0),
        })

        week_start += timedelta(days=7)

    return weeks


if __name__ == "__main__":
    weeks = generate_weeks("2026-2027")
    print(f"Toplam hafta: {len(weeks)}")
    for w in weeks:
        status = ""
        if w["is_yariyil"]:
            status = "  [YARIYIL TATİLİ]"
        elif w["is_full_holiday"]:
            status = f"  [TAM TATİL: {', '.join(w['holiday_names'])}]"
        elif w["is_partial_holiday"]:
            status = f"  [KISMI TATİL: {', '.join(w['holiday_names'])}]"
        print(f"{w['label']:<32}{status}")
