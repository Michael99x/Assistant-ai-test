import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend funcionando con Gemini." });
});

app.post("/analyze", async (req, res) => {
  try {
    const { question, excelSummary, excelData } = req.body;

    const limitedData = excelData.slice(0, 50);

    const prompt = `
Eres un asistente especializado en analizar bases de datos.

Archivo: ${excelSummary.fileName}
Hoja: ${excelSummary.sheetName}
Registros: ${excelSummary.totalRows}
Columnas: ${excelSummary.columns.join(", ")}

Datos:
${JSON.stringify(limitedData, null, 2)}

Pregunta:
${question}

Responde en español.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ answer: text });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al consultar Gemini."
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});
