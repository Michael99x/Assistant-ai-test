import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend funcionando." });
});

app.post("/analyze", async (req, res) => {
  try {
    const { question, excelSummary, excelData } = req.body;

    if (!question || !excelSummary || !excelData) {
      return res.status(400).json({
        error: "Faltan datos: question, excelSummary o excelData."
      });
    }

    const limitedData = excelData.slice(0, 50); // limita registros para demo

    const systemPrompt = `
Eres un asistente virtual especializado en analizar bases de datos pequeñas cargadas por el usuario.
Debes responder en español.
Tu tarea es:
1. Explicar qué contiene la base de datos.
2. Responder únicamente con base en la información proporcionada.
3. Identificar riesgos, amenazas, patrones, inconsistencias, pérdidas potenciales y oportunidades de mejora cuando sea posible.
4. Sugerir indicadores si la información lo permite.
5. Si algo no aparece en los datos, debes decirlo claramente y no inventar.

Mantén respuestas claras, profesionales y fáciles de exponer en una demostración.
`;

    const userContent = `
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

    const response = await client.responses.create({
      model: "gpt-5.4",
      instructions: systemPrompt,
      input: userContent
    });

    return res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("Error en /analyze:", error);
    return res.status(500).json({
      error: "Error interno al consultar OpenAI."
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});