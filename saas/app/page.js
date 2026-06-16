"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileSpreadsheet, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              Y
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Yıllık Plan Asistanı</span>
          </div>
          <nav>
            <Link 
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm shadow-indigo-200 hover:shadow-indigo-300"
            >
              Uygulamaya Git
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-3xl -z-10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-3xl rounded-full" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6 ring-1 ring-inset ring-indigo-200/50">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              2026-2027 MEB Takvimi Hazır
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
              Yıllık Plan Hazırlamak <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Artık Saniyeler Sürer</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Eski yıllık planınızı yükleyin, MEB tatil günleri otomatik olarak işaretlensin ve yeni eğitim yılına hazır, mükemmel Excel formatında planınızı indirin.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-semibold text-lg transition-all hover:scale-105 hover:bg-slate-800 shadow-xl shadow-slate-900/20"
              >
                Hemen Ücretsiz Başla <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> İlk Yıl Tamamen Ücretsiz!
              <span className="mx-2 text-slate-300">•</span>
              <CheckCircle className="w-4 h-4 text-green-500" /> Tarayıcıda çalışır, güvenlidir
            </p>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-24 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Neden Yıllık Plan Asistanı?</h2>
              <p className="text-slate-600">Saatlerce süren kopyala-yapıştır eziyetine son verin.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Calendar className="w-6 h-6 text-indigo-600" />}
                title="Otomatik Tatil Hesabı"
                desc="Ara tatiller, resmi bayramlar ve yarıyıl tatili otomatik hesaplanır ve işaretlenir."
              />
              <FeatureCard 
                icon={<FileSpreadsheet className="w-6 h-6 text-purple-600" />}
                title="Excel Formatı Korunur"
                desc="Yüklediğiniz eski planın satır-sütun yapısı korunur, sadece haftalar güncellenir."
              />
              <FeatureCard 
                icon={<Clock className="w-6 h-6 text-blue-600" />}
                title="Zaman Tasarrufu"
                desc="Birkaç tıklamayla tüm yılın planını oluşturun ve hemen indirin. Bekleme yok."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
              Y
            </div>
            <span className="font-semibold text-slate-200">Yıllık Plan Asistanı</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Yıllık Plan Asistanı. Gökhan Öğretmen için tasarlandı.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors group">
      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
