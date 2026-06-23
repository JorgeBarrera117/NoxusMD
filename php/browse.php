<?php
header('Content-Type: application/json');

// Usamos Python y Tkinter porque utiliza nativamente la interfaz moderna de Windows (IFileOpenDialog)
// que es exactamente la ventana que el usuario quiere (con el panel lateral, vista detallada, etc.)
$script = "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True); print(filedialog.askdirectory(title='Selecciona la carpeta de destino'))";

$comando = "python -c \"$script\"";
$output = shell_exec($comando);

$path = trim($output ?? '');

// Python filedialog devuelve una cadena vacía o "()" si el usuario cancela
if ($path !== '' && $path !== '()') {
    // Reemplazar slashes de python por backslashes de windows (opcional, pero más nativo)
    $path = str_replace('/', '\\', $path);
    echo json_encode(['success' => true, 'path' => $path]);
} else {
    echo json_encode(['success' => true, 'path' => false]);
}
