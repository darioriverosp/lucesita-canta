# ✨ Luza Canta

Web app para quitarle la voz a las canciones y cantarlas en karaoke. Se instala en Android como una app.
La página va gratis en Netlify o Vercel y la inteligencia artificial corre en [Modal](https://modal.com)
(con GPU; cada canción cuesta ~1 centavo de dólar, y Modal regala $1 al mes sin tarjeta o $30 al mes con tarjeta).

```
luza canta/
├─ src/                 ← la página web (Astro)
├─ public/              ← íconos, manifest y service worker (para instalarla en Android)
├─ motor/modal_app.py   ← el "motor" de IA que quita la voz (va en Modal)
└─ .github/workflows/   ← publica el motor en Modal automáticamente desde GitHub
```

---

## Paso 1 · Publicar el motor de IA en Modal (sin instalar nada)

1. Crea una cuenta en **https://modal.com** (puedes entrar con GitHub).
2. En Modal ve a **Settings → API Tokens → New Token** y copia los dos valores: `Token ID` y `Token Secret`.
3. En GitHub, dentro de este repositorio: **Settings → Secrets and variables → Actions → New repository secret** y crea dos:
   - `MODAL_TOKEN_ID` = el Token ID
   - `MODAL_TOKEN_SECRET` = el Token Secret
4. En GitHub ve a la pestaña **Actions → Publicar motor en Modal → Run workflow**.
   La primera vez tarda unos 5–10 minutos (instala la IA). Cuando salga ✅ verde, el motor está en:
   `https://TU-USUARIO-DE-MODAL--luza-motor.modal.run`
5. Ábrela en el navegador: si dice `"ok": true`, ¡el motor funciona!

> 💡 **Para no llevarte sorpresas:** en Modal, *Settings → Usage and Billing*, pon un límite de gasto mensual.
> El motor procesa una canción a la vez y se apaga solo a los 2 minutos sin uso (dormido no cobra).

**Sobre YouTube:** YouTube a veces bloquea las descargas desde servidores. Si el link falla, descarga la canción
por otro lado y usa **“Subir MP3”**, que siempre funciona.

## Paso 2 · Publicar la página

### Opción A: Netlify
1. Sube esta carpeta a un repositorio de GitHub (sin `node_modules`).
2. En **https://app.netlify.com** → *Add new site → Import an existing project* → elige el repositorio.
3. En *Environment variables* agrega `PUBLIC_MOTOR_URL` = la dirección del motor del Paso 1 (si tu usuario de Modal es `darioriverosp` no hace falta, ya viene puesta).
4. *Deploy*. La configuración ya está en `netlify.toml`.

### Opción B: Vercel
1. Igual, sube la carpeta a GitHub.
2. En **https://vercel.com/new** importa el repositorio (detecta Astro solo).
3. En *Environment Variables* agrega `PUBLIC_MOTOR_URL` = la dirección del motor del Paso 1 (si tu usuario de Modal es `darioriverosp` no hace falta, ya viene puesta).
4. *Deploy*.

> Si te olvidas de la variable, no pasa nada: en la app toca **⚙️ Ajustes** y pega ahí la dirección del motor.

## Paso 3 · Instalarla en el Android de mamá
1. Abre la dirección de la página en **Chrome**.
2. Toca el botón amarillo **“Instalar”** que aparece arriba (o menú ⋮ → *Agregar a pantalla principal*).
3. ¡Listo! Queda un ícono de **Luza** como cualquier otra app. 🎤

---

## Cómo se usa
👉 **https://luza-canta.netlify.app**

1. **Elige tu canción:** sube un MP3 del celular, pega un link de YouTube, o desde WhatsApp mantén presionado el audio → **Compartir → Luza**.
2. **¡Quitar la voz!**
   - 🪄 **Con IA:** la mejor calidad (2 a 4 minutos en CPU; menos de 1 minuto con GPU). Si el motor estaba dormido, tarda 1 minuto más en despertar.
   - ⚡ **Modo rápido:** al instante en el celular, calidad más sencilla.
3. **¡A cantar!**
   - 🎧 **Voz guía:** deja la voz original bajita (20 % o 35 %) debajo de la pista para aprender la melodía.
   - 🎛️ **Tono:** súbelo o bájalo con ➖ ➕ (hasta 6 semitonos).
   - 💬 **Enviar por WhatsApp** o ⬇️ **Guardar en el celular** la pista karaoke o solo la voz.
   - Todo queda en **📚 Mis canciones**, con buscador por nombre.

## Link de YouTube (cookies)
YouTube bloquea las descargas que vienen de servidores. Para que el link funcione, el motor usa las cookies de una
**cuenta de Google secundaria** (nunca la principal):
1. Ventana privada → inicia sesión → ve a `youtube.com/robots.txt` → exporta con la extensión *Get cookies.txt LOCALLY* → cierra la ventana (sin cerrar sesión).
2. En GitHub: *Settings → Secrets and variables → Actions* → secreto `YT_COOKIES` con el contenido del archivo.
3. *Actions → Publicar motor en Modal → Run workflow*.

Si un día vuelve a salir *"YouTube no dejó bajar esta canción"*, las cookies vencieron: repite los 3 pasos.
**Nunca pegues las cookies en un chat ni en el código.**

## Para programadores
```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run iconos     # vuelve a crear los PNG desde public/icons/icono.svg
```
- Separación con IA: Demucs `htdemucs` (dos pistas) en Modal (`motor/modal_app.py`, FastAPI + `spawn` y consulta de estado).
  CPU por defecto; con la variable de GitHub `MOTOR_GPU=T4` usa GPU (requiere tarjeta en Modal).
- Tono: SoundTouchJS en el navegador. MP3: lamejs. Historial: IndexedDB. Voz guía: mezcla en el navegador.
- WhatsApp: *Web Share Target* (recibir) y *Web Share API* (enviar) — requiere la app instalada en Android.
- Úsala para uso personal y del club, respetando los derechos de autor y los términos de YouTube.
