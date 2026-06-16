# Sabit takvim veritabanı

HOLIDAY_DATA = {
    "2026-2027": [
        {
            "name": "1. Dönem Ara Tatili",
            "start": "2026-11-16",
            "end": "2026-11-20"
        },
        {
            "name": "Yarıyıl Tatili",
            "start": "2027-01-25",
            "end": "2027-02-05"
        },
        {
            "name": "2. Dönem Ara Tatili (Ramazan Bayramı dahil)",
            "start": "2027-03-08",
            "end": "2027-03-12"
        },
        {
            "name": "Kurban Bayramı Tatili",
            "start": "2027-05-15",
            "end": "2027-05-19"
        },
        {
            "name": "Cumhuriyet Bayramı",
            "start": "2026-10-28",
            "end": "2026-10-29"
        },
        {
            "name": "Yılbaşı Tatili",
            "start": "2027-01-01",
            "end": "2027-01-01"
        },
        {
            "name": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
            "start": "2027-04-23",
            "end": "2027-04-23"
        },
        {
            "name": "1 Mayıs İşçi Bayramı",
            "start": "2027-05-01",
            "end": "2027-05-01"
        },
        {
            "name": "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",
            "start": "2027-05-19",
            "end": "2027-05-19"
        },
        {
            "name": "15 Temmuz Demokrasi ve Millî Birlik Günü",
            "start": "2027-07-15",
            "end": "2027-07-15"
        },
        {
            "name": "30 Ağustos Zafer Bayramı",
            "start": "2027-08-30",
            "end": "2027-08-30"
        }
    ]
}

def get_holidays_by_year(year: str):
    return HOLIDAY_DATA.get(year, [])
