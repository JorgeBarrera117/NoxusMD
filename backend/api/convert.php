<?php
// backend/api/convert.php

// Permitir solicitudes CORS desde cualquier origen (para desarrollo y despliegue)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

// Evitar que el script muera por timeout con PDFs grandes (5 minutos máximo)
set_time_limit(300);

// Manejar preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../services/Formatter.php';

if (empty($_FILES['archivo'])) {
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo.'], JSON_INVALID_UTF8_SUBSTITUTE);
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
    echo json_encode(['success' => false, 'error' => 'Error interno al guardar el archivo temporal.'], JSON_INVALID_UTF8_SUBSTITUTE);
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
if (!file_exists($tmpMd)) {
    echo json_encode(['success' => false, 'error' => "El comando markitdown falló. Output: $output"], JSON_INVALID_UTF8_SUBSTITUTE);
    @unlink($tmpPdf);
    exit;
}

$contenido = @file_get_contents($tmpMd);
if ($encoding === 'utf8') {
    $contenido = mb_convert_encoding($contenido, 'UTF-8', 'auto');
}

// Aplicar Formato Mágico si fue solicitado
$magicFormat = $_POST['magicFormat'] ?? 'false';
$apiKey = $_POST['apiKey'] ?? '';

if ($magicFormat === 'true') {
    if (!empty($apiKey)) {
        // Usar Inteligencia Artificial de Gemini
        $contenido = Formatter::formatAI($contenido, $apiKey);
    } else {
        // Usar Reglas Locales Gratis
        $contenido = Formatter::formatLocal($contenido);
    }
}

// Limpiar archivos temporales
@unlink($tmpPdf);
@unlink($tmpMd);

// Enviar respuesta
$res = json_encode(['success' => true, 'markdown' => $contenido, 'originalName' => $originalName], JSON_INVALID_UTF8_SUBSTITUTE);
if ($res === false) {
    echo json_encode(['success' => false, 'error' => 'Error al codificar el JSON: ' . json_last_error_msg()], JSON_INVALID_UTF8_SUBSTITUTE);
} else {
    echo $res;
}