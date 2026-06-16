"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Upload, FileSpreadsheet, Download, Settings, ChevronRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import * as mammoth from "mammoth";

const TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

export default function AppPage() {
  const [weeklyHours, setWeeklyHours] = useState("");
  const [status, setStatus] = useState("idle"); // idle, processing, preview, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState("");
  const [previewData, setPreviewData] = useState(null);
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

  const processFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isWordOrPdf = fileName.endsWith('.docx') || fileName.endsWith('.pdf');

    if (!isExcel && !isWordOrPdf) {
      setErrorMessage("Lütfen sadece Excel (.xlsx, .xls), Word (.docx) veya PDF (.pdf) yükleyiniz.");
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
      if (isWordOrPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          let extractedRows = [];

          if (fileName.endsWith('.docx')) {
            // 1. ÖNCELİKLİ YÖNTEM: Tarayıcı tarafında doğrudan tablo çözümleme (Son derece hızlı ve 100% tutarlı)
            try {
              setProcessingStep("Word belgesindeki tablolar çözümleniyor...");
              const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
              const html = htmlResult.value;
              
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const rows = doc.querySelectorAll('tr');
              
              if (rows.length > 0) {
                console.log("Word tablosu bulundu, tarayıcıda doğrudan ayıklanıyor...");
                
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
                
                let headerEndRow = 3;
                for (let R = 0; R < grid.length && R < 10; R++) {
                   if (!grid[R]) continue;
                   let rowStr = grid[R].map(c => c ? c.v : "").join(" ").toUpperCase();
                   if (rowStr.includes("KAZANIM") || (rowStr.includes("AY") && rowStr.includes("HAFTA"))) {
                      headerEndRow = R;
                   }
                }

                let kazanimC = 3;
                if (grid[headerEndRow]) {
                   for (let c = 0; c <= maxC; c++) {
                      let cell = grid[headerEndRow][c];
                      if (cell && cell.v && cell.v.toUpperCase().includes("KAZANIM")) {
                         kazanimC = c;
                         break;
                      }
                   }
                }

                for (let R = 0; R < grid.length; R++) {
                   let rowGrid = grid[R];
                   if (!rowGrid) continue;
                   
                   let rowData = {};
                   let isHeader = false;
                   
                   for (let C = 0; C <= maxC; C++) {
                      let cellObj = rowGrid[C];
                      if (!cellObj) cellObj = { v: "", t: 's' };
                      
                      if (R <= headerEndRow) {
                         isHeader = true;
                      } else {
                         if (!cellObj.merged) {
                            rowData[C] = cellObj;
                         }
                      }
                   }
                   
                   if (!isHeader && Object.keys(rowData).length > 0) {
                     let hasContent = false;
                     for (let key in rowData) { if (rowData[key] && rowData[key].v && String(rowData[key].v).trim() !== "") hasContent = true; }
                     if (hasContent) {
                       let mappedObj = {};
                       let shift = 4 - kazanimC;
                       for (let C in rowData) {
                          let originalC = parseInt(C);
                          if (originalC >= kazanimC) {
                             mappedObj[originalC + shift] = rowData[originalC];
                          }
                       }
                       extractedRows.push(mappedObj);
                     }
                   }
                }

                if (extractedRows.length > 0) {
                  setProcessingStep("Excel şablonu oluşturuluyor...");
                  const docTitle = "2026-2027 EĞİTİM ÖĞRETİM YILI YILLIK PLANI";
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
            const docTitle = "2026-2027 EĞİTİM ÖĞRETİM YILI YILLIK PLANI";
            
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
          } else if (fileName.endsWith('.pdf')) {
            setProcessingStep("PDF belgesindeki metinler ayıklanıyor...");
            // PDF.js ile PDF'ten metin çıkarma
            const pdfjsLib = await import("pdfjs-dist/build/pdf");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            let fullText = "";
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(" ");
              fullText += pageText + "\n";
            }
            
            setProcessingStep("PDF satırları işleniyor...");
            // PDF metni çok karmaşıktır, satırlara bölüp 20 karakterden uzunları kazanım/konu gibi alıyoruz
            const lines = fullText.split('\n').filter(line => line.trim().length > 20);
            lines.forEach(line => {
              // Yıllık plan olduğu için imza vs dışındaki cümleleri alalım
              const str = line.toUpperCase();
              if(!str.includes("UYGUNDUR") && !str.includes("MÜDÜR") && !str.includes("ÖĞRETMEN") && !str.includes("EĞİTİM ÖĞRETİM")) {
                extractedRows.push({
                  4: { v: line.substring(0, Math.floor(line.length/2)).trim(), t: 's' },
                  5: { v: line.substring(Math.floor(line.length/2)).trim(), t: 's' }
                });
              }
            });
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
          
          let colMap = { ay: -1, tarih: -1, saat: -1 };
          for (let R = 0; R <= Math.min(5, range.e.r); ++R) {
            for (let C = 0; C <= range.e.c; ++C) {
              let cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
              if (cell && cell.v && typeof cell.v === 'string') {
                const text = cell.v.toUpperCase();
                if (text.includes("AY") && !text.includes("DETAY") && !text.includes("KAYNAK")) colMap.ay = C;
                if (text.includes("TARİH") || text.includes("HAFTA")) colMap.tarih = C;
                if (text.includes("SAAT") || text.includes("SÜRE")) colMap.saat = C;
              }
            }
          }
          if (colMap.ay === -1) colMap.ay = 1;
          if (colMap.tarih === -1) colMap.tarih = 2;
          if (colMap.saat === -1) colMap.saat = 3;
          
          for (let R = 3; R <= range.e.r; ++R) { 
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
              let rowData = {};
              for(let c = 0; c <= range.e.c; c++) {
                let oldCell = worksheet[XLSX.utils.encode_cell({c: c, r: R})];
                if(oldCell) rowData[c] = { v: oldCell.v, s: oldCell.s, t: oldCell.t };
              }
              contentRows.push(rowData);
            }
          }

          setProcessingStep("Yeni şablon oluşturuluyor...");
          generateExcelFromContent(contentRows, false, worksheet, range, colMap);

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

  const generateExcelFromContent = (contentRows, isFromPdf = false, oldWorksheet = null, oldRange = null, colMap = null, customTitle = null) => {
    try {
      if (!colMap) {
        colMap = { ay: 1, tarih: 2, saat: 3 };
      }

      const replaceYears = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/202[2345]\D{0,5}202[3456]/g, "2026-2027");
      };

      const newWeeks = generateSchoolCalendar();
      const newWs = {};
      newWs['!merges'] = [];
      
      let maxCols = oldRange ? oldRange.e.c : 8; // A-I (8)

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
        let finalTitle = customTitle || "2026 - 2027 EĞİTİM ÖĞRETİM YILI YILLIK PLANI";
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
        let headerEndRow = 3;
        for (let R = 0; R <= 10 && R <= oldRange.e.r; ++R) {
           let rowStr = "";
           for (let C = 0; C <= oldRange.e.c; ++C) {
              let cell = oldWorksheet[XLSX.utils.encode_cell({c: C, r: R})];
              if (cell && cell.v) rowStr += cell.v.toString().toUpperCase() + " ";
           }
           if (rowStr.includes("KAZANIM") || (rowStr.includes("AY") && rowStr.includes("HAFTA"))) {
              headerEndRow = R;
           }
        }

        // Eski şablonu kopyala
        let titleRow = -1;
        for (let R = 0; R <= headerEndRow; ++R) {
          for (let C = 0; C <= oldRange.e.c; ++C) {
            let oldCell = oldWorksheet[XLSX.utils.encode_cell({c: C, r: R})];
            if (oldCell) {
              let newV = replaceYears(oldCell.v);
              if (typeof newV === 'string' && (newV.includes("2026-2027") || newV.toUpperCase().includes("EĞİTİM") || newV.toUpperCase().includes("ÖĞRETİM") || newV.toUpperCase().includes("YILI") || newV.toUpperCase().includes("PLAN"))) {
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
        
        if(oldWorksheet['!merges']) {
          for(let m of oldWorksheet['!merges']) {
            if(m.s.r <= headerEndRow && m.s.r !== titleRow) newWs['!merges'].push(m);
          }
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
             titleCell.s.font.sz = 14;
             titleCell.s.font.bold = true;
             titleCell.s.alignment.horizontal = "center";
             titleCell.s.alignment.vertical = "center";
             newWs[XLSX.utils.encode_cell({c: 0, r: titleRow})] = titleCell;
             newWs['!merges'].push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: maxCols } });
          }
        }
      }

      let currentRowIdx = 4; 
      let contentIdx = 0;
      
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
            if (c === colMap.ay) v = lastDay.monthStr;
            if (c === colMap.tarih) v = dateText;
            if (c === colMap.saat) v = "TATİL";
            if (c === colMap.saat + 1) v = hNames;
            newWs[cellAddr] = { v: v, t: 's', s: style };
          }
          if (!newWs['!merges']) newWs['!merges'] = [];
          newWs['!merges'].push({ s: { r: currentRowIdx, c: colMap.saat + 1 }, e: { r: currentRowIdx, c: maxCols } });
          currentRowIdx++;
          continue; 
        }

        let rowContent = contentRows[contentIdx];
        if (!rowContent) {
          rowContent = {};
        } else {
          contentIdx++;
        }

        for (let c = 0; c <= maxCols; ++c) {
          let cellAddr = XLSX.utils.encode_cell({c: c, r: currentRowIdx});
          let cellObj = rowContent[c] ? { ...rowContent[c] } : { v: "", t: 's' };
          cellObj.v = replaceYears(cellObj.v);
          
          if (!cellObj.s) cellObj.s = {};
          cellObj.s.border = borderStyle; // Her hücreye zorunlu border
          cellObj.s.font = { name: "Times New Roman", sz: 12 };
          if (!cellObj.s.alignment) cellObj.s.alignment = {};
          cellObj.s.alignment.wrapText = true;
          cellObj.s.alignment.vertical = "center";

          if (c === 0 && colMap.ay !== 0 && colMap.tarih !== 0 && colMap.saat !== 0) cellObj.v = (i + 1); // Sıra
          if (c === colMap.ay) cellObj.v = lastDay.monthStr;
          if (c === colMap.tarih) cellObj.v = dateText;
          if (c === colMap.saat) cellObj.v = weekHours;

          if (c === maxCols) { // Son sütuna her zaman not ekle
            const holidays = [...new Set(week.days.filter(d => d.isHoliday).map(d => d.holidayName))];
            if (holidays.length > 0) {
              let existing = cellObj.v || "";
              cellObj.v = existing + (existing ? "\n" : "") + "🎉 " + holidays.join(" / ");
              cellObj.s.fill = { fgColor: { rgb: "FFFFD93D" } };
              cellObj.s.font = { bold: true, color: { rgb: "FF333333" } };
            }
          }
          newWs[cellAddr] = cellObj;
        }
        currentRowIdx++;
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
      link.download = `2026_2027_Plan.xlsx`;
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
                    Haftalık Ders Programı
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Dersinizin haftalık günlere dağılımını girin.</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="max-w-md mx-auto space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Haftalık Toplam Ders Saati</label>
                  <input 
                    type="number" 
                    min="1" max="40"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    placeholder="Örn: 3"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-lg font-semibold shadow-sm"
                  />
                  <p className="text-xs text-slate-500">Bu dersin haftada toplam kaç saat işlendiğini girin.</p>
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
                  <p className="text-sm text-slate-500 mt-1">Eski yıl planınızı seçtiğiniz an 2026-2027 planı üretilecektir. Excel, Word ve PDF desteklenir.</p>
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
                    accept=".xlsx,.xls,.docx,.pdf" 
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
                      <p className="text-xs text-slate-400">.xlsx, .xls, .docx veya .pdf dosyaları</p>
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
