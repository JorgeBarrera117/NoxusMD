<?php
// backend/services/Formatter.php

class Formatter {
    
    /**
     * Aplica reglas heurísticas locales (Opción A) para mejorar el Markdown.
     */
    public static function formatLocal($text) {
        // 1. Separar el texto en líneas
        $lines = explode("\n", $text);
        $formattedLines = [];
        
        $inList = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            
            // Si la línea está vacía, mantenerla
            if ($trimmed === '') {
                $formattedLines[] = $line;
                $inList = false;
                continue;
            }

            // 2. Detectar Títulos: Todo en MAYÚSCULAS y longitud corta/media
            // (Evitamos párrafos enteros gritando)
            if (strtoupper($trimmed) === $trimmed && strlen($trimmed) > 3 && strlen($trimmed) < 100 && !preg_match('/[0-9]/', $trimmed)) {
                // Formato: # **TÍTULO**
                $formattedLines[] = "\n## **" . $trimmed . "**\n";
                $inList = false;
                continue;
            }

            // 3. Detectar Secciones Clave APA (Referencias, Bibliografía)
            if (preg_match('/^(REFERENCIAS|BIBLIOGRAFÍA|BIBLIOGRAFIA)$/i', $trimmed)) {
                $formattedLines[] = "\n# **" . strtoupper($trimmed) . "**\n";
                $inList = false;
                continue;
            }

            // 4. Mejorar listas numeradas (Ej: "1. Algo" o "1.- Algo")
            if (preg_match('/^(\d+)[.-]\s*(.+)$/', $trimmed, $matches)) {
                $number = $matches[1];
                $content = $matches[2];
                // Comprobar si el contenido parece un título dentro de la lista (cortos y sin punto final)
                if (strlen($content) < 80 && substr($content, -1) !== '.') {
                    $formattedLines[] = "{$number}. **{$content}**";
                } else {
                    $formattedLines[] = "{$number}. {$content}";
                }
                $inList = true;
                continue;
            }

            // 5. Mejorar listas con viñetas (Ej: "- Algo" o "• Algo")
            if (preg_match('/^[-•*]\s*(.+)$/', $trimmed, $matches)) {
                $content = $matches[1];
                if (strlen($content) < 80 && substr($content, -1) !== '.') {
                    $formattedLines[] = "- **{$content}**";
                } else {
                    $formattedLines[] = "- {$content}";
                }
                $inList = true;
                continue;
            }

            // Línea de texto normal
            $formattedLines[] = $line;
        }

        return implode("\n", $formattedLines);
    }

    /**
     * Usa la API de Google Gemini (Opción B) para aplicar un formato perfecto basado en un Prompt.
     */
    public static function formatAI($text, $apiKey) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        $prompt = "Actúa como un editor técnico. Voy a proporcionarte un texto extraído de un PDF que tiene errores de formato. Tu tarea es limpiarlo y devolverme una versión perfecta en formato Markdown.\n\nAplica estas reglas estrictamente:\n\n- Eliminar caracteres basura: Detecta y borra cualquier símbolo extraño, caracteres de control o marcas de salto de página.\n- Unir oraciones fracturadas: El texto original tiene saltos de línea a mitad de las oraciones debido a los márgenes del PDF. Une el texto para formar párrafos continuos. Solo debes hacer un salto de línea si la oración anterior termina en un punto, es un encabezado o un elemento de lista.\n- Estructurar en Markdown: Aplica correctamente los encabezados (con #, ##), negritas (con **) y listas, respetando la estructura original del documento. Deja siempre una línea en blanco antes y después de cada encabezado o párrafo.\n- Salida limpia: Devuélveme el documento completo y corregido dentro de un solo bloque de código Markdown, sin agregar saludos, explicaciones ni comentarios extra.\n\nTEXTO A FORMATEAR:\n" . $text;

        $data = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "temperature" => 0.1 // Temperatura baja para que sea muy literal y no invente cosas
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        // Aumentar timeout y deshabilitar verificación SSL para XAMPP local
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

        $response = curl_exec($ch);
        
        if (curl_errno($ch)) {
            $errorMsg = curl_error($ch);
            curl_close($ch);
            return "ERROR DE CONEXIÓN CON IA: " . $errorMsg . "\n\nTEXTO ORIGINAL:\n" . $text;
        }
        
        curl_close($ch);

        $json = json_decode($response, true);
        
        if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
            $formattedText = $json['candidates'][0]['content']['parts'][0]['text'];
            // Limpiar los posibles delimitadores de bloque de código que la IA suele añadir
            $formattedText = preg_replace('/^```markdown\s*/', '', $formattedText);
            $formattedText = preg_replace('/```$/', '', trim($formattedText));
            return $formattedText;
        }

        // Si la API devolvió un error (ej: clave inválida), devolvemos el error visible
        $apiError = isset($json['error']['message']) ? $json['error']['message'] : 'Error desconocido de la API';
        return "ERROR DE LA API DE GEMINI: " . $apiError . "\n\nTEXTO ORIGINAL:\n" . $text;
    }
}
