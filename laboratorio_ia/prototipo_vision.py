import os
import time
import sys

try:
    import pymupdf4llm
except ImportError:
    print("Error: La librería pymupdf4llm no está instalada.")
    print("Por favor, instala la librería usando: pip install pymupdf4llm")
    sys.exit(1)

def convert_pdf_to_markdown(pdf_path, output_md_path):
    if not os.path.exists(pdf_path):
        print(f"Error: No se encontró el archivo '{pdf_path}'.")
        return False

    print(f"Iniciando conversión de '{pdf_path}' a Markdown usando Visión Artificial (PyMuPDF)...")
    start_time = time.time()

    try:
        # Extraer el texto a Markdown usando el motor heurístico de PyMuPDF4LLM
        md_text = pymupdf4llm.to_markdown(pdf_path)
        
        # Guardar el resultado
        with open(output_md_path, 'w', encoding='utf-8') as f:
            f.write(md_text)
            
        elapsed = time.time() - start_time
        print("\n" + "="*50)
        print("✅ CONVERSIÓN EXITOSA")
        print(f"Tiempo de procesamiento: {elapsed:.2f} segundos")
        print(f"Archivo guardado en: {output_md_path}")
        print("="*50 + "\n")
        
        # Mostrar los primeros 500 caracteres como vista previa
        print("VISTA PREVIA DEL MARKDOWN GENERADO:")
        print("-" * 30)
        print(md_text[:500] + "...\n" if len(md_text) > 500 else md_text)
        print("-" * 30)
        
        return True
    except Exception as e:
        print(f"Ocurrió un error durante la conversión: {e}")
        return False

if __name__ == "__main__":
    # Buscar un archivo PDF en el directorio padre para probar
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_pdf = os.path.join(parent_dir, "Tarea UX Ug.pdf")
    
    if not os.path.exists(test_pdf):
        print(f"Por favor, coloca un archivo llamado 'Tarea UX Ug.pdf' en {parent_dir} para hacer la prueba.")
        sys.exit(1)
        
    output_path = os.path.join(os.path.dirname(__file__), "resultado_vision.md")
    convert_pdf_to_markdown(test_pdf, output_path)
