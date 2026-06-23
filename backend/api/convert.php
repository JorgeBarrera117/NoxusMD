<?php
// backend/api/convert.php

// Permitir solicitudes CORS desde cualquier origen (para desarrollo y despliegue)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (empty($_FILES['archivo'])) {
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo.']);
    exit;
}

$archivo = $_FILES['archivo'];
$encoding = $_POST['encoding'] ?? 'utf8';

$originalName = pathinfo($archivo['name'], PATHINFO_FILENAME);

// Guardar archivo temporalmente para procesarlo
$tmpDir = sys_get_temp_dir();
// Generar un nombre único para evitar colisiones
$uniqId = uniqid();
$tmpPdf = $tmpDir . DIRECTORY_SEPARATOR . $uniqId . '_' . basename($archivo['name']);
$tmpMd = $tmpDir . DIRECTORY_SEPARATOR . $uniqId . '.md';

if (!move_uploaded_file($archivo['tmp_name'], $tmpPdf)) {
    echo json_encode(['success' => false, 'error' => 'Error interno al guardar el archivo temporal.']);
    exit;
}

$tmpPdfEsc = escapeshellarg($tmpPdf);
$tmpMdEsc = escapeshellarg($tmpMd);

// Ejecutar MarkItDown
$comando = "markitdown $tmpPdfEsc -o $tmpMdEsc 2>&1";
$output = shell_exec($comando);

if (!file_exists($tmpMd)) {
    // Fallback
    $comando = "python -m markitdown $tmpPdfEsc -o $tmpMdEsc 2>&1";
    $output = shell_exec($comando);
}

if (!file_exists($tmpMd)) {
    @unlink($tmpPdf);
    echo json_encode(['success' => false, 'error' => 'Error al convertir: ' . $output]);
    exit;
}

// Leer el Markdown resultante
$contenido = file_get_contents($tmpMd);
if ($encoding === 'utf8') {
    $contenido = mb_convert_encoding($contenido, 'UTF-8', 'auto');
}

// Limpiar archivos temporales
@unlink($tmpPdf);
@unlink($tmpMd);

// Devolver el contenido convertido y el nombre base
echo json_encode([
    'success' => true,
    'markdown' => $contenido,
    'originalName' => $originalName
]);