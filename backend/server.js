import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend funcionando con Gemini." });
});

app.post("/analyze", async (req, res) => {
  try {
    const { question, excelSummary, excelData } = req.body;

    if (!question || !excelSummary || !excelData) {
      return res.status(400).json({
        error: "Faltan datos: question, excelSummary o excelData."
      });
    }

    const limitedData = excelData.slice(0, 50);

    const prompt = `
Eres un asistente especializado en analizar bases de datos pequeñas.
Debes responder en español.
Responde solo con base en la información suministrada.
Si algo no aparece en los datos, dilo claramente y no inventes.

Resumen del archivo:
- Nombre del archivo: ${excelSummary.fileName}
- Hoja: ${excelSummary.sheetName}
- Total de registros: ${excelSummary.totalRows}
- Columnas: ${excelSummary.columns.join(", ")}

Muestra de datos (máximo 50 registros):
${JSON.stringify(limitedData, null, 2)}

Pregunta del usuario:
${question}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ answer: text });
  } catch (error) {
    console.error("Error en /analyze:", error);
    res.status(500).json({
      error: "Error al consultar Gemini."
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});

