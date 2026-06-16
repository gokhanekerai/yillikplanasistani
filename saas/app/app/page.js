"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Upload, FileSpreadsheet, Download, Settings, ChevronRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";

const TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

export default function AppPage() {
  const [schedule, setSchedule] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [status, setStatus] = useState("idle"); // idle, processing, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  // Sabit MEB 2026-2027 Takvimi
  const mebCalendar = {
    schoolStart: new Date(2026, 8, 14), // 14 Eylül 2026 (Aylar 0 indexli, 8=Eylül)
    schoolEnd: new Date(2027, 5, 20),   // 20 Haziran 2027
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
  };

  const handleScheduleChange = (day, value) => {
    setSchedule(prev => ({ ...prev, [day]: parseInt(value) || 0 }));
  };

  const isDateHoliday = (dateObj) => {
    const time = dateObj.getTime();
    for (let h of mebCalendar.holidays) {
      if (time >= h.start.getTime() && time <= h.end.getTime()) {
        return h.name;
      }
    }
    return null;
  };

  const generateSchoolCalendar = () => {
    const weeks = [];
    let currentMonday = new Date(mebCalendar.schoolStart);
    currentMonday.setHours(12, 0, 0, 0);
    
    // Günü pazartesiye çek
    const dayOfWeek = currentMonday.getDay();
    const diff = currentMonday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentMonday.setDate(diff);

    let weekNumber = 1;
    
    for (let i = 0; i < 55; i++) {
      if (currentMonday > mebCalendar.schoolEnd) break;

      let weekInfo = {
        days: [],
        hasNormalClass: false
      };

      for (let d = 1; d <= 5; d++) {
        const dailyHours = schedule[d];
        if (dailyHours > 0) {
          let checkDate = new Date(currentMonday);
          checkDate.setDate(currentMonday.getDate() + (d - 1));
          checkDate.setHours(12, 0, 0, 0);
          
          let dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);

          if (dayStart < mebCalendar.schoolStart) continue; 
          if (dayStart > mebCalendar.schoolEnd) continue;

          let holidayName = isDateHoliday(checkDate);
          let dateStr = String(checkDate.getDate()).padStart(2, '0') + "." +
                        String(checkDate.getMonth() + 1).padStart(2, '0') + "." +
                        checkDate.getFullYear();
          let monthStr = TURKISH_MONTHS[checkDate.getMonth()];

          if (holidayName) {
            weekInfo.days.push({
              dateStr: dateStr, monthStr: monthStr, hours: dailyHours, isHoliday: true, holidayName: holidayName
            });
          } else {
            weekInfo.days.push({
              dateStr: dateStr, monthStr: monthStr, hours: dailyHours, isHoliday: false, holidayName: ""
            });
            weekInfo.hasNormalClass = true; 
          }
        }
      }

      if (weekInfo.days.length > 0) {
        weeks.push(weekInfo);
        weekNumber++;
      }
      currentMonday.setDate(currentMonday.getDate() + 7);
    }
    return weeks;
  };

  const processFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const totalWeeklyHours = Object.values(schedule).reduce((a, b) => a + b, 0);
    if (totalWeeklyHours === 0) {
      setErrorMessage("Lütfen en az bir güne ders saati giriniz.");
      setStatus("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    try {
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 1. Yeni Takvimi Üret
          const newWeeks = generateSchoolCalendar();
          
          // 2. Eski Excel satırlarını al (A-I sütunları 1'den başlar)
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          let contentRows = [];
          
          for (let R = 3; R <= range.e.r; ++R) { // Satır 4'ten başla (0-index = 3)
            // C sütunu "Hafta" kontrolü
            let weekCellAddr = {c: 2, r: R}; // C sütunu (0=A, 1=B, 2=C)
            let weekCell = worksheet[XLSX.utils.encode_cell(weekCellAddr)];
            let val = weekCell ? weekCell.v : undefined;
            
            // Eğer "TATİL" içeriyorsa bu eski tatil satırıdır, atla.
            let isTatil = false;
            for(let c = 0; c <= range.e.c; c++) {
              let cell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
              if(cell && cell.v && String(cell.v).toUpperCase().includes("TATİL")) {
                isTatil = true; break;
              }
            }
            
            if (isTatil) continue;
            
            // Eğer "Bu plan", "UYGUNDUR", "MÜDÜR" vs içeriyorsa imza satırıdır, sakla ama içerik değil
            let isFooter = false;
            for(let c = 0; c <= range.e.c; c++) {
              let cell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
              if(cell && cell.v) {
                const strV = String(cell.v).toUpperCase();
                if(strV.includes("2551") || strV.includes("UYGUNDUR") || strV.includes("MÜDÜR") || strV.includes("ÖĞRETMEN")) {
                  isFooter = true; break;
                }
              }
            }
            if (isFooter) continue; // Şimdilik footer'ı atlıyoruz, en sona ekleyebiliriz.

            // Eğer kazanım vs. varsa bu bir içerik satırıdır
            let eCell = worksheet[XLSX.utils.encode_cell({c: 4, r: R})]; // E sütunu: Kazanım
            let fCell = worksheet[XLSX.utils.encode_cell({c: 5, r: R})]; // F sütunu: Konu
            if (eCell && eCell.v || fCell && fCell.v) {
              // Satır kopyasını al (stil ve veri)
              let rowData = {};
              for(let c = 0; c <= range.e.c; c++) {
                let oldCell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
                if(oldCell) rowData[c] = { v: oldCell.v, s: oldCell.s, t: oldCell.t };
              }
              contentRows.push(rowData);
            }
          }

          // 3. Yeni Excel Sayfasını Oluştur (Stilleri Koruyarak)
          const newWs = {};
          newWs['!merges'] = [];
          newWs['!cols'] = worksheet['!cols'] || []; // Sütun genişlikleri

          // Başlık satırlarını kopyala (İlk 3 satır: 0,1,2)
          for (let R = 0; R <= 3; ++R) {
            for (let C = 0; C <= range.e.c; ++C) {
              let oldCell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
              if (oldCell) {
                // Eğer başlık satırında 2023-2024 varsa değiştir
                let newV = oldCell.v;
                if(typeof newV === 'string' && newV.includes("EĞİTİM ÖĞRETİM YILI")) {
                  newV = "2026 - 2027 EĞİTİM ÖĞRETİM YILI";
                }
                newWs[XLSX.utils.encode_cell({c: C, r: R})] = { v: newV, s: oldCell.s, t: oldCell.t };
              }
            }
          }
          // Merge'leri de kopyala (başlık için)
          if(worksheet['!merges']) {
            for(let m of worksheet['!merges']) {
              if(m.s.r <= 3) newWs['!merges'].push(m);
            }
          }

          let currentRowIdx = 4; // 5. satırdan başla (0-index)
          let contentIdx = 0;

          // Haftaları yazdır
          for (let i = 0; i < newWeeks.length; i++) {
            const week = newWeeks[i];
            
            // Hafta tarih metni
            let firstDay = week.days[0];
            let lastDay = week.days[week.days.length - 1];
            let dateText = "";
            if (firstDay.monthStr === lastDay.monthStr) {
                dateText = `${firstDay.dateStr.split('.')[0]}-${lastDay.dateStr.split('.')[0]} ${firstDay.monthStr}`;
            } else {
                dateText = `${firstDay.dateStr.split('.')[0]} ${firstDay.monthStr} - ${lastDay.dateStr.split('.')[0]} ${lastDay.monthStr}`;
            }

            let weekHours = week.days.filter(d => !d.isHoliday).reduce((sum, d) => sum + d.hours, 0);
            
            // Tamamen tatil olan haftalar
            if (!week.hasNormalClass) {
              const hNames = [...new Set(week.days.filter(d => d.isHoliday).map(d => d.holidayName))].join(" / ");
              
              for (let c = 0; c <= range.e.c; ++c) {
                let cellAddr = XLSX.utils.encode_cell({c: c, r: currentRowIdx});
                let style = { 
                  fill: { fgColor: { rgb: "FFFF6B6B" } }, // Kırmızı arka plan
                  font: { bold: true, color: { rgb: "FFFFFFFF" } },
                  alignment: { horizontal: "center", vertical: "center" }
                };
                
                if (c === 1) newWs[cellAddr] = { v: hNames, t: 's', s: style }; // B sütununa yaz
                else newWs[cellAddr] = { v: "", t: 's', s: style };
              }
              // Merge tatil satırı
              newWs['!merges'].push({ s: { r: currentRowIdx, c: 1 }, e: { r: currentRowIdx, c: range.e.c } });
              currentRowIdx++;
              continue; // Bu hafta için içerik yazma
            }

            // Normal hafta
            let rowContent = contentRows[contentIdx];
            if (!rowContent) {
              // İçerik bitti, boş satır koy
              rowContent = {};
            } else {
              contentIdx++;
            }

            for (let c = 0; c <= range.e.c; ++c) {
              let cellAddr = XLSX.utils.encode_cell({c: c, r: currentRowIdx});
              let cellObj = rowContent[c] ? { ...rowContent[c] } : { v: "", t: 's' };

              // A (0) Sıra
              if (c === 0) cellObj.v = (i + 1);
              // B (1) Ay
              if (c === 1) cellObj.v = lastDay.monthStr;
              // C (2) Hafta
              if (c === 2) cellObj.v = dateText;
              // D (3) Ders saati
              if (c === 3) cellObj.v = weekHours;

              // Eğer bu haftada kısmi tatil varsa, Açıklama (I = 8) kısmına ekle
              if (c === 8) {
                const holidays = [...new Set(week.days.filter(d => d.isHoliday).map(d => d.holidayName))];
                if (holidays.length > 0) {
                  let existing = cellObj.v || "";
                  cellObj.v = existing + (existing ? "\n" : "") + "🎉 " + holidays.join(" / ");
                  if(!cellObj.s) cellObj.s = {};
                  cellObj.s.fill = { fgColor: { rgb: "FFFFD93D" } }; // Sarı
                  cellObj.s.font = { bold: true, color: { rgb: "FF333333" } };
                }
              }
              
              newWs[cellAddr] = cellObj;
            }
            currentRowIdx++;
          }

          newWs['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: range.e.c, r: currentRowIdx } });

          const newWb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(newWb, newWs, "Yıllık Plan");

          const excelBuffer = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          let filenameParts = file.name.split(".");
          filenameParts.pop();
          link.download = `2026_2027_${filenameParts.join(".")}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          setStatus("success");
        } catch (err) {
          console.error(err);
          setErrorMessage("Excel işlenirken bir hata oluştu: " + err.message);
          setStatus("error");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setErrorMessage("Dosya okunamadı: " + err.message);
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">Y</div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Yıllık Plan Asistanı</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium">
            <FileSpreadsheet className="w-5 h-5" />
            Yıllık Plan Üret
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Ayarlar
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header (Mobile & Desktop) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 shrink-0">
          <Link href="/" className="md:hidden flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">Y</div>
          </Link>
          <div className="flex items-center text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-slate-900">Yıllık Plan Üret</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">1</span>
                    Haftalık Ders Programı
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Dersinizin haftalık günlere dağılımını girin.</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { id: 1, name: "Pazartesi" }, { id: 2, name: "Salı" }, 
                  { id: 3, name: "Çarşamba" }, { id: 4, name: "Perşembe" }, { id: 5, name: "Cuma" }
                ].map(day => (
                  <div key={day.id} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">{day.name}</label>
                    <input 
                      type="number" 
                      min="0" max="10"
                      value={schedule[day.id]}
                      onChange={(e) => handleScheduleChange(day.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white text-center text-lg font-semibold"
                    />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 flex items-center justify-between">
                <span>Haftalık Toplam Ders Saati:</span>
                <span className="font-bold text-indigo-700 text-lg">
                  {Object.values(schedule).reduce((a, b) => a + b, 0)} Saat
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">2</span>
                    Eski Planı Yükle & Üret
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Eski yıl planınızı seçtiğiniz an 2026-2027 planı üretilecektir.</p>
                </div>
                <div className="hidden sm:block">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold ring-1 ring-inset ring-green-600/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    2026-2027 MEB Takvimi Hazır
                  </span>
                </div>
              </div>
              
              <div className="p-8">
                <label 
                  htmlFor="excelUpload" 
                  className={`
                    relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${status === 'error' ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300'}
                  `}
                >
                  <input 
                    id="excelUpload" 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx,.xls" 
                    className="hidden" 
                    onChange={processFile}
                    disabled={status === 'processing'}
                  />
                  
                  {status === 'processing' ? (
                    <div className="flex flex-col items-center text-indigo-600">
                      <Loader2 className="w-10 h-10 animate-spin mb-3" />
                      <span className="font-medium">Plan Üretiliyor...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4 group-hover:scale-110 transition-transform group-hover:border-indigo-200 group-hover:bg-indigo-100">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <p className="text-base font-semibold mb-1">Excel dosyasını seçmek için tıklayın</p>
                      <p className="text-xs text-slate-400">Sadece .xlsx ve .xls dosyaları</p>
                    </div>
                  )}
                </label>

                {status === 'error' && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                    {errorMessage}
                  </div>
                )}
                {status === 'success' && (
                  <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Yeni yıllık planınız başarıyla oluşturuldu ve indirildi!
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
