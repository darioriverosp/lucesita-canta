# ✨ Lucesita Canta

Web app para quitarle la voz a las canciones y cantarlas en karaoke. Se instala en Android como una app.
Todo es **gratis**: la página va en Netlify o Vercel y la inteligencia artificial corre en Hugging Face.

```
lucesita canta/
├─ src/        ← la página web (Astro)
├─ public/     ← íconos, manifest y service worker (para instalarla en Android)
└─ motor/      ← el "motor" de IA que quita la voz (va en Hugging Face)
```

---

## Paso 1 · Subir el motor de IA a Hugging Face (gratis)

1. Crea una cuenta en **https://huggingface.co/join**.
2. Ve a **https://huggingface.co/new-space**:
   - **Space name:** `lucesita-motor`
   - **SDK:** Gradio
   - **Hardware:** *CPU basic · Free*
   - **Visibility:** Public
3. Dentro del Space entra a **Files → Add file → Upload files** y sube los 4 archivos de la carpeta `motor/`:
   `app.py`, `requirements.txt`, `packages.txt` y `README.md` (reemplaza el que viene).
4. Espera a que diga **Running** (la primera vez tarda unos 5–10 minutos instalando todo).
5. Tu motor se llama `tu-usuario/lucesita-motor`. Anótalo.

> Puedes probarlo ahí mismo subiendo una canción en la página del Space.

**Sobre YouTube:** YouTube a veces bloquea las descargas desde servidores. Si el link falla, descarga la canción
por otro lado y usa **“Subir MP3”**, que siempre funciona. (Opcional: si sabes exportar las cookies de YouTube en formato
`cookies.txt`, pégalas en *Settings → Variables and secrets → New secret* con el nombre `YT_COOKIES`.)

## Paso 2 · Publicar la página

### Opción A: Netlify
1. Sube esta carpeta a un repositorio de GitHub (sin `node_modules`).
2. En **https://app.netlify.com** → *Add new site → Import an existing project* → elige el repositorio.
3. En *Environment variables* agrega `PUBLIC_MOTOR_URL` = `tu-usuario/lucesita-motor`.
4. *Deploy*. La configuración ya está en `netlify.toml`.

### Opción B: Vercel
1. Igual, sube la carpeta a GitHub.
2. En **https://vercel.com/new** importa el repositorio (detecta Astro solo).
3. En *Environment Variables* agrega `PUBLIC_MOTOR_URL` = `tu-usuario/lucesita-motor`.
4. *Deploy*.

> Si te olvidas de la variable, no pasa nada: en la app toca **⚙️ Ajustes** y escribe ahí el nombre del motor.

## Paso 3 · Instalarla en el Android de mamá
1. Abre la dirección de la página en **Chrome**.
2. Toca el botón amarillo **“Instalar”** que aparece arriba (o menú ⋮ → *Agregar a pantalla principal*).
3. ¡Listo! Queda un ícono de **Lucesita** como cualquier otra app. 🎤

---

## Cómo se usa
1. **Elige tu canción:** sube un MP3 del celular o pega un link de YouTube.
2. **¡Quitar la voz!**
   - 🪄 **Con IA:** la mejor calidad (1 a 3 minutos). Si el motor estaba dormido, tarda 1 minuto más en despertar.
   - ⚡ **Modo rápido:** al instante, sin internet para procesar, calidad más sencilla.
3. **¡A cantar!** Escucha la pista, sube o baja el **tono** con ➖ ➕ y descarga la pista karaoke o solo la voz.
   Todo queda guardado en **📚 Mis canciones**.

## Para programadores
```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run iconos     # vuelve a crear los PNG desde public/icons/icono.svg
```
- Separación con IA: Demucs `htdemucs` (dos pistas) en un Space de Gradio, llamado con `@gradio/client`.
- Tono: SoundTouchJS en el navegador. MP3: lamejs. Historial: IndexedDB.
- Úsala para uso personal y del club, respetando los derechos de autor y los términos de YouTube.
