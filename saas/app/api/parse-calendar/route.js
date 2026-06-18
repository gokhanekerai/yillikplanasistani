import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Vercel timeout'unu 60 saniyeye çıkar

export async function POST(req) {
  try {
    const { fileBase64, mimeType, rawText, url } = await req.json();

    let textToAnalyze = rawText;
    let fetchUrl = url;

    // Eğer kullanıcı metin kutusuna direkt link yapıştırdıysa
    if (rawText && (rawText.trim().startsWith('http://') || rawText.trim().startsWith('https://'))) {
      fetchUrl = rawText.trim();
    }

    if (fetchUrl) {
      try {
        const urlResponse = await fetch(fetchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        if (!urlResponse.ok) throw new Error("URL'ye ulaşılamadı.");
        const html = await urlResponse.text();
        // Basitçe HTML etiketlerini temizle ve metne çevir
        textToAnalyze = html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ');
      } catch (e) {
        return new Response(JSON.stringify({ error: "URL içeriği okunamadı: " + e.message }), { status: 400 });
      }
    }

    if (!textToAnalyze && (!fileBase64 || !mimeType)) {
      return new Response(JSON.stringify({ error: "Dosya, metin veya URL bulunamadı." }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key yapılandırılmamış." }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `
Sen bir MEB Akademik Çalışma Takvimi analiz uzmanısın.
Aşağıda verilen resmi MEB Çalışma Takvimi belgesini incele ve aşağıdaki bilgileri çıkart:
1. "year": Hangi eğitim öğretim yılına ait olduğu (Örnek: "2027-2028").
2. "schoolStart": Birinci dönemin başlangıç tarihi (Öğrenciler için ilk ders zili). Tarih formatı YYYY-MM-DD olmalı.
3. "schoolEnd": İkinci dönemin bitiş tarihi (Yaz tatiline giriş). Tarih formatı YYYY-MM-DD olmalı.
4. "holidays": Yıl içindeki ARA TATİL, YARIYIL TATİLİ (Sömestr) ve tüm resmi/dini bayram tatillerini içeren dizi.

DİKKAT EDİLECEK ÇOK ÖNEMLİ KURALLAR:
- Öğretmenlerin mesleki çalışma dönemleri okulun açılış/kapanış tarihleri DEĞİLDİR. Okul açılışı öğrencilerin derse başladığı tarihtir.
- Tarih formatı KESİNLİKLE "YYYY-MM-DD" (Yıl-Ay-Gün) formatında olmalıdır!
- Metinde veya dosyada geçmese dahi, bulduğun eğitim-öğretim yılına (schoolStart ile schoolEnd arasına) denk gelen Türkiye'nin TÜM resmi ve dini bayramlarını (29 Ekim Cumhuriyet Bayramı, 1 Ocak Yılbaşı, 23 Nisan, 1 Mayıs, 19 Mayıs, Ramazan Bayramı ve Kurban Bayramı) tatiller dizisine (holidays) KESİNLİKLE otomatik olarak eklemelisin.
- Dini bayramların tarihleri her yıl değişir. Doğru analiz edebilmen için referans tarihler:
  * 2027 Ramazan Bayramı: 9-11 Mart 2027
  * 2027 Kurban Bayramı: 16-19 Mayıs 2027
  * 2028 Ramazan Bayramı: 26-28 Şubat 2028
  * 2028 Kurban Bayramı: 5-8 Mayıs 2028
Lütfen bu tarihler ilgili eğitim yılına denk geliyorsa tatiller listesine kesinlikle ekle. Bayram hafta sonuna denk geliyorsa bile sadece hafta içi günlerini tatil olarak ekleyebilirsin veya tümünü ekleyebilirsin. Önemli olan bayram günlerini atlamamandır.
`;

    const content = [prompt];
    if (textToAnalyze) {
      content.push(textToAnalyze);
    } else {
      content.push({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType
        }
      });
    }

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    let responseText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Gemini model for calendar: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                year: { type: "string", description: "Öğretim yılı, örn: 2027-2028" },
                schoolStart: { type: "string", description: "Okul başlangıç tarihi YYYY-MM-DD formatında" },
                schoolEnd: { type: "string", description: "Okul kapanış tarihi YYYY-MM-DD formatında" },
                holidays: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Tatilin Adı (Örn: 1. Dönem Ara Tatili, Yarıyıl Tatili, Cumhuriyet Bayramı vb.)" },
                      start: { type: "string", description: "Tatilin başlangıç tarihi YYYY-MM-DD" },
                      end: { type: "string", description: "Tatilin bitiş tarihi YYYY-MM-DD" }
                    },
                    required: ["name", "start", "end"]
                  }
                }
              },
              required: ["year", "schoolStart", "schoolEnd", "holidays"]
            }
          }
        });
        
        const result = await model.generateContent(content);
        responseText = result.response.text();
        if (responseText && responseText.trim().length > 0) {
          console.log(`Successfully generated calendar data using: ${modelName}`);
          break;
        }
      } catch (err) {
        console.error(`Error with model ${modelName}:`, err.message || err);
        lastError = err;
        continue;
      }
    }

    if (!responseText) {
      throw new Error(`Takvim analiz edilemedi: ${lastError ? lastError.message : "Bilinmeyen Hata"}`);
    }

    let parsedData = JSON.parse(responseText);

    return new Response(JSON.stringify({ data: parsedData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
