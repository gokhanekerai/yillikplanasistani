"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Save, CheckCircle2, AlertCircle, Loader2, Code2 } from "lucide-react";
import { saveCustomCalendar } from "../../../lib/holidays";

export default function SettingsPage() {
  const [status, setStatus] = useState("idle"); // idle, processing, success, error
  const [message, setMessage] = useState("");
  const [parsedJson, setParsedJson] = useState("");
  const [rawText, setRawText] = useState("");
  const fileInputRef = useRef(null);

  const processApiResponse = async (response) => {
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || "Takvim işlenirken hata oluştu.");
    }

    const result = await response.json();
    const calendarData = result.data;

    // LocalStorage'a kaydet (Bu tarayıcı için hemen aktif olur)
    saveCustomCalendar(calendarData.year, calendarData);

    // Ekranda admin'e göstermek için JSON oluştur
    const jsonOutput = `"${calendarData.year}": {
  schoolStart: new Date("${calendarData.schoolStart}"),
  schoolEnd: new Date("${calendarData.schoolEnd}"),
  holidays: [
${calendarData.holidays.map(h => `    { name: "${h.name}", start: new Date("${h.start}"), end: new Date("${h.end}") }`).join(",\n")}
  ]
}`;
    setParsedJson(jsonOutput);
    setStatus("success");
    setMessage(`"${calendarData.year}" MEB Takvimi başarıyla çözümlendi ve tarayıcınıza kaydedildi! Artık Yıllık Plan Üret sayfasında bu yılı seçebilirsiniz.`);
  };

  const handleTextSubmit = async () => {
    if (!rawText || rawText.trim().length < 20) return;
    
    setStatus("processing");
    setMessage("MEB Takvimi yapay zeka ile analiz ediliyor (Yaklaşık 5-10 saniye sürebilir)...");
    setParsedJson("");

    try {
      const response = await fetch("/api/parse-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText })
      });
      await processApiResponse(response);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setRawText("");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("processing");
    setMessage("MEB Takvim dosyası yapay zeka ile analiz ediliyor (Yaklaşık 10-20 saniye sürebilir)...");
    setParsedJson("");

    try {
      // Dosyayı Base64'e çevir
      const fileToBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = err => reject(err);
      });

      const base64Data = await fileToBase64(file);
      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.toLowerCase().endsWith('.pdf')) mimeType = "application/pdf";
        else if (file.name.toLowerCase().endsWith('.png')) mimeType = "image/png";
        else mimeType = "image/jpeg";
      }

      const response = await fetch("/api/parse-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64Data, mimeType: mimeType })
      });

      await processApiResponse(response);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <Link 
          href="/app" 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Takvim Ayarları</h1>
          <p className="text-slate-500 text-sm">Sisteme yeni bir MEB Çalışma Takvimi yükleyin ve yapay zeka ile otomatik ayarlayın.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Yeni MEB Akademik Takvimi Yükle</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Milli Eğitim Bakanlığı'nın duyurduğu takvimi isterseniz <strong>PDF / Resim</strong> olarak yükleyebilir, 
          isterseniz resmi duyuru <strong>metnini kopyalayıp</strong> aşağıdaki kutuya yapıştırabilirsiniz.
        </p>

        {status === "error" && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {status === "processing" ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">{message}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Metin Yapıştırma */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">1. Seçenek: Duyuru Metnini Veya Linkini Yapıştırın</label>
              <textarea 
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="MEB duyurusu metnini veya web sitesi linkini (http://...) buraya yapıştırın."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm shadow-sm resize-y"
                rows="4"
              />
              <button 
                onClick={handleTextSubmit}
                disabled={!rawText || rawText.trim().length < 20}
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-medium transition-colors"
              >
                Metni Analiz Et
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-slate-500 font-medium">veya</span>
              </div>
            </div>

            {/* Dosya Yükleme */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">2. Seçenek: Dosya Yükleyin (PDF/JPG/PNG)</label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-slate-400" />
                  <p className="mb-2 text-sm text-slate-600">
                    <span className="font-semibold text-indigo-600">Dosya seçmek için tıklayın</span> veya sürükleyip bırakın
                  </p>
                  <p className="text-xs text-slate-500">PDF, PNG, JPG (Maks 5MB)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>
        )}

        {parsedJson && (
          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-800">Admin Geliştirici Kodu (Kalıcı Yapmak İçin)</h3>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Yüklediğiniz takvim tarayıcınıza (sadece sizin kullanımınıza) başarıyla kaydedildi. 
              Eğer bu takvimi <strong>Türkiye'deki tüm kullanıcılar için kalıcı olarak sisteme eklemek</strong> isterseniz (Admin iseniz), 
              aşağıdaki kodu kopyalayıp <code>saas/lib/holidays.js</code> dosyasına yapıştırabilirsiniz.
            </p>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-sm overflow-x-auto shadow-inner">
                <code>{parsedJson}</code>
              </pre>
              <button 
                onClick={() => navigator.clipboard.writeText(parsedJson)}
                className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/10"
              >
                Kopyala
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
