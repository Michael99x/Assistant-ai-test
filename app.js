const excelFileInput = document.getElementById("excelFile");
const knowledgeFileInput = document.getElementById("knowledgeFile");
const fileStatus = document.getElementById("fileStatus");
const knowledgeStatus = document.getElementById("knowledgeStatus");
const questionInput = document.getElementById("question");
const askBtn = document.getElementById("askBtn");
const responseBox = document.getElementById("responseBox");

// Cambia esta URL por la de tu backend desplegado
const BACKEND_URL = "http://localhost:3000/analyze";

let excelData = null;
let excelSummary = null;
let knowledgeText = "";
let knowledgeSummary = null;

excelFileInput.addEventListener("change", handleExcelUpload);
knowledgeFileInput.addEventListener("change", handleKnowledgeUpload);
askBtn.addEventListener("click", sendQuestion);

function handleExcelUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    excelData = null;
    excelSummary = null;
    fileStatus.textContent = "No hay archivo cargado.";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      excelData = jsonData;
      excelSummary = {
        fileName: file.name,
        sheetName: firstSheetName,
        totalRows: jsonData.length,
        columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : []
      };

      fileStatus.textContent =
        `Archivo cargado: ${file.name} | Hoja: ${firstSheetName} | Registros: ${jsonData.length}`;
    } catch (error) {
      console.error(error);
      fileStatus.textContent = "Error al leer el archivo Excel.";
      excelData = null;
      excelSummary = null;
    }
  };

  reader.readAsArrayBuffer(file);
}

async function handleKnowledgeUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    knowledgeText = "";
    knowledgeSummary = null;
    knowledgeStatus.textContent = "No hay documento cargado.";
    return;
  }

  knowledgeStatus.textContent = "Procesando documento Word...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const cleanedText = (result.value || "").trim();

    if (!cleanedText) {
      throw new Error("No se pudo extraer texto del documento.");
    }

    knowledgeText = cleanedText;
    knowledgeSummary = {
      fileName: file.name,
      characters: cleanedText.length,
      preview: cleanedText.slice(0, 180)
    };

    knowledgeStatus.textContent =
      `Documento cargado: ${file.name} | Caracteres extraídos: ${cleanedText.length}`;
  } catch (error) {
    console.error(error);
    knowledgeText = "";
    knowledgeSummary = null;
    knowledgeStatus.textContent = "Error al leer el documento Word.";
  }
}

async function sendQuestion() {
  const question = questionInput.value.trim();

  if (!excelData || !excelSummary) {
    responseBox.textContent = "Primero debes cargar un archivo Excel.";
    return;
  }

  if (!question) {
    responseBox.textContent = "Escribe una pregunta antes de continuar.";
    return;
  }

  askBtn.disabled = true;
  askBtn.textContent = "Analizando...";
  responseBox.textContent = "Analizando información...";

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        excelSummary,
        excelData,
        knowledgeText,
        knowledgeSummary
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Ocurrió un error en el servidor.");
    }

    responseBox.textContent = result.answer;
  } catch (error) {
    console.error(error);
    responseBox.textContent = `Error: ${error.message}`;
  } finally {
    askBtn.disabled = false;
    askBtn.textContent = "Preguntar al asistente";
  }
}
