"""Motor de Lucesita Canta: quita la voz de una canción con Demucs (IA de código abierto).

Corre gratis en un Space de Hugging Face (CPU). La web llama a estas dos funciones:
  /separar        archivo de audio  -> (pista sin voz, solo voz, título)
  /desde_youtube  link de YouTube   -> (pista sin voz, solo voz, título)
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import gradio as gr

MAX_MINUTOS = 12
MODELO = "htdemucs"
CARPETA = Path(tempfile.gettempdir()) / "lucesita"
CARPETA.mkdir(exist_ok=True)
YOUTUBE = re.compile(r"^(https?://)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/", re.I)


def duracion_segundos(ruta: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(ruta)],
        capture_output=True, text=True,
    )
    try:
        return float(json.loads(salida.stdout)["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        raise gr.Error("No pude leer ese archivo. ¿Seguro que es una canción (MP3, M4A, WAV)?")


def limpiar_viejos():
    """Borra trabajos de hace más de 1 hora para no llenar el disco del Space."""
    for carpeta in CARPETA.iterdir():
        if carpeta.is_dir() and time.time() - carpeta.stat().st_mtime > 3600:
            shutil.rmtree(carpeta, ignore_errors=True)


def nombre_limpio(texto: str) -> str:
    return re.sub(r"[^\w\s-]", "", texto).strip()[:80] or "cancion"


def quitar_voz(ruta: Path, titulo: str, progress: gr.Progress):
    if duracion_segundos(ruta) > MAX_MINUTOS * 60:
        raise gr.Error(f"La canción dura más de {MAX_MINUTOS} minutos. Elige una más corta.")

    limpiar_viejos()
    trabajo = Path(tempfile.mkdtemp(dir=CARPETA))
    entrada = trabajo / "cancion.wav"
    progress(0.1, desc="Preparando la canción… 🎼")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(ruta), "-ac", "2", "-ar", "44100", str(entrada)],
        check=True,
    )

    progress(0.25, desc="La IA está separando la voz… esto tarda 1 a 3 minutos 🪄")
    resultado = subprocess.run(
        [sys.executable, "-m", "demucs", "-n", MODELO, "--two-stems=vocals", "--mp3", "--mp3-bitrate", "192",
         "-o", str(trabajo / "salida"), str(entrada)],
        capture_output=True, text=True,
    )
    if resultado.returncode != 0:
        print(resultado.stderr[-3000:], flush=True)
        raise gr.Error("La IA no pudo procesar esta canción. Intenta con otro archivo.")

    carpeta = trabajo / "salida" / MODELO / "cancion"
    nombre = nombre_limpio(titulo)
    instrumental = trabajo / f"{nombre} - karaoke.mp3"
    voz = trabajo / f"{nombre} - voz.mp3"
    shutil.move(carpeta / "no_vocals.mp3", instrumental)
    shutil.move(carpeta / "vocals.mp3", voz)
    entrada.unlink(missing_ok=True)
    progress(1, desc="¡Listo! 🎉")
    return str(instrumental), str(voz), titulo


def separar(archivo, progress=gr.Progress()):
    if not archivo:
        raise gr.Error("Falta la canción.")
    ruta = Path(archivo if isinstance(archivo, str) else archivo.name)
    titulo = re.sub(r"\.[^.]+$", "", ruta.name)
    return quitar_voz(ruta, titulo, progress)


def desde_youtube(link, progress=gr.Progress()):
    link = (link or "").strip()
    if not YOUTUBE.match(link):
        raise gr.Error("Ese no parece un link de YouTube.")

    import yt_dlp

    trabajo = Path(tempfile.mkdtemp(dir=CARPETA))
    opciones = {
        "format": "bestaudio/best",
        "outtmpl": str(trabajo / "descarga.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "max_filesize": 60 * 1024 * 1024,
        "match_filter": yt_dlp.utils.match_filter_func(f"duration <= {MAX_MINUTOS * 60}"),
    }
    # Opcional: cookies de YouTube guardadas como "secret" del Space (YT_COOKIES) por si YouTube pide verificación.
    cookies = os.environ.get("YT_COOKIES")
    if cookies:
        archivo_cookies = trabajo / "cookies.txt"
        archivo_cookies.write_text(cookies)
        opciones["cookiefile"] = str(archivo_cookies)

    progress(0.05, desc="Bajando la canción de YouTube… ▶️")
    try:
        with yt_dlp.YoutubeDL(opciones) as ydl:
            info = ydl.extract_info(link, download=True)
    except Exception as e:  # noqa: BLE001
        print(f"yt-dlp: {e}", flush=True)
        raise gr.Error("YouTube no dejó bajar esta canción 😕. Descárgala aparte y usa “Subir MP3”.")

    archivos = list(trabajo.glob("descarga.*"))
    if not info or not archivos:
        raise gr.Error(f"No se pudo bajar. ¿La canción dura más de {MAX_MINUTOS} minutos?")
    return quitar_voz(archivos[0], info.get("title") or "Canción de YouTube", progress)


with gr.Blocks(title="Lucesita Motor", delete_cache=(3600, 3600)) as demo:
    gr.Markdown("# 🎤 Lucesita Motor\nMotor de IA de **Lucesita Canta**. Úsalo desde la app; aquí también puedes probarlo.")
    with gr.Tab("Subir canción"):
        archivo = gr.File(label="Canción", file_types=["audio"], type="filepath")
        boton1 = gr.Button("🪄 Quitar la voz", variant="primary")
    with gr.Tab("YouTube"):
        link = gr.Textbox(label="Link de YouTube")
        boton2 = gr.Button("🪄 Quitar la voz", variant="primary")
    pista = gr.Audio(label="Pista karaoke (sin voz)", type="filepath")
    voz = gr.Audio(label="Solo voz", type="filepath")
    titulo = gr.Textbox(label="Título", interactive=False)

    boton1.click(separar, archivo, [pista, voz, titulo], api_name="separar")
    boton2.click(desde_youtube, link, [pista, voz, titulo], api_name="desde_youtube")

# Una canción a la vez (la CPU gratis es pequeña); las demás esperan en fila.
demo.queue(default_concurrency_limit=1, max_size=20)

if __name__ == "__main__":
    demo.launch()
