import os
import shutil
import asyncio
import traceback
import uuid
import re
import time
import httpx
from fastapi import FastAPI, UploadFile, Form, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Movidos los imports globales para mejor performance
import pymupdf4llm
import extractor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # TODO: En un despliegue real, cambiar "*" por la URL exacta del frontend (ej. https://tu-sitio.vercel.app)
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar carpeta de uploads para imágenes
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def cleanup_old_files(directory: Path, max_age_seconds: int = 3600):
    """Elimina archivos más antiguos que max_age_seconds para evitar llenar el disco en el Free Tier"""
    now = time.time()
    for f in directory.glob("*"):
        if f.is_file():
            if now - f.stat().st_mtime > max_age_seconds:
                try:
                    f.unlink()
                except Exception:
                    pass

@app.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    try:
        # Limpiar imágenes de más de 1 hora para ahorrar espacio
        cleanup_old_files(uploads_dir)
        
        ext = image.filename.split('.')[-1] if '.' in image.filename else 'png'
        filename = f"{uuid.uuid4().hex}.{ext}"
        file_path = uploads_dir / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        return {"url": f"http://localhost:8000/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al procesar la imagen.")

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

async def format_ai(text: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = "Actúa como un editor técnico. Voy a proporcionarte un texto extraído de un PDF que tiene errores de formato. Tu tarea es limpiarlo y devolverme una versión perfecta en formato Markdown.\n\nAplica estas reglas estrictamente:\n\n- Eliminar caracteres basura: Detecta y borra cualquier símbolo extraño, caracteres de control o marcas de salto de página.\n- Unir oraciones fracturadas: El texto original tiene saltos de línea a mitad de las oraciones debido a los márgenes del PDF. Une el texto para formar párrafos continuos. Solo debes hacer un salto de línea si la oración anterior termina en un punto, es un encabezado o un elemento de lista.\n- Estructurar en Markdown: Aplica correctamente los encabezados (con #, ##), negritas (con **) y listas, respetando la estructura original del documento. Deja siempre una línea en blanco antes y después de cada encabezado o párrafo.\n- Salida limpia: Devuélveme el documento completo y corregido dentro de un solo bloque de código Markdown, sin agregar saludos, explicaciones ni comentarios extra.\n\nTEXTO A FORMATEAR:\n" + text

    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    # Uso asíncrono para no bloquear el hilo principal
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=60.0)
        
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
        raise Exception(f"Error en el API de IA externo.")

@app.post("/upload")
async def upload_pdf(
    archivo: UploadFile = File(...),
    magicFormat: str = Form("false"),
    apiKey: str = Form("")
):
    pdf_path = None
    md_path = None
    try:
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        
        pdf_path = temp_dir / f"{uuid.uuid4()}_{archivo.filename}"
        md_path = temp_dir / f"{pdf_path.name}.md"
        
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)
            
        md_text = ""
            
        if magicFormat == "false":
            # Extraer con pymupdf4llm de forma bloqueante (idealmente usar run_in_executor)
            md_text = await asyncio.to_thread(pymupdf4llm.to_markdown, str(pdf_path))
            md_text = extractor.clean_markdown(md_text)
        else:
            try:
                # Ejecución de subprocess asíncrono para no bloquear el servidor
                process = await asyncio.create_subprocess_exec(
                    "markitdown", str(pdf_path), "-o", str(md_path),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    raise FileNotFoundError("markitdown command failed")
                    
                with open(md_path, "r", encoding="utf-8") as f:
                    md_text = f.read()
            except FileNotFoundError:
                try:
                    process = await asyncio.create_subprocess_exec(
                        "python", "-m", "markitdown", str(pdf_path), "-o", str(md_path),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await process.communicate()
                    if process.returncode != 0:
                        raise Exception("Python markitdown failed")
                        
                    with open(md_path, "r", encoding="utf-8") as f:
                        md_text = f.read()
                except Exception as e:
                    raise Exception(f"Falló el procesamiento del documento.")
            except Exception as e:
                raise Exception(f"Falló la ejecución de formato.")

        if magicFormat == "true":
            if apiKey.strip():
                md_text = await format_ai(md_text, apiKey.strip())
            else:
                md_text = format_local(md_text)
            
        return {
            "success": True,
            "originalName": archivo.filename,
            "markdown": md_text
        }
        
    except Exception as e:
        print(traceback.format_exc())
        return {
            "success": False,
            "error": "Hubo un error procesando el archivo. Por favor intente nuevamente."
        }
    finally:
        # Limpieza de archivos garantizada
        if pdf_path and pdf_path.exists(): 
            try: pdf_path.unlink()
            except: pass
        if md_path and md_path.exists(): 
            try: md_path.unlink()
            except: pass
