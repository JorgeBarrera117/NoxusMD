<?php
header('Content-Type: application/json');

// Validar que llegó un archivo
if (empty($_FILES['archivo'])) {
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo.']);
    exit;
}

$archivo    = $_FILES['archivo'];
$destPath   = trim($_POST['destPath'] ?? '');
$outName    = trim($_POST['outName'] ?? '');
$sameFolder = ($_POST['sameFolder'] ?? '0') === '1';
$encoding   = $_POST['encoding'] ?? 'utf8';
$preview    = ($_POST['preview'] ?? '1') === '1';

// Nombre original sin extensión
$originalName = pathinfo($archivo['name'], PATHINFO_FILENAME);
$finalName    = $outName !== '' ? $outName : $originalName;
$finalName    = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $finalName); // sanitizar

// Guardar archivo temporal
$tmpDir  = sys_get_temp_dir();
$tmpFile = $tmpDir . DIRECTORY_SEPARATOR . basename($archivo['name']);

if (!move_uploaded_file($archivo['tmp_name'], $tmpFile)) {
    echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo temporal.']);
    exit;
}

// Determinar carpeta de destino
if ($sameFolder) {
    $destDir = dirname($tmpFile) . DIRECTORY_SEPARATOR;
} else {
    $destDir = rtrim($destPath, '/\\') . DIRECTORY_SEPARATOR;
}

// Crear carpeta si no existe
if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}

$rutaSalida = $destDir . $finalName . '.md';

// Escapar rutas para el shell (Windows)
$tmpFileEsc  = escapeshellarg($tmpFile);
$rutaSalidaEsc = escapeshellarg($rutaSalida);

// Ejecutar MarkItDown
$comando = "markitdown $tmpFileEsc -o $rutaSalidaEsc 2>&1";
$output  = shell_exec($comando);

// Verificar que se creó el archivo
if (!file_exists($rutaSalida)) {
    // Intentar con python -m markitdown como fallback
    $comando = "python -m markitdown $tmpFileEsc -o $rutaSalidaEsc 2>&1";
    $output  = shell_exec($comando);
}

if (!file_exists($rutaSalida)) {
    echo json_encode([
        'success' => false,
        'error'   => 'MarkItDown no generó el archivo. ¿Está instalado? Detalle: ' . $output
    ]);
    // Limpiar temporal
    @unlink($tmpFile);
    exit;
}

// Leer contenido para vista previa
$contenido = '';
if ($preview) {
    $contenido = file_get_contents($rutaSalida);
    if ($encoding === 'utf8') {
        $contenido = mb_convert_encoding($contenido, 'UTF-8', 'auto');
    }
}

// Limpiar archivo temporal
@unlink($tmpFile);

echo json_encode([
    'success' => true,
    'ruta'    => $rutaSalida,
    'preview' => $contenido
]);