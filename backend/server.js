import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

/* ===============================
   CONFIGURACIÓN GEMINI
================================ */

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Falta la variable GEMINI_API_KEY en el entorno.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

/* ===============================
   MIDDLEWARE
================================ */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.options("*", cors());

app.use(express.json({ limit: "20mb" }));

/* ===============================
   RUTAS
================================ */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend funcionando con Gemini.",
    service: "assistant-ai-test",
    endpoint: "https://assistant-ai-test.onrender.com/analyze"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy"
  });
});

/* ===============================
   ANALYZE ENDPOINT
================================ */

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

    if (!Array.isArray(excelData)) {
      return res.status(400).json({
        error: "excelData debe ser un arreglo."
      });
    }

    const limitedData = excelData.slice(0, 50);

    const limitedKnowledge =
      typeof knowledgeText === "string"
        ? knowledgeText.slice(0, 6000)
        : "";

    const columns = Array.isArray(excelSummary.columns)
      ? excelSummary.columns
      : [];

    const knowledgeBlock =
      knowledgeSummary && limitedKnowledge
        ? `
Conocimiento adicional cargado por el usuario:
- Archivo: ${knowledgeSummary.fileName || "No indicado"}
- Caracteres extraídos: ${knowledgeSummary.characters || limitedKnowledge.length}
- Vista previa: ${knowledgeSummary.preview || "Sin vista previa"}

Texto del documento adicional:
${limitedKnowledge}
`
        : `
El usuario no cargó documento adicional.
`;

    const prompt = `
Eres un asistente virtual especializado en analizar bases de datos pequeñas cargadas por el usuario.
Debes responder en español.

Tu tarea es:
1. Explicar qué contiene la base de datos.
2. Responder únicamente con base en la información proporcionada.
3. Si el usuario cargó un documento adicional, úsalo como contexto complementario sin inventar información.
4. Identificar riesgos, amenazas, patrones, inconsistencias, pérdidas potenciales y oportunidades de mejora cuando sea posible.
5. Sugerir indicadores si la información lo permite.
6. Si algo no aparece en los datos o en el documento adicional, debes decirlo claramente y no inventar.

Mantén respuestas claras, profesionales y fáciles de exponer en una demostración.

Resumen del archivo Excel:
- Nombre del archivo: ${excelSummary.fileName || "No indicado"}
- Hoja: ${excelSummary.sheetName || "No indicada"}
- Total de registros: ${excelSummary.totalRows ?? limitedData.length}
- Columnas: ${columns.length ? columns.join(", ") : "No disponibles"}

Muestra de datos (máximo 50 registros):
${JSON.stringify(limitedData, null, 2)}

${knowledgeBlock}

Pregunta del usuario:
${question}
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    return res.json({
      answer: text
    });
  } catch (error) {
    console.error("❌ Error en /analyze");
    console.error(error);

    return res.status(500).json({
      error: "Error al consultar Gemini."
    });
  }
});

/* ===============================
   SERVIDOR
================================ */

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
  console.log(`🌐 https://assistant-ai-test.onrender.com`);
});

