---
title: Lucesita Motor
emoji: 🎤
colorFrom: pink
colorTo: purple
sdk: gradio
sdk_version: 6.30.0
python_version: "3.11"
app_file: app.py
pinned: false
short_description: Motor de IA de Lucesita Canta (quita la voz con Demucs)
---

# Lucesita Motor

Motor gratuito de **Lucesita Canta**: separa la voz de la música con [Demucs](https://github.com/adefossez/demucs) (código abierto)
y, si se puede, baja el audio de un link de YouTube con yt-dlp.

API (la usa la web con `@gradio/client`):
- `/separar` (archivo de audio) → pista sin voz, solo voz, título
- `/desde_youtube` (link) → pista sin voz, solo voz, título
