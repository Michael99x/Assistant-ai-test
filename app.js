const excelFileInput = document.getElementById("excelFile");
const knowledgeFileInput = document.getElementById("knowledgeFile");
const fileStatus = document.getElementById("fileStatus");
const knowledgeStatus = document.getElementById("knowledgeStatus");
const questionInput = document.getElementById("question");
const askBtn = document.getElementById("askBtn");
const askBtnText = document.getElementById("askBtnText");
const responseBox = document.getElementById("responseBox");

const excelDropzone = document.getElementById("excelDropzone");
const wordDropzone = document.getElementById("wordDropzone");

const excelEmpty = document.getElementById("excelEmpty");
const excelLoaded = document.getElementById("excelLoaded");
const excelName = document.getElementById("excelName");
const excelMeta = document.getElementById("excelMeta");
const removeExcel = document.getElementById("removeExcel");

const wordEmpty = document.getElementById("wordEmpty");
const wordLoaded = document.getElementById("wordLoaded");
const wordName = document.getElementById("wordName");
const wordMeta = document.getElementById("wordMeta");
const removeWord = document.getElementById("removeWord");

const excelReadyTag = document.getElementById("excelReadyTag");
const wordReadyTag = document.getElementById("wordReadyTag");
const warningText = document.getElementById("warningText");

// Cambia esta URL por tu backend en Render o donde lo tengas
const BACKEND_URL = "http://localhost:3000/analyze";

let excelData = null;
let excelSummary = null;
let knowledgeText = "";
let knowledgeSummary = null;

excelDropzone.addEventListener("click", () => excelFileInput.click());
wordDropzone.addEventListener("click", () => knowledgeFileInput.click());

excelFileInput.addEventListener("change", handleExcelUpload);
knowledgeFileInput.addEventListener("change", handleKnowledgeUpload);
askBtn.addEventListener("click", sendQuestion);
removeExcel.addEventListener("click", (e) => {
  e.stopPropagation();
  clearExcel();
});
removeWord.addEventListener("click", (e) => {
  e.stopPropagation();
  clearWord();
});

setupDragAndDrop(excelDropzone, handleExcelFileDirect);
setupDragAndDrop(wordDropzone, handleWordFileDirect);

function setupDragAndDrop(dropzone, callback) {
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragging");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragging");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragging");
    const file = e.dataTransfer.files[0];
    if (file) callback(file);
  });
}

function handleExcelUpload(event) {
  const file = event.target.files[0];
  handleExcelFileDirect(file || null);
}

function handleWordUpload(event) {
  const file = event.target.files[0];
  handleWordFileDirect(file || null);
}

async function handleKnowledgeUpload(event) {
  const file = event.target.files[0];
  await handleWordFileDirect(file || null);
}

function handleExcelFileDirect(file) {
  if (!file) {
    clearExcel();
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

      excelName.textContent = file.name;
      excelMeta.textContent = `${(file.size / 1024).toFixed(1)} KB · Cargado`;
      excelEmpty.classList.add("hidden");
      excelLoaded.classList.remove("hidden");

      fileStatus.textContent = `Archivo cargado: ${file.name} | Hoja: ${firstSheetName} | Registros: ${jsonData.length}`;
      updateStatusTags();
    } catch (error) {
      console.error(error);
      fileStatus.textContent = "Error al leer el archivo Excel.";
      excelData = null;
      excelSummary = null;
      clearExcelVisual();
      updateStatusTags();
    }
  };

  reader.readAsArrayBuffer(file);
}

async function handleWordFileDirect(file) {
  if (!file) {
    clearWord();
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

    wordName.textContent = file.name;
    wordMeta.textContent = `${(file.size / 1024).toFixed(1)} KB · Cargado`;
    wordEmpty.classList.add("hidden");
    wordLoaded.classList.remove("hidden");

    knowledgeStatus.textContent = `Documento cargado: ${file.name} | Caracteres extraídos: ${cleanedText.length}`;
    updateStatusTags();
  } catch (error) {
    console.error(error);
    knowledgeText = "";
    knowledgeSummary = null;
    knowledgeStatus.textContent = "Error al leer el documento Word.";
    clearWordVisual();
    updateStatusTags();
  }
}

function clearExcel() {
  excelData = null;
  excelSummary = null;
  excelFileInput.value = "";
  fileStatus.textContent = "";
  clearExcelVisual();
  updateStatusTags();
}

function clearWord() {
  knowledgeText = "";
  knowledgeSummary = null;
  knowledgeFileInput.value = "";
  knowledgeStatus.textContent = "";
  clearWordVisual();
  updateStatusTags();
}

function clearExcelVisual() {
  excelEmpty.classList.remove("hidden");
  excelLoaded.classList.add("hidden");
  excelName.textContent = "";
  excelMeta.textContent = "";
}

function clearWordVisual() {
  wordEmpty.classList.remove("hidden");
  wordLoaded.classList.add("hidden");
  wordName.textContent = "";
  wordMeta.textContent = "";
}

function updateStatusTags() {
  if (excelSummary) {
    excelReadyTag.classList.remove("hidden");
    warningText.classList.add("hidden");
  } else {
    excelReadyTag.classList.add("hidden");
    warningText.classList.remove("hidden");
  }

  if (knowledgeSummary) {
    wordReadyTag.classList.remove("hidden");
  } else {
    wordReadyTag.classList.add("hidden");
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
  askBtnText.textContent = "Analizando...";
  responseBox.textContent = "Analizando tus datos con IA...";
  responseBox.classList.add("gradient-border");

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
    askBtnText.textContent = "Preguntar al asistente";
  }
}

updateStatusTags();
