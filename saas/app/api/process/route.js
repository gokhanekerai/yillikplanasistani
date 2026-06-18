import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Vercel timeout'unu 60 saniyeye çıkar (Hobby pro veya normal pro için)

export async function POST(req) {
  try {
    const { rawText, fileBase64, mimeType } = await req.json();

    if (!rawText && !fileBase64) {
      return new Response(JSON.stringify({ error: "Veri veya dosya bulunamadı." }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key yapılandırılmamış." }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `
Sen bir öğretmensin. Aşağıda bir öğretmenin eski yıllık planının ham tablosu, metni veya dosyası verilmiştir.
Görev: Bu belgedeki verileri okuyup, ders içeriğini satır satır sırayla ayıklayarak saf bir JSON dizisi oluşturmak.

Eğer Yöntem/Teknik, Materyal veya Açıklama boşsa boş string ("") bırak.
Hafta veya Tarih bilgisini göz ardı et (sadece içerik verilerini al).
Her bir veri satırı (haftalık içerik) için şu JSON formatını KESİNLİKLE koru:
[
  {
    "kazanimlar": "...",
    "konular": "...",
    "yontem": "...",
    "materyaller": "...",
    "aciklama": "..."
  }
]

Dikkat:
1. İçerik sadece kazanımlar ve konulardan ibarettir, okul adları veya alakasız verileri atla.
2. SADECE GEÇERLİ BİR JSON dondur, kod blogu (\`\`\`json) kullanma, fazladan kelime etme.
`;

    let content;
    if (fileBase64 && mimeType) {
      content = [
        {
          inlineData: {
            data: fileBase64,
            mimeType: mimeType
          }
        },
        prompt + "\n\nYukarıdaki dosyadaki tabloyu okuyarak bu talimatı gerçekleştir."
      ];
    } else {
      content = prompt + `\n\nHam Tablo Verisi (Sınırlandırılmış):\n${rawText.substring(0, 25000)}`;
    }

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
      "gemini-3.5-flash"
    ];

    let responseText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kazanimlar: { type: "string", description: "Ders kazanımları veya öğrenme çıktıları" },
                  konular: { type: "string", description: "Ders konuları" },
                  yontem: { type: "string", description: "Kullanılan yöntem ve teknikler" },
                  materyaller: { type: "string", description: "Ders materyalleri ve araç-gereçler" },
                  aciklama: { type: "string", description: "Varsa dersle ilgili açıklamalar veya notlar" }
                },
                required: ["kazanimlar", "konular", "yontem", "materyaller", "aciklama"]
              }
            }
          }
        });
        
        const result = await model.generateContent(content);
        responseText = result.response.text();
        if (responseText && responseText.trim().length > 0) {
          console.log(`Successfully generated content using: ${modelName}`);
          break;
        }
      } catch (err) {
        console.error(`Error with model ${modelName}:`, err.message || err);
        lastError = err;
        continue;
      }
    }

    if (!responseText) {
      throw new Error(`Yapay zeka modellerinin tümü yoğunluk nedeniyle meşgul veya hata verdi. Son hata: ${lastError ? lastError.message : "Bilinmeyen Hata"}`);
    }

    // Parse the JSON
    let parsedData = [];
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanText);
    }

    return new Response(JSON.stringify({ data: parsedData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
