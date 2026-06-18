"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Upload, FileSpreadsheet, Download, Settings, ChevronRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import * as mammoth from "mammoth";
import { getCalendarForYear, getAvailableYears } from "../../lib/holidays";

const TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

export default function AppPage() {
  const [weeklyHours, setWeeklyHours] = useState("");
  const [availableYears, setAvailableYears] = useState(getAvailableYears());
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || "2026-2027");
  const [planTitle, setPlanTitle] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [status, setStatus] = useState("idle"); // idle, processing, preview, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAvailableYears(getAvailableYears());
  }, []);

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Dinamik MEB Takvimi
  const mebCalendar = getCalendarForYear(selectedYear);

  const isDateHoliday = (dateObj) => {
    // Saat ve zaman dilimi farklarını sıfırlamak için sadece yıl-ay-gün üzerinden karşılaştırma yapıyoruz
    const checkDateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const checkTime = checkDateOnly.getTime();
    
    for (let h of mebCalendar.holidays) {
      const sDate = new Date(h.start.getFullYear(), h.start.getMonth(), h.start.getDate());
      const eDate = new Date(h.end.getFullYear(), h.end.getMonth(), h.end.getDate());
      if (checkTime >= sDate.getTime() && checkTime <= eDate.getTime()) {
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
        let checkDate = new Date(currentMonday);
        checkDate.setDate(currentMonday.getDate() + (d - 1));
        checkDate.setHours(12, 0, 0, 0);
        
        let dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);

        let sStart = new Date(mebCalendar.schoolStart);
        sStart.setHours(0, 0, 0, 0);
        let sEnd = new Date(mebCalendar.schoolEnd);
        sEnd.setHours(23, 59, 59, 999);

        if (dayStart < sStart) continue; 
        if (dayStart > sEnd) continue;

        let holidayName = isDateHoliday(checkDate);
        let dateStr = String(checkDate.getDate()).padStart(2, '0') + "." +
                      String(checkDate.getMonth() + 1).padStart(2, '0') + "." +
                      checkDate.getFullYear();
        let monthStr = TURKISH_MONTHS[checkDate.getMonth()];

        if (holidayName) {
          weekInfo.days.push({
            dateStr: dateStr, monthStr: monthStr, isHoliday: true, holidayName: holidayName
          });
        } else {
          weekInfo.days.push({
            dateStr: dateStr, monthStr: monthStr, isHoliday: false, holidayName: ""
          });
          weekInfo.hasNormalClass = true; 
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

  const cleanAçıklamaText = (text) => {
    if (typeof text !== 'string') return "";
    
    // Sınıf içi araç gereçlerin temizlenmesi
    const materialsKeywords = [
      "tahta kalemi", "silgi", "kitap", "ders kitabı", "defter", "bilgisayar", "projeksiyon", 
      "akıllı tahta", "internet", "slayt", "sunu", "etkileşimli tahta", "pdf", "e-içerik", 
      "eba", "ogm materyal", "kaynak", "materyal", "araç", "gereç", "video", "görsel",
      "whiteboard", "marker", "eraser", "computer", "projector", "smart board", "presentation",
      "kalem", "öğretmen kılavuzu", "kılavuz kitap", "hoparlör", "yazıcı", "tablet", "kâğıt",
      "karton", "yapıştırıcı", "makas", "pano", "çalışma yaprağı", "fotokopi", "resim",
      "fotoğraf", "afiş", "broşür", "etkinlik kağıdı"
    ];
    
    const lines = text.split('\n');
    const cleanedLines = lines.filter(line => {
      const lowerLine = line.toLowerCase().trim();
      if (lowerLine === "") return false;
      
      const containsMaterial = materialsKeywords.some(kw => lowerLine.includes(kw));
      if (containsMaterial) {
        // İstisnalar: Belirli gün ve haftalar, yazılı sınavlar, Atatürkçülük konuları vb.
        const exceptions = [
          "sınav", "yazılı", "bayram", "atatürk", "belirli", "hafta", "gün", 
          "1. dönem", "2. dönem", "millî", "milli", "cumhuriyet", "kurtuluş", 
          "kazanım", "konu", "gezi", "gözlem", "deney"
        ];
        const hasException = exceptions.some(exc => lowerLine.includes(exc));
        if (hasException) {
          return true;
        }
        return false; // Araç-gereç listesiyse temizle
      }
      return true;
    });
    
    return cleanedLines.join('\n');
  };

  const processFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc');
    const isPdf = fileName.endsWith('.pdf');
    const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

    if (!isExcel && !isWord && !isPdf && !isImage) {
      setErrorMessage("Lütfen sadece Excel (.xlsx, .xls), Word (.docx, .doc), PDF (.pdf) veya Görsel (.png, .jpg, .jpeg) yükleyiniz.");
      setStatus("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!weeklyHours || parseInt(weeklyHours) <= 0) {
      setErrorMessage("Lütfen geçerli bir haftalık ders saati giriniz.");
      setStatus("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStatus("processing");
    setErrorMessage("");
    setProcessingStep("Dosya okunuyor...");

    try {
      // 1. PDF, GÖRSEL VE ESKİ WORD DOSYALARI (Base64 -> Gemini Multimodal OCR)
      if (isPdf || isImage || (isWord && !fileName.endsWith('.docx'))) {
        setProcessingStep(isPdf ? "PDF belgesi çözümleniyor..." : isImage ? "Görsel çözümleniyor..." : "Belge çözümleniyor...");
        
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64Str = reader.result.split(',')[1];
            resolve(base64Str);
          };
          reader.onerror = error => reject(error);
        });

        const base64Data = await fileToBase64(file);
        let mimeType = file.type;
        if (!mimeType) {
          if (isPdf) mimeType = "application/pdf";
          else if (fileName.endsWith('.png')) mimeType = "image/png";
          else mimeType = "image/jpeg";
        }

        setProcessingStep("Yapay zeka analizi başlatılıyor (Bu işlem dosya boyutuna göre 15-30 sn sürebilir)...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        let aiResponse;
        try {
          aiResponse = await fetch("/api/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileBase64: base64Data, mimeType: mimeType }),
              signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            throw new Error("Yapay zeka yanıt verme süresi aşıldı (Zaman Aşımı).");
          }
          throw fetchErr;
        }

        setProcessingStep("Yapay zeka yanıtı işleniyor...");
        if (!aiResponse.ok) {
            const errData = await aiResponse.json().catch(() => null);
            throw new Error(errData?.error || "Dosya işlenirken hata oluştu.");
        }
        
        const aiData = await aiResponse.json();
        if (!aiData.data || aiData.data.length === 0) {
            throw new Error("Yapay zeka plandan veri çıkaramadı veya uygun tablo formatı bulamadı.");
        }
        
        setProcessingStep("Excel şablonu oluşturuluyor...");
        const parsedData = aiData.data;
        const docTitle = planTitle.trim() || `${selectedYear} EĞİTİM ÖĞRETİM YILI YILLIK PLANI`;
        
        const extractedRows = parsedData.map(item => {
           return {
              4: { v: item.kazanimlar || "", t: 's' },
              5: { v: item.konular || "", t: 's' },
              6: { v: item.yontem || "", t: 's' },
              7: { v: item.materyaller || "", t: 's' },
              8: { v: item.aciklama || "", t: 's' }
           };
        });

        generateExcelFromContent(extractedRows, true, null, null, null, docTitle);
        return;
      }

      // 2. MODERN WORD DOSYALARI (.docx - Mammoth direct table parsing with fallback)
      if (isWord && fileName.endsWith('.docx')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          let extractedRows = [];

          if (fileName.endsWith('.docx')) {
            try {
              setProcessingStep("Word belgesindeki tablolar çözümleniyor...");
              const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
              const html = htmlResult.value;
              
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const tables = doc.querySelectorAll('table');
              
              if (tables.length > 0) {
                console.log("Word tablosu bulundu, tarayıcıda doğrudan ayıklanıyor...");
                
                let lastKazanimC = -1;
                let lastKonuC = -1;
                let lastYontemC = -1;
                let lastMateryalC = -1;
                let lastAciklamaC = -1;

                tables.forEach((table) => {
                  const rows = table.querySelectorAll('tr');
                  if (rows.length === 0) return;
                  
                  let maxC = 0;
                  let grid = [];
                  let merges = [];

                  rows.forEach((tr, R) => {
                    const cells = tr.querySelectorAll('td, th');
                    let C = 0;
                    cells.forEach((cell) => {
                       while (grid[R] && grid[R][C] !== undefined) C++;
                       
                       let colspan = parseInt(cell.getAttribute('colspan')) || 1;
                       let rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
                       let text = cell.innerHTML.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();
                       
                       if (colspan > 1 || rowspan > 1) {
                         merges.push({s: {r: R, c: C}, e: {r: R + rowspan - 1, c: C + colspan - 1}});
                       }

                       for(let r = 0; r < rowspan; r++) {
                          for(let c = 0; c < colspan; c++) {
                             if (!grid[R+r]) grid[R+r] = [];
                             if (r === 0 && c === 0) {
                                grid[R+r][C+c] = { v: text, t: 's' };
                             } else {
                                grid[R+r][C+c] = { v: "", t: 's', merged: true };
                             }
                          }
                       }
                       C += colspan;
                    });
                    if (C - 1 > maxC) maxC = C - 1;
                  });
                  
                  let headerEndRow = -1;
                  for (let R = 0; R < grid.length && R < 10; R++) {
                     if (!grid[R]) continue;
                     let rowStr = grid[R].map(c => c ? c.v : "").join(" ").toUpperCase();
                     if (rowStr.includes("KAZANIM") || (rowStr.includes("AY") && rowStr.includes("HAFTA"))) {
                        headerEndRow = R;
                        break;
                     }
                  }
                  
                  let kazanimC = -1, konuC = -1, yontemC = -1, materyalC = -1, aciklamaC = -1;

                  if (headerEndRow !== -1) {
                    let headerRow = grid[headerEndRow];
                    if (headerRow) {
                       for (let c = 0; c <= maxC; c++) {
                          let cell = headerRow[c];
                          if (cell && cell.v) {
                             let text = cell.v.toUpperCase();
                             if ((text.includes("KAZANIM") || text.includes("HEDEF") || text.includes("BECERİ")) && kazanimC === -1) kazanimC = c;
                             else if (text.includes("KONU") && konuC === -1) konuC = c;
                             else if ((text.includes("YÖNTEM") || text.includes("TEKNİK")) && yontemC === -1) yontemC = c;
                             else if ((text.includes("MATERYAL") || text.includes("ARAÇ") || text.includes("GEREÇ") || text.includes("KAYNAK")) && materyalC === -1) materyalC = c;
                             else if ((text.includes("AÇIKLAMA") || text.includes("DEĞERLENDİRME") || text.includes("ÖLÇME")) && aciklamaC === -1) aciklamaC = c;
                          }
                       }
                    }

                    const remainingC = [];
                    if (headerRow) {
                       for (let c = 0; c <= maxC; c++) {
                          let cell = headerRow[c];
                          let text = (cell && cell.v || "").toUpperCase();
                          let isTimeCol = text.includes("AY") || text.includes("HAFTA") || text.includes("TARİH") || text.includes("SAAT") || text.includes("SÜRE") || text.includes("SIRA");
                          if (!isTimeCol && c !== kazanimC && c !== konuC && c !== yontemC && c !== materyalC && c !== aciklamaC) {
                             remainingC.push(c);
                          }
                       }
                    }

                    if (kazanimC === -1) kazanimC = remainingC.length > 0 ? remainingC.shift() : -1;
                    if (konuC === -1) konuC = remainingC.length > 0 ? remainingC.shift() : -1;
                    if (yontemC === -1) yontemC = remainingC.length > 0 ? remainingC.shift() : -1;
                    if (materyalC === -1) materyalC = remainingC.length > 0 ? remainingC.shift() : -1;
                    if (aciklamaC === -1) aciklamaC = remainingC.length > 0 ? remainingC.shift() : -1;

                    // Son tespiti kaydet
                    lastKazanimC = kazanimC;
                    lastKonuC = konuC;
                    lastYontemC = yontemC;
                    lastMateryalC = materyalC;
                    lastAciklamaC = aciklamaC;
                  } else {
                    // Bu sayfada başlık yok, bir önceki sayfanın sütun konumlarını kullan
                    kazanimC = lastKazanimC !== -1 ? lastKazanimC : 4;
                    konuC = lastKonuC !== -1 ? lastKonuC : 5;
                    yontemC = lastYontemC !== -1 ? lastYontemC : 6;
                    materyalC = lastMateryalC !== -1 ? lastMateryalC : 7;
                    aciklamaC = lastAciklamaC !== -1 ? lastAciklamaC : 8;
                  }

                  for (let R = headerEndRow + 1; R < grid.length; R++) {
                     let rowGrid = grid[R];
                     if (!rowGrid) continue;
                     
                     let rowData = {
                        4: kazanimC !== -1 && rowGrid[kazanimC] ? { v: rowGrid[kazanimC].v, t: 's' } : { v: "", t: 's' },
                        5: konuC !== -1 && rowGrid[konuC] ? { v: rowGrid[konuC].v, t: 's' } : { v: "", t: 's' },
                        6: yontemC !== -1 && rowGrid[yontemC] ? { v: rowGrid[yontemC].v, t: 's' } : { v: "", t: 's' },
                        7: materyalC !== -1 && rowGrid[materyalC] ? { v: rowGrid[materyalC].v, t: 's' } : { v: "", t: 's' },
                        8: aciklamaC !== -1 && rowGrid[aciklamaC] ? { v: cleanAçıklamaText(rowGrid[aciklamaC].v), t: 's' } : { v: "", t: 's' }
                     };
                     
                     let hasContent = false;
                     for (let k in rowData) {
                        if (rowData[k].v && String(rowData[k].v).trim() !== "") {
                           hasContent = true;
                        }
                     }
                     
                     let rowStr = rowGrid.map(c => c ? c.v : "").join(" ").toUpperCase();
                     let isHeaderRow = rowStr.includes("KAZANIM") || (rowStr.includes("AY") && rowStr.includes("HAFTA"));
                     
                     if (hasContent && !isHeaderRow) {
                        extractedRows.push(rowData);
                     }
                  }
                });

                if (extractedRows.length > 0) {
                  setProcessingStep("Excel şablonu oluşturuluyor...");
                  const docTitle = `${selectedYear} EĞİTİM ÖĞRETİM YILI YILLIK PLANI`;
                  generateExcelFromContent(extractedRows, true, null, null, null, docTitle);
                  return;
                }
              }
            } catch (parseErr) {
              console.warn("Doğrudan tablo çözümleme başarısız oldu, yapay zekaya devrediliyor:", parseErr);
            }

            // 2. YEDEK YÖNTEM: Yapay zeka ile metin analizi (Tablo bulunamazsa veya hata alınırsa)
            setProcessingStep("Word belgesindeki metinler ayıklanıyor...");
            const result = await mammoth.extractRawText({ arrayBuffer });
            const rawText = result.value;
            
            if (!rawText || rawText.trim().length === 0) {
              throw new Error("Word dosyasından okunabilir metin çıkarılamadı.");
            }

            // Call Gemini API to extract data
            setProcessingStep("Yapay zeka analizi başlatılıyor...");
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

            let aiResponse;
            try {
              aiResponse = await fetch("/api/process", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rawText: rawText }),
                  signal: controller.signal
              });
              clearTimeout(timeoutId);
            } catch (fetchErr) {
              clearTimeout(timeoutId);
              if (fetchErr.name === 'AbortError') {
                throw new Error("Yapay zeka yanıt verme süresi aşıldı (Zaman Aşımı).");
              }
              throw fetchErr;
            }

            setProcessingStep("Yapay zeka yanıtı işleniyor...");
            if (!aiResponse.ok) {
                let errMsg = "Sunucu hatası";
                try {
                    const errData = await aiResponse.json();
                    errMsg = errData.error || errMsg;
                } catch(e) {
                    try {
                        const errText = await aiResponse.text();
                        if (errText.includes("504") || errText.includes("Timeout")) {
                            errMsg = "Yapay zeka işlem süresi aşıldı (Vercel 10 saniye limiti). Lütfen daha küçük bir dosya yükleyin veya tekrar deneyin.";
                        } else {
                            errMsg = `Hata Kodu ${aiResponse.status}: ${aiResponse.statusText}`;
                        }
                    } catch(e2) {
                        errMsg = `Hata Kodu ${aiResponse.status}: ${aiResponse.statusText}`;
                    }
                }
                throw new Error(errMsg);
            }
            
            const aiData = await aiResponse.json();
            if (!aiData.data || aiData.data.length === 0) {
                throw new Error("Yapay zeka plandan veri çıkaramadı veya uygun tablo formatı bulamadı.");
            }
            
            setProcessingStep("Excel şablonu oluşturuluyor...");
            const parsedData = aiData.data;
            const docTitle = `${selectedYear} EĞİTİM ÖĞRETİM YILI YILLIK PLANI`;
            
            extractedRows = parsedData.map(item => {
               return {
                  4: { v: item.kazanimlar || "", t: 's' },
                  5: { v: item.konular || "", t: 's' },
                  6: { v: item.yontem || "", t: 's' },
                  7: { v: item.materyaller || "", t: 's' },
                  8: { v: item.aciklama || "", t: 's' }
               };
            });

            generateExcelFromContent(extractedRows, true, null, null, null, docTitle);
            return;
          }

          if (extractedRows.length === 0) {
             // Eğer hiçbir şey bulamazsak boş bir şablon üretelim, kullanıcı elle doldurabilir.
             extractedRows.push({ 4: {v: "Tablo okunamadı", t:'s'}, 5: {v: "Lütfen manuel giriniz", t:'s'} });
          }

            setProcessingStep("Excel şablonu oluşturuluyor...");
            generateExcelFromContent(extractedRows, true); // true = sıfırdan şablon üret
            return;
        } catch (err) {
          console.error("isWordOrPdf processing error:", err);
          setErrorMessage("Dosya analiz edilemedi: " + err.message);
          setStatus("error");
        }
        return;
      }

      // --- KLASİK EXCEL İŞLEME SÜRECİ ---
      setProcessingStep("Excel dosyası okunuyor...");
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          setProcessingStep("Excel verileri çözümleniyor...");
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          let contentRows = [];
          
          let colMap = {
            ay: -1,
            tarih: -1,
            saat: -1,
            kazanim: -1,
            konu: -1,
            yontem: -1,
            materyal: -1,
            aciklama: -1
          };
          
          let headerRowIdx = -1;
          for (let R = 0; R <= Math.min(10, range.e.r); ++R) {
            let foundAny = false;
            for (let C = 0; C <= range.e.c; ++C) {
              let cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
              if (cell && cell.v && typeof cell.v === 'string') {
                const text = cell.v.toUpperCase();
                if (text.includes("AY") && !text.includes("DETAY") && !text.includes("KAYNAK") && colMap.ay === -1) { colMap.ay = C; foundAny = true; }
                if ((text.includes("TARİH") || text.includes("HAFTA")) && colMap.tarih === -1) { colMap.tarih = C; foundAny = true; }
                if ((text.includes("SAAT") || text.includes("SÜRE")) && colMap.saat === -1) { colMap.saat = C; foundAny = true; }
                if ((text.includes("KAZANIM") || text.includes("HEDEF") || text.includes("BECERİ")) && colMap.kazanim === -1) { colMap.kazanim = C; foundAny = true; }
                if (text.includes("KONU") && colMap.konu === -1) { colMap.konu = C; foundAny = true; }
                if ((text.includes("YÖNTEM") || text.includes("TEKNİK")) && colMap.yontem === -1) { colMap.yontem = C; foundAny = true; }
                if ((text.includes("MATERYAL") || text.includes("ARAÇ") || text.includes("GEREÇ") || text.includes("KAYNAK")) && colMap.materyal === -1) { colMap.materyal = C; foundAny = true; }
                if ((text.includes("AÇIKLAMA") || text.includes("DEĞERLENDİRME")) && colMap.aciklama === -1) { colMap.aciklama = C; foundAny = true; }
              }
            }
            if (foundAny && headerRowIdx === -1) {
              headerRowIdx = R;
            }
          }
          
          if (colMap.ay === -1) colMap.ay = 1;
          if (colMap.tarih === -1) colMap.tarih = 2;
          if (colMap.saat === -1) colMap.saat = 3;
          
          const usedCols = new Set([colMap.ay, colMap.tarih, colMap.saat]);
          const remainingCols = [];
          for (let C = 0; C <= range.e.c; ++C) {
            if (!usedCols.has(C)) {
              let isSıra = false;
              if (C === 0) {
                let cell = worksheet[XLSX.utils.encode_cell({c: 0, r: headerRowIdx >= 0 ? headerRowIdx : 3})];
                if (cell && cell.v && String(cell.v).toUpperCase().includes("SIRA")) {
                  isSıra = true;
                }
              }
              if (!isSıra) {
                remainingCols.push(C);
              }
            }
          }
          
          if (colMap.kazanim === -1) colMap.kazanim = remainingCols.length > 0 ? remainingCols.shift() : -1;
          if (colMap.konu === -1) colMap.konu = remainingCols.length > 0 ? remainingCols.shift() : -1;
          if (colMap.yontem === -1) colMap.yontem = remainingCols.length > 0 ? remainingCols.shift() : -1;
          if (colMap.materyal === -1) colMap.materyal = remainingCols.length > 0 ? remainingCols.shift() : -1;
          if (colMap.aciklama === -1) colMap.aciklama = remainingCols.length > 0 ? remainingCols.shift() : -1;

          const getCellVal = (ws, r, c) => {
            if (c === -1) return { v: "", t: 's' };
            let cell = ws[XLSX.utils.encode_cell({c: c, r: r})];
            return cell ? { v: cell.v, s: cell.s, t: cell.t } : { v: "", t: 's' };
          };

          const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 4;
          
          for (let R = startRow; R <= range.e.r; ++R) { 
            let isTatil = false;
            for(let c = 0; c <= range.e.c; c++) {
              let cell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
              if(cell && cell.v && String(cell.v).toUpperCase().includes("TATİL")) {
                isTatil = true; break;
              }
            }
            if (isTatil) continue;
            
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
            if (isFooter) continue; 

            let hasContent = false;
            for(let c = 0; c <= range.e.c; c++) {
               if (c !== colMap.ay && c !== colMap.tarih && c !== colMap.saat && c !== 0) {
                   let cell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
                   if (cell && cell.v) hasContent = true;
               }
            }
            
            if (hasContent) {
              let rowData = {
                4: getCellVal(worksheet, R, colMap.kazanim),
                5: getCellVal(worksheet, R, colMap.konu),
                6: getCellVal(worksheet, R, colMap.yontem),
                7: getCellVal(worksheet, R, colMap.materyal),
                8: getCellVal(worksheet, R, colMap.aciklama)
              };
              contentRows.push(rowData);
            }
          }

          setProcessingStep("Yeni şablon oluşturuluyor...");
          generateExcelFromContent(contentRows, false, worksheet, range, colMap, null, headerRowIdx);

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

  const generateExcelFromContent = (contentRows, isFromPdf = false, oldWorksheet = null, oldRange = null, colMap = null, customTitle = null, headerRowIdx = -1) => {
    try {
      const replaceYears = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/202[234567]\D{0,5}202[345678]/g, selectedYear);
      };



      const getBelirliGunVeYazili = (week, activeWeekIdx) => {
        const list = [];
        
        if (activeWeekIdx === 8) list.push("📝 1. DÖNEM 1. YAZILI SINAV HAFTASI");
        if (activeWeekIdx === 17) list.push("📝 1. DÖNEM 2. YAZILI SINAV HAFTASI");
        if (activeWeekIdx === 27) list.push("📝 2. DÖNEM 1. YAZILI SINAV HAFTASI");
        if (activeWeekIdx === 35) list.push("📝 2. DÖNEM 2. YAZILI SINAV HAFTASI");

        for (let day of week.days) {
          const parts = day.dateStr.split('.'); 
          const d = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          
          if (m === 9 && d >= 14 && d <= 18) {
             if (!list.includes("📅 İlköğretim Haftası")) list.push("📅 İlköğretim Haftası");
          }
          if (m === 9 && d === 15) {
             if (!list.includes("📅 15 Temmuz Demokrasi ve Milli Birlik Günü")) list.push("📅 15 Temmuz Demokrasi ve Milli Birlik Günü");
          }
          if (m === 10 && d === 4) {
             if (!list.includes("📅 Hayvanları Koruma Günü")) list.push("📅 Hayvanları Koruma Günü");
          }
          if (m === 10 && d === 29) {
             if (!list.includes("📅 29 Ekim Cumhuriyet Bayramı")) list.push("📅 29 Ekim Cumhuriyet Bayramı");
          }
          if ((m === 10 && d >= 29) || (m === 11 && d <= 4)) {
             if (!list.includes("📅 Kızılay Haftası (29 Ekim - 4 Kasım)")) list.push("📅 Kızılay Haftası (29 Ekim - 4 Kasım)");
          }
          if (m === 11 && d >= 10 && d <= 16) {
             if (!list.includes("📅 Atatürk Haftası (10-16 Kasım)")) list.push("📅 Atatürk Haftası (10-16 Kasım)");
          }
          if (m === 11 && d === 24) {
             if (!list.includes("📅 24 Kasım Öğretmenler Günü")) list.push("📅 24 Kasım Öğretmenler Günü");
          }
          if (m === 12 && d >= 10 && d <= 16) {
             if (!list.includes("📅 Demokrasi ve İnsan Hakları Haftası")) list.push("📅 Demokrasi ve İnsan Hakları Haftası");
          }
          if (m === 12 && d >= 12 && d <= 18) {
             if (!list.includes("📅 Tutum, Yatırım ve Türk Malları (Yerli Malı) Haftası")) list.push("📅 Tutum, Yatırım ve Türk Malları (Yerli Malı) Haftası");
          }
          if (m === 1 && d === 1) {
             if (!list.includes("📅 Yeni Yıl Yılbaşı Tatili")) list.push("📅 Yeni Yıl Yılbaşı Tatili");
          }
          if (m === 1 && d >= 8 && d <= 14) {
             if (!list.includes("📅 Enerji Tasarrufu Haftası")) list.push("📅 Enerji Tasarrufu Haftası");
          }
          if (m === 3 && d >= 1 && d <= 7) {
             if (!list.includes("📅 Yeşilay Haftası (1-7 Mart)")) list.push("📅 Yeşilay Haftası (1-7 Mart)");
          }
          if (m === 3 && d === 12) {
             if (!list.includes("📅 İstiklal Marşı'nın Kabulü ve Mehmet Akif Ersoy'u Anma Günü")) list.push("📅 İstiklal Marşı'nın Kabulü ve Mehmet Akif Ersoy'u Anma Günü");
          }
          if (m === 3 && d === 18) {
             if (!list.includes("📅 18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü")) list.push("📅 18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü");
          }
          if (m === 3 && d >= 22 && d <= 28) {
             if (!list.includes("📅 Kütüphaneler Haftası")) list.push("📅 Kütüphaneler Haftası");
          }
          if (m === 4 && d === 23) {
             if (!list.includes("📅 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı")) list.push("📅 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı");
          }
          if (m === 5 && d >= 1 && d <= 7) {
             if (!list.includes("📅 Bilişim Haftası (Mayıs İlk Haftası)")) list.push("📅 Bilişim Haftası (Mayıs İlk Haftası)");
             if (!list.includes("📅 Trafik ve İlk Yardım Haftası")) list.push("📅 Trafik ve İlk Yardım Haftası");
          }
          if (m === 5 && d === 19) {
             if (!list.includes("📅 19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı")) list.push("📅 19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı");
          }
          if (m === 6 && d >= 1 && d <= 7) {
             if (!list.includes("📅 Çevre Koruma Haftası")) list.push("📅 Çevre Koruma Haftası");
          }
        }
        
        return list.join("\n");
      };

      const newWeeks = generateSchoolCalendar();
      const newWs = {};
      newWs['!merges'] = [];
      
      let maxCols = 8; // Her zaman A-I (9 sütun)

      // A4 Yatay (Landscape) için optimize edilmiş sütun genişlikleri (Kelimelerin bölünmemesi için)
      newWs['!cols'] = [
        {wch: 5},   // A: Sıra 
        {wch: 10},  // B: Ay
        {wch: 15},  // C: Hafta/Tarih
        {wch: 6},   // D: Saat
        {wch: 45},  // E: Kazanımlar
        {wch: 25},  // F: Konular
        {wch: 15},  // G: Yöntem
        {wch: 15},  // H: Materyal
        {wch: 15}   // I: Açıklama
      ];

      if (isFromPdf || !oldWorksheet) {
        // Sıfırdan şablon oluştur
        const headerStyle = { font: { bold: true, name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: { fgColor: { rgb: "FFD9E1F2" } } };
        
        // Üst Başlık
        let finalTitle = (planTitle && planTitle.trim()) || customTitle || `${selectedYear.replace('-', ' - ')} EĞİTİM ÖĞRETİM YILI YILLIK PLANI`;
        newWs['A1'] = { v: finalTitle, t: 's', s: { font: { bold: true, sz: 14, name: "Times New Roman" }, alignment: { horizontal: "center", vertical: "center", wrapText: true } } };
        newWs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
        let newLinesCount = (finalTitle.match(/\n/g) || []).length;
        if (!newWs['!rows']) newWs['!rows'] = [];
        newWs['!rows'][0] = { hpt: 30 + (newLinesCount * 15) };
        
        const headers = ["SIRA", "AY", "HAFTA / TARİH", "SAAT", "KAZANIMLAR", "KONULAR", "YÖNTEM/TEKNİK", "MATERYALLER", "AÇIKLAMA"];
        for(let c=0; c<=8; c++) {
          newWs[XLSX.utils.encode_cell({c: c, r: 3})] = { v: headers[c], t: 's', s: headerStyle };
        }
      } else {
        // Dinamik Header tespiti
        let headerRowIdxToUse = headerRowIdx !== -1 ? headerRowIdx : 3;

        // Eski şablonun üst bilgilerini kopyala
        let titleRow = -1;
        for (let R = 0; R < headerRowIdxToUse; ++R) {
          for (let C = 0; C <= oldRange.e.c; ++C) {
            let oldCell = oldWorksheet[XLSX.utils.encode_cell({c: C, r: R})];
            if (oldCell) {
              let newV = replaceYears(oldCell.v);
              if (typeof newV === 'string' && (newV.includes(selectedYear) || newV.toUpperCase().includes("EĞİTİM") || newV.toUpperCase().includes("ÖĞRETİM") || newV.toUpperCase().includes("YILI") || newV.toUpperCase().includes("PLAN"))) {
                if (titleRow === -1) {
                  titleRow = R;
                }
              }
              let newS = oldCell.s ? { ...oldCell.s } : {};
              if(!newS.font) newS.font = {};
              newS.font.name = "Times New Roman";
              newS.font.sz = 12;
              if(!newS.alignment) newS.alignment = {};
              newS.alignment.wrapText = true;
              newWs[XLSX.utils.encode_cell({c: C, r: R})] = { v: newV, s: newS, t: oldCell.t };
            }
          }
        }
        
        // Mergeleri kopyala (üst bilgiler için)
        if(oldWorksheet['!merges']) {
          for(let m of oldWorksheet['!merges']) {
            if(m.s.r < headerRowIdxToUse && m.s.r !== titleRow) {
              newWs['!merges'].push(m);
            }
          }
        }

        // Başlık satırını yerleştir
        const headerStyle = { font: { bold: true, name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: { fgColor: { rgb: "FFD9E1F2" } } };
        const headers = ["SIRA", "AY", "HAFTA / TARİH", "SAAT", "KAZANIMLAR", "KONULAR", "YÖNTEM/TEKNİK", "MATERYALLER", "AÇIKLAMA"];
        for(let c=0; c<=8; c++) {
          newWs[XLSX.utils.encode_cell({c: c, r: headerRowIdxToUse})] = { v: headers[c], t: 's', s: headerStyle };
        }

        if (titleRow !== -1) {
          let titleCell = null;
          for (let C = 0; C <= oldRange.e.c; ++C) {
             let cellAddr = XLSX.utils.encode_cell({c: C, r: titleRow});
             if (newWs[cellAddr] && typeof newWs[cellAddr].v === 'string' && newWs[cellAddr].v.trim() !== "") {
                if (!titleCell || newWs[cellAddr].v.length > titleCell.v.length) {
                   titleCell = newWs[cellAddr];
                }
             }
             delete newWs[cellAddr];
          }
          if (titleCell) {
             if (planTitle && planTitle.trim()) {
                titleCell.v = planTitle.trim();
             }
             titleCell.s.font.sz = 14;
             titleCell.s.font.bold = true;
             titleCell.s.alignment.horizontal = "center";
             titleCell.s.alignment.vertical = "center";
             newWs[XLSX.utils.encode_cell({c: 0, r: titleRow})] = titleCell;
             newWs['!merges'].push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 8 } });
          }
        } else {
          // Eğer başlık satırı bulunamadıysa en üste biz ekleyelim
          let finalTitle = (planTitle && planTitle.trim()) || `${selectedYear.replace('-', ' - ')} EĞİTİM ÖĞRETİM YILI YILLIK PLANI`;
          newWs['A1'] = { v: finalTitle, t: 's', s: { font: { bold: true, sz: 14, name: "Times New Roman" }, alignment: { horizontal: "center", vertical: "center", wrapText: true } } };
          newWs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
        }
      }

      let currentRowIdx = isFromPdf || !oldWorksheet ? 4 : (headerRowIdx !== -1 ? headerRowIdx + 1 : 4); 
      let contentIdx = 0;
      let activeWeekIndex = 0;
      
      const borderStyle = {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } }
      };

      for (let i = 0; i < newWeeks.length; i++) {
        const week = newWeeks[i];
        
        let firstDay = week.days[0];
        let lastDay = week.days[week.days.length - 1];
        let dateText = "";
        if (firstDay.monthStr === lastDay.monthStr) {
            dateText = `${firstDay.dateStr.split('.')[0]}-${lastDay.dateStr.split('.')[0]} ${firstDay.monthStr}`;
        } else {
            dateText = `${firstDay.dateStr.split('.')[0]} ${firstDay.monthStr} - ${lastDay.dateStr.split('.')[0]} ${lastDay.monthStr}`;
        }

        let weekHours = weeklyHours || "";
        
        if (!week.hasNormalClass) {
          const hNames = [...new Set(week.days.filter(d => d.isHoliday).map(d => d.holidayName))].join(" / ");
          for (let c = 0; c <= maxCols; ++c) {
            let cellAddr = XLSX.utils.encode_cell({c: c, r: currentRowIdx});
            let style = { fill: { fgColor: { rgb: "FFFF6B6B" } }, font: { bold: true, color: { rgb: "FFFFFFFF" }, name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: borderStyle };
            let v = "";
            if (c === 1) v = lastDay.monthStr;
            if (c === 2) v = dateText;
            if (c === 3) v = "TATİL";
            if (c === 4) v = hNames;
            newWs[cellAddr] = { v: v, t: 's', s: style };
          }
          if (!newWs['!merges']) newWs['!merges'] = [];
          newWs['!merges'].push({ s: { r: currentRowIdx, c: 4 }, e: { r: currentRowIdx, c: maxCols } });
          currentRowIdx++;
          continue; 
        }

        activeWeekIndex++;

        let rowContent = contentRows[contentIdx];
        if (!rowContent) {
          rowContent = {};
        } else {
          contentIdx++;
        }

        for (let c = 0; c <= maxCols; ++c) {
          let cellAddr = XLSX.utils.encode_cell({c: c, r: currentRowIdx});
          let cellObj = (rowContent && rowContent[c]) ? { ...rowContent[c] } : { v: "", t: 's' };
          cellObj.v = replaceYears(cellObj.v);
          
          if (!cellObj.s) cellObj.s = {};
          cellObj.s.border = borderStyle; // Her hücreye zorunlu border
          cellObj.s.font = { name: "Times New Roman", sz: 12 };
          if (!cellObj.s.alignment) cellObj.s.alignment = {};
          cellObj.s.alignment.wrapText = true;
          cellObj.s.alignment.vertical = "center";

          if (c === 0) cellObj.v = (i + 1); // Sıra
          if (c === 1) cellObj.v = lastDay.monthStr;
          if (c === 2) cellObj.v = dateText;
          if (c === 3) cellObj.v = weekHours;

          if (c === 8) { // Açıklama sütunu
            let originalAçıklama = cellObj.v || "";
            let cleanedOriginal = cleanAçıklamaText(originalAçıklama);
            let autoNotes = getBelirliGunVeYazili(week, activeWeekIndex);
            
            let finalAçıklama = cleanedOriginal;
            if (autoNotes) {
              finalAçıklama = finalAçıklama ? (finalAçıklama + "\n" + autoNotes) : autoNotes;
            }
            
            const holidays = [...new Set(week.days.filter(d => d.isHoliday).map(d => d.holidayName))];
            if (holidays.length > 0) {
              finalAçıklama = finalAçıklama + (finalAçıklama ? "\n" : "") + "🎉 " + holidays.join(" / ");
              cellObj.s.fill = { fgColor: { rgb: "FFFFD93D" } };
              cellObj.s.font = { bold: true, color: { rgb: "FF333333" } };
            }
            cellObj.v = finalAçıklama;
          }
          newWs[cellAddr] = cellObj;
        }
        currentRowIdx++;
      }

      // İmza ve Müdür Onay Bölümü
      let footerRow = currentRowIdx + 2;
      const teacherNameText = teacherName && teacherName.trim() ? teacherName.trim() : "";
      const principalNameText = principalName && principalName.trim() ? principalName.trim() : "";

      if (teacherNameText || principalNameText) {
        // Sol Taraf: Zümre Öğretmenleri
        if (teacherNameText) {
          newWs[XLSX.utils.encode_cell({c: 4, r: footerRow})] = { 
            v: teacherNameText, 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12, bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true } } 
          };
          newWs[XLSX.utils.encode_cell({c: 4, r: footerRow + 1})] = { 
            v: "Zümre Öğretmeni", 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center" } } 
          };
        }

        // Sağ Taraf: Okul Müdürü Onayı
        if (principalNameText) {
          const currentDateStr = new Date().toLocaleDateString('tr-TR');
          newWs[XLSX.utils.encode_cell({c: 7, r: footerRow})] = { 
            v: currentDateStr, 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center" } } 
          };
          newWs[XLSX.utils.encode_cell({c: 7, r: footerRow + 1})] = { 
            v: "UYGUNDUR", 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12, bold: true }, alignment: { horizontal: "center", vertical: "center" } } 
          };
          newWs[XLSX.utils.encode_cell({c: 7, r: footerRow + 2})] = { 
            v: principalNameText, 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12, bold: true }, alignment: { horizontal: "center", vertical: "center" } } 
          };
          newWs[XLSX.utils.encode_cell({c: 7, r: footerRow + 3})] = { 
            v: "Okul Müdürü", 
            t: 's', 
            s: { font: { name: "Times New Roman", sz: 12 }, alignment: { horizontal: "center", vertical: "center" } } 
          };
        }

        if (!newWs['!rows']) newWs['!rows'] = [];
        newWs['!rows'][footerRow] = { hpt: 20 };
        newWs['!rows'][footerRow + 1] = { hpt: 20 };
        newWs['!rows'][footerRow + 2] = { hpt: 20 };
        newWs['!rows'][footerRow + 3] = { hpt: 20 };

        currentRowIdx = footerRow + 4;
      }

      newWs['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxCols, r: currentRowIdx } });

      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, "Yıllık Plan");

      setPreviewData(newWb);
      setStatus("preview");
    } catch (err) {
      console.error(err);
      setErrorMessage("Plan üretilirken bir hata oluştu: " + err.message);
      setStatus("error");
    }
  };

  const handleDownload = () => {
    if (!previewData) return;
    try {
      const excelBuffer = XLSX.write(previewData, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedYear.replace('-', '_')}_Plan.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err) {
      setErrorMessage("İndirme hatası: " + err.message);
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
                    Plan Ayarları ve İmza Bilgileri
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Haftalık ders saatini, plan başlığını ve onaylayacak kişileri girin.</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Haftalık Toplam Ders Saati</label>
                    <input 
                      type="number" 
                      min="1" max="40"
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(e.target.value)}
                      placeholder="Örn: 3"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base font-semibold shadow-sm"
                    />
                    <p className="text-xs text-slate-400">Bu dersin haftada toplam kaç saat işlendiğini girin.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Eğitim Öğretim Yılı</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base font-semibold shadow-sm"
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year} Eğitim Öğretim Yılı</option>
                        ))}
                      </select>
                      <Link 
                        href={`/app/settings?year=${selectedYear}`}
                        title="Yeni MEB Takvimi Yükle"
                        className="flex items-center justify-center px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <Settings className="w-5 h-5 text-slate-600" />
                      </Link>
                    </div>
                    <p className="text-xs text-slate-400">Planın hazırlanacağı MEB akademik takvimini seçin.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Plan Başlığı (İsteğe Bağlı)</label>
                    <input 
                      type="text" 
                      value={planTitle}
                      onChange={(e) => setPlanTitle(e.target.value)}
                      placeholder="Örn: BİLİŞİM TEKNOLOJİLERİ VE YAZILIM DERSİ YILLIK PLANI"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base shadow-sm"
                    />
                    <p className="text-xs text-slate-400">Excel'in en üstünde yer alacak plan başlığı.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Zümre Öğretmen(ler)i Adı Soyadı</label>
                    <input 
                      type="text" 
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Örn: Ahmet Yılmaz, Ayşe Demir"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base shadow-sm"
                    />
                    <p className="text-xs text-slate-400">Excel'in altındaki imza bölümüne yazılır.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Okul Müdürü Adı Soyadı</label>
                    <input 
                      type="text" 
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      placeholder="Örn: Mehmet Kaya"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base shadow-sm"
                    />
                    <p className="text-xs text-slate-400">Müdür onay onay bölümüne yazılır.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs">2</span>
                    Eski Planı Yükle & Üret
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Eski yıl planınızı seçtiğiniz an {selectedYear} planı üretilecektir. Excel, Word ve PDF desteklenir.</p>
                </div>
                <div className="hidden sm:block">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold ring-1 ring-inset ring-green-600/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {selectedYear} MEB Takvimi Hazır
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
                    accept=".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg" 
                    className="hidden" 
                    onChange={processFile}
                    onClick={(e) => { e.target.value = null }}
                    disabled={status === 'processing'}
                  />
                  
                  {status === 'processing' ? (
                    <div className="flex flex-col items-center text-indigo-600">
                      <Loader2 className="w-10 h-10 animate-spin mb-3" />
                      <span className="font-medium">Plan Üretiliyor...</span>
                      {processingStep && (
                        <span className="text-sm text-slate-500 mt-2 font-medium animate-pulse">{processingStep}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4 group-hover:scale-110 transition-transform group-hover:border-indigo-200 group-hover:bg-indigo-100">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <p className="text-base font-semibold mb-1">Eski planınızı seçmek için tıklayın</p>
                      <p className="text-xs text-slate-400">.xlsx, .xls, .docx, .doc, .pdf veya görsel (.png, .jpg, .jpeg) dosyaları</p>
                    </div>
                  )}
                </label>

                {status === 'error' && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                    {errorMessage}
                  </div>
                )}
                {status === 'preview' && (
                  <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-2xl flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">Planınız Hazır!</h3>
                    <p className="text-sm text-green-700 text-center mb-6 max-w-md">
                      Yıllık planınız Times New Roman 12 punto fontunda, A4 kağıda tam sığacak genişliklerde ve metin kaydırma özelliği aktif olarak üretildi. Alt alta yazdığınız maddeler de korundu!
                    </p>
                    <button
                      onClick={handleDownload}
                      className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                    >
                      <Download className="w-6 h-6" />
                      Planı Bilgisayara İndir
                    </button>
                  </div>
                )}
                {status === 'success' && (
                  <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Harika! Dosyanız başarıyla indirildi. İşlem tamamlandı.
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
