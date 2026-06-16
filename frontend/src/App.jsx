import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Calendar, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [planFile, setPlanFile] = useState(null);
  const [calendarFile, setCalendarFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const onDropPlan = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) setPlanFile(acceptedFiles[0]);
  };

  const onDropCalendar = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) setCalendarFile(acceptedFiles[0]);
  };

  const { getRootProps: getPlanRootProps, getInputProps: getPlanInputProps, isDragActive: isPlanDrag } = useDropzone({
    onDrop: onDropPlan,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const { getRootProps: getCalendarRootProps, getInputProps: getCalendarInputProps, isDragActive: isCalendarDrag } = useDropzone({
    onDrop: onDropCalendar,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const handleProcess = async () => {
    if (!planFile) return;
    setStatus('processing');
    setErrorMessage('');
    
    const formData = new FormData();
    formData.append('plan_file', planFile);
    if (calendarFile) {
        formData.append('calendar_file', calendarFile);
    }

    try {
        const response = await fetch('http://localhost:8000/api/process-plan', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Dosya işlenirken bir hata oluştu.');
        }

        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const extension = planFile.name.split('.').pop();
        link.download = `duzenlenmis_plan.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setStatus('success');
    } catch (error) {
        console.error(error);
        setErrorMessage(error.message);
        setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl"
          >
            Yıllık Plan <span className="text-brand-600">Akıllı Asistanı</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-slate-600"
          >
            Yıllık planınızı ve MEB takvimini yükleyin, tatil günleri otomatik olarak işaretlenip PDF olarak hazırlansın.
          </motion.p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                1. Yıllık Planınız
              </h3>
              <div 
                {...getPlanRootProps()} 
                className={`
                  border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                  ${isPlanDrag ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'}
                  ${planFile ? 'border-green-500 bg-green-50' : ''}
                `}
              >
                <input {...getPlanInputProps()} />
                {planFile ? (
                  <div className="flex flex-col items-center text-green-700">
                    <CheckCircle2 className="w-10 h-10 mb-3" />
                    <span className="font-medium">{planFile.name}</span>
                    <span className="text-sm opacity-75 mt-1">{(planFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <Upload className="w-10 h-10 mb-3 text-slate-400" />
                    <span className="font-medium">Word veya Excel dosyası yükleyin</span>
                    <span className="text-sm mt-1">.docx veya .xlsx</span>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                2. MEB Çalışma Takvimi
              </h3>
              <div 
                {...getCalendarRootProps()} 
                className={`
                  border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                  ${isCalendarDrag ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'}
                  ${calendarFile ? 'border-green-500 bg-green-50' : ''}
                `}
              >
                <input {...getCalendarInputProps()} />
                {calendarFile ? (
                  <div className="flex flex-col items-center text-green-700">
                    <CheckCircle2 className="w-10 h-10 mb-3" />
                    <span className="font-medium">{calendarFile.name}</span>
                    <span className="text-sm opacity-75 mt-1">{(calendarFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <Upload className="w-10 h-10 mb-3 text-slate-400" />
                    <span className="font-medium">MEB Takvimi PDF'i yükleyin</span>
                    <span className="text-sm mt-1">.pdf</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <button
              onClick={handleProcess}
              disabled={!planFile || !calendarFile || status === 'processing'}
              className={`
                flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300
                ${(!planFile || !calendarFile) 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'}
              `}
            >
              {status === 'processing' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  Planı Düzenle <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-green-900 mb-2">İşlem Tamamlandı!</h4>
                <p className="text-green-700 mb-6">Yıllık planınıza tatil günleri başarıyla işlendi ve indirildi.</p>
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-red-900 mb-2">Hata Oluştu</h4>
                <p className="text-red-700">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
