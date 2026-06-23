import os
import shutil
import subprocess
import traceback
import requests
from fastapi import FastAPI, UploadFile, Form, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import extractor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def format_local(text: str) -> str:
    lines = text.split('\n')
    formatted = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            formatted.append(line)
            continue
            
        if stripped.isupper() and 3 < len(stripped) < 100 and not any(c.isdigit() for c in stripped):
            formatted.append(f"\n## **{stripped}**\n")
            continue
            
        if stripped.upper() in ["REFERENCIAS", "BIBLIOGRAFÍA", "BIBLIOGRAFIA"]:
            formatted.append(f"\n# **{stripped.upper()}**\n")
            continue
            
        import re
        m = re.match(r'^(\d+)[.-]\s*(.+)$', stripped)
        if m:
            num, content = m.group(1), m.group(2)
            if len(content) < 80 and not content.endswith('.'):
                formatted.append(f"{num}. **{content}**")
            else:
                formatted.append(f"{num}. {content}")
            continue
            
        m = re.match(r'^[-•*]\s*(.+)$', stripped)
        if m:
            content = m.group(1)
            if len(content) < 80 and not content.endswith('.'):
                formatted.append(f"- **{content}**")
            else:
                formatted.append(f"- {content}")
            continue
            
        formatted.append(line)
    return '\n'.join(formatted)

def format_ai(text: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = "Actúa como un editor técnico. Voy a proporcionarte un texto extraído de un PDF que tiene errores de formato. Tu tarea es limpiarlo y devolverme una versión perfecta en formato Markdown.\n\nAplica estas reglas estrictamente:\n\n- Eliminar caracteres basura: Detecta y borra cualquier símbolo extraño, caracteres de control o marcas de salto de página.\n- Unir oraciones fracturadas: El texto original tiene saltos de línea a mitad de las oraciones debido a los márgenes del PDF. Une el texto para formar párrafos continuos. Solo debes hacer un salto de línea si la oración anterior termina en un punto, es un encabezado o un elemento de lista.\n- Estructurar en Markdown: Aplica correctamente los encabezados (con #, ##), negritas (con **) y listas, respetando la estructura original del documento. Deja siempre una línea en blanco antes y después de cada encabezado o párrafo.\n- Salida limpia: Devuélveme el documento completo y corregido dentro de un solo bloque de código Markdown, sin agregar saludos, explicaciones ni comentarios extra.\n\nTEXTO A FORMATEAR:\n" + text

    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
    if response.status_code == 200:
        res_json = response.json()
        try:
            content = res_json['candidates'][0]['content']['parts'][0]['text']
            if content.startswith("```markdown"):
                content = content[11:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            return content.strip()
        except KeyError:
            return text
    else:
        raise Exception(f"Error de Gemini: {response.text}")

@app.post("/upload")
async def upload_pdf(
    archivo: UploadFile = File(...),
    magicFormat: str = Form("false"),
    apiKey: str = Form("")
):
    try:
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        
        pdf_path = temp_dir / archivo.filename
        md_path = temp_dir / f"{archivo.filename}.md"
        
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)
            
        md_text = ""
            
        if magicFormat == "false":
            import pymupdf4llm
            md_text = pymupdf4llm.to_markdown(str(pdf_path))
            md_text = extractor.clean_markdown(md_text)
        else:
            try:
                subprocess.run(["markitdown", str(pdf_path), "-o", str(md_path)], check=True, capture_output=True)
                with open(md_path, "r", encoding="utf-8") as f:
                    md_text = f.read()
            except FileNotFoundError:
                try:
                    subprocess.run(["python", "-m", "markitdown", str(pdf_path), "-o", str(md_path)], check=True, capture_output=True)
                    with open(md_path, "r", encoding="utf-8") as f:
                        md_text = f.read()
                except Exception as e:
                    raise Exception(f"MarkItDown failed via python -m: {str(e)}")
            except Exception as e:
                raise Exception(f"MarkItDown command failed: {str(e)}")

        if magicFormat == "true":
            if apiKey.strip():
                md_text = format_ai(md_text, apiKey.strip())
            else:
                md_text = format_local(md_text)
            
        if pdf_path.exists(): pdf_path.unlink()
        if md_path.exists(): md_path.unlink()
            
        return {
            "success": True,
            "originalName": archivo.filename,
            "markdown": md_text
        }
        
    except Exception as e:
        print(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }
