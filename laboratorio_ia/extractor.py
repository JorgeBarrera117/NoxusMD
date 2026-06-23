import sys
import os
import re

try:
    import pymupdf4llm
except ImportError:
    print("Error: pymupdf4llm no está instalada.")
    sys.exit(1)

def fix_pymupdf_tables(text):
    # 1. Reemplazar <br> por un espacio en blanco (petición del usuario)
    text = re.sub(r'<br\s*/?>', ' ', text, flags=re.IGNORECASE)
    
    # 2. Unir todas las filas de tabla que estén separadas por saltos de línea vacíos
    text = re.sub(r'^(\|.*\|)\n+(?=\|.*\|)', r'\1\n', text, flags=re.MULTILINE)
    
    # 3. Corregir tablas donde la fila de separación (|---|---|) aparece ANTES del encabezado
    def swap_header(match):
        return match.group(2) + '\n' + match.group(1)
        
    text = re.sub(r'^(\|\s*(?:-+|:?-+:?)(?:\s*\|\s*(?:-+|:?-+:?))*\s*\|)\n+(\|.*\|)', swap_header, text, flags=re.MULTILINE)
    
    return text

def clean_markdown(text):
    # 1. Eliminar los placeholders de imágenes que inyecta PyMuPDF
    text = re.sub(r'\*\*==> picture.*?<==\*\*', '', text, flags=re.IGNORECASE)
    
    # 2. Arreglar el amontonamiento del encabezado
    text = re.sub(r'(?<!\n)(\*\*[A-ZÁÉÍÓÚ ]+:\*\*)', r'\n\n\1', text)
    
    # 3. Eliminar saltos de línea a mitad de una oración
    text = re.sub(r'([a-záéíóú,])\n+(?=[a-záéíóú])', r'\1 ', text)
    
    # 4. Eliminar filas de tabla que estén completamente vacías (ej: | | | |)
    text = re.sub(r'^(?:\|\s*)+\|$', '', text, flags=re.MULTILINE)
    
    # 5. Arreglar tablas rotas por PyMuPDF
    text = fix_pymupdf_tables(text)
    
    # 6. Reducir multiples saltos de linea a solo dos
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def main():
    if len(sys.argv) < 3:
        print("Uso: python extractor.py <pdf_entrada> <md_salida>")
        sys.exit(1)
        
    input_pdf = sys.argv[1]
    output_md = sys.argv[2]
    
    if not os.path.exists(input_pdf):
        print(f"Error: Archivo no encontrado - {input_pdf}")
        sys.exit(1)
        
    try:
        md_text = pymupdf4llm.to_markdown(input_pdf)
        md_text = clean_markdown(md_text)
        with open(output_md, 'w', encoding='utf-8') as f:
            f.write(md_text)
        print("EXITO")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
