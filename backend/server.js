import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

/*
ENVIRONMENT VARIABLES (Render)

Key: GEMINI_API_KEY
Value: AIzaSyBq3BLbBNw04r0xacb-9Jh-NbgwZytHGp4

Ejemplo:
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXX
*/

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ No se encontró GEMINI_API_KEY en las variables de entorno.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend funcionando con Gemini.",
    service: "assistant-ai-test",
    endpoint: "https://assistant-ai-test.onrender.com/analyze"
  });
});

app.post("/analyze", async (req, res) => {
  try {

    const {
      question,
      excelSummary,
      excelData,
      knowledgeText,
      knowledgeSummary
    } = req.body;

    if (!question || !excelSummary || !excelData) {
      return res.status(400).json({
        error: "Faltan datos: question, excelSummary o excelData."
      });
    }

    const limitedData = excelData.slice(0, 50);
    const limitedKnowledge = (knowledgeText || "").slice(0, 6000);

    const systemPrompt = `
Eres un asistente virtual especializado en analizar bases de datos pequeñas cargadas por el usuario.

Debes responder en español.

Tu tarea es:

1. Explicar qué contiene la base de datos.
2. Responder únicamente con base en la información proporcionada.
3. Si el usuario cargó un documento Word, úsalo como contexto complementario sin inventar información.
4. Identificar riesgos, amenazas, patrones, inconsistencias, pérdidas potenciales y oportunidades de mejora cuando sea posible.
5. Sugerir indicadores si la información lo permite.
6. Si algo no aparece en los datos o en el documento adicional, debes decirlo claramente y no inventar.

Mantén respuestas claras, profesionales y fáciles de exponer en una demostración.
`;

    const knowledgeBlock =
      knowledgeSummary && limitedKnowledge
        ? `
Conocimiento adicional cargado por el usuario:

Archivo: ${knowledgeSummary.fileName}
Caracteres extraídos: ${knowledgeSummary.characters}
Vista previa: ${knowledgeSummary.preview}

Texto del documento Word:

${limitedKnowledge}
`
        : `
El usuario no cargó documento Word adicional.
`;

    const userContent = `
Resumen del archivo Excel:

Nombre del archivo: ${excelSummary.fileName}
Hoja: ${excelSummary.sheetName}
Total de registros: ${excelSummary.totalRows}
Columnas: ${excelSummary.columns.join(", ")}

Muestra de datos (máximo 50 registros):

${JSON.stringify(limitedData, null, 2)}

${knowledgeBlock}

Pregunta del usuario:

${question}
`;

    const prompt = `
${systemPrompt}

${userContent}
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    return res.json({
      answer: text
    });

  } catch (error) {
    console.error("Error en /analyze:", error);

    return res.status(500).json({
      error: "Error interno al consultar Gemini."
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});



