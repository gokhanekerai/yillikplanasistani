// Sabit MEB Akademik Takvimleri ve Resmi Tatiller Veritabanı

export const HOLIDAY_DATA = {
  "2026-2027": {
    schoolStart: new Date(2026, 8, 14), // 14 Eylül 2026 (Aylar 0 indexli, 8=Eylül)
    schoolEnd: new Date(2027, 5, 25),   // 25 Haziran 2027 (MEB Takvimine göre Cuma günü son)
    holidays: [
      { name: "1. Dönem Ara Tatili", start: new Date(2026, 10, 16), end: new Date(2026, 10, 20) }, // 16-20 Kasım 2026
      { name: "Yarıyıl Tatili", start: new Date(2027, 0, 25), end: new Date(2027, 1, 5) }, // 25 Ocak - 5 Şubat 2027
      { name: "2. Dönem Ara Tatili (Ramazan Bayramı dahil)", start: new Date(2027, 2, 8), end: new Date(2027, 2, 12) }, // 8-12 Mart 2027
      { name: "Cumhuriyet Bayramı", start: new Date(2026, 9, 28), end: new Date(2026, 9, 29) },
      { name: "Yılbaşı Tatili", start: new Date(2027, 0, 1), end: new Date(2027, 0, 1) },
      { name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", start: new Date(2027, 3, 23), end: new Date(2027, 3, 23) },
      { name: "1 Mayıs İşçi Bayramı", start: new Date(2027, 4, 1), end: new Date(2027, 4, 1) },
      { name: "Kurban Bayramı Tatili", start: new Date(2027, 4, 15), end: new Date(2027, 4, 19) }, // 15-19 Mayıs 2027
      { name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı", start: new Date(2027, 4, 19), end: new Date(2027, 4, 19) }
    ]
  },
  "2027-2028": {
    schoolStart: new Date(2027, 8, 13), // 13 Eylül 2027 (Pazartesi)
    schoolEnd: new Date(2028, 5, 23),   // 23 Haziran 2028 (Cuma)
    holidays: [
      { name: "1. Dönem Ara Tatili", start: new Date(2027, 10, 15), end: new Date(2027, 10, 19) }, // 15-19 Kasım 2027
      { name: "Yarıyıl Tatili", start: new Date(2028, 0, 24), end: new Date(2028, 1, 4) }, // 24 Ocak - 4 Şubat 2028
      { name: "2. Dönem Ara Tatili (Ramazan Bayramı dahil)", start: new Date(2028, 3, 17), end: new Date(2028, 3, 21) }, // 17-21 Nisan 2028
      { name: "Cumhuriyet Bayramı", start: new Date(2027, 9, 29), end: new Date(2027, 9, 29) },
      { name: "Yılbaşı Tatili", start: new Date(2028, 0, 1), end: new Date(2028, 0, 1) },
      { name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", start: new Date(2028, 3, 23), end: new Date(2028, 3, 23) },
      { name: "1 Mayıs İşçi Bayramı", start: new Date(2028, 4, 1), end: new Date(2028, 4, 1) },
      { name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı", start: new Date(2028, 4, 19), end: new Date(2028, 4, 19) },
      { name: "Kurban Bayramı Tatili", start: new Date(2028, 5, 4), end: new Date(2028, 5, 8) } // 4-8 Haziran 2028
    ]
  }
};

export function getCalendarForYear(year) {
  return HOLIDAY_DATA[year] || HOLIDAY_DATA["2026-2027"];
}
