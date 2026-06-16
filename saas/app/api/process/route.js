import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { rawText } = await req.json();

    if (!rawText) {
      return new Response(JSON.stringify({ error: "Veri bulunamadı." }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key yapılandırılmamış." }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
Sen bir öğretmensin. Aşağıda bir öğretmenin eski yıllık planının ham tablosu veya metni verilmiştir.
Görev: Bu metindeki verileri okuyup, ders içeriğini satır satır sırayla ayıklayarak saf bir JSON dizisi oluşturmak.

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

Ham Tablo Verisi (Sınırlandırılmış):
${rawText.substring(0, 35000)}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
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
