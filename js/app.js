const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const filePill    = document.getElementById('filePill');
const fileName    = document.getElementById('fileName');
const removeFile  = document.getElementById('removeFile');
const destPath    = document.getElementById('destPath');
const outName     = document.getElementById('outName');
const btnConvert  = document.getElementById('btnConvert');
const btnSame     = document.getElementById('btnSameFolder');
const btnBrowse   = document.getElementById('btnBrowseFolder');
const outputSection = document.getElementById('outputSection');
const statusMsg   = document.getElementById('statusMsg');
const previewBox  = document.getElementById('previewBox');
const btnCopy     = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');
const errorBox    = document.getElementById('errorBox');

let currentFile = null;

// ── Drag & drop ──
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

// ── Selección de archivo ──
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  currentFile = file;
  fileName.textContent = file.name;
  filePill.classList.add('visible');
  dropZone.style.display = 'none';
  // Sugerir nombre de salida
  const base = file.name.replace(/\.[^.]+$/, '');
  outName.value = base;
}

removeFile.addEventListener('click', () => {
  currentFile = null;
  filePill.classList.remove('visible');
  dropZone.style.display = '';
  fileInput.value = '';
  outName.value = '';
});

// ── Misma carpeta ──
btnSame.addEventListener('click', () => {
  destPath.value = '(misma carpeta del archivo original)';
  destPath.dataset.same = 'true';
});

destPath.addEventListener('input', () => {
  delete destPath.dataset.same;
});

// ── Explorar ──
btnBrowse.addEventListener('click', async () => {
  try {
    btnBrowse.disabled = true;
    const oldText = btnBrowse.textContent;
    btnBrowse.textContent = 'Abriendo...';
    
    const res = await fetch('php/browse.php');
    const data = await res.json();
    
    if (data.success && data.path) {
      destPath.value = data.path;
      delete destPath.dataset.same;
    } else if (data.error) {
      showError('Error al explorar: ' + data.error);
    }
    
    btnBrowse.textContent = oldText;
    btnBrowse.disabled = false;
  } catch (err) {
    showError('No se pudo abrir el explorador.');
    btnBrowse.disabled = false;
    btnBrowse.textContent = 'Explorar...';
  }
});

// ── Convertir ──
btnConvert.addEventListener('click', async () => {
  errorBox.classList.remove('visible');
  outputSection.classList.remove('visible');

  if (!currentFile) {
    showError('Por favor selecciona un archivo primero.');
    return;
  }

  if (!destPath.value.trim()) {
    showError('Por favor ingresa la carpeta de destino.');
    return;
  }

  // Mostrar spinner
  btnConvert.disabled = true;
  btnConvert.innerHTML = '<span class="spinner"></span> Convirtiendo…';

  const formData = new FormData();
  formData.append('archivo', currentFile);
  formData.append('destPath', destPath.value.trim());
  formData.append('outName', outName.value.trim());
  formData.append('sameFolder', destPath.dataset.same === 'true' ? '1' : '0');
  formData.append('encoding', document.getElementById('optEncoding').checked ? 'utf8' : 'default');
  formData.append('preview', document.getElementById('optPreview').checked ? '1' : '0');

  try {
    const res = await fetch('php/convertir.php', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      statusMsg.textContent = '✅ Guardado en: ' + data.ruta;
      previewBox.value = data.preview || '';
      outputSection.classList.add('visible');
      outputSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      showError('Error: ' + data.error);
    }
  } catch (err) {
    showError('No se pudo conectar con el servidor PHP. ¿Está corriendo XAMPP?');
  } finally {
    btnConvert.disabled = false;
    btnConvert.innerHTML = '⚡ Convertir a Markdown';
  }
});

// ── Copiar ──
btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(previewBox.value).then(() => {
    btnCopy.textContent = '✅ Copiado';
    setTimeout(() => btnCopy.textContent = '📋 Copiar', 2000);
  });
});

// ── Descargar ──
btnDownload.addEventListener('click', () => {
  const blob = new Blob([previewBox.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (outName.value || 'resultado') + '.md';
  a.click();
  URL.revokeObjectURL(url);
});

// ── Helpers ──
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('visible');
}