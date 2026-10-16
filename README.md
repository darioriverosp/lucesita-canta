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
1. **Elige tu canción:** sube un MP3 del celular o pega un link de YouTube.
2. **¡Quitar la voz!**
   - 🪄 **Con IA:** la mejor calidad (menos de 1 minuto). Si el motor estaba dormido, tarda 1 minuto más en despertar.
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
- Separación con IA: Demucs `htdemucs` (dos pistas) en una GPU T4 de Modal (`motor/modal_app.py`, FastAPI + `spawn` y consulta de estado).
- Tono: SoundTouchJS en el navegador. MP3: lamejs. Historial: IndexedDB.
- Úsala para uso personal y del club, respetando los derechos de autor y los términos de YouTube.
