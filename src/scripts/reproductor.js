// Reproductor de "¡A cantar!": escuchar pista o voz, cambiar el tono, descargar y enviar por WhatsApp.
import { decodificar, aWav, aMp3, descargar, nombreArchivo } from './audio.js';
import { cambiarTono } from './tono.js';

const ICONO_WA = '<svg class="icono-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>';

const NOMBRE_TONO = (n) => (n === 0 ? 'Original' : n > 0 ? `+${n}` : `${n}`);

export function montarReproductor(contenedor, cancion) {
  contenedor.innerHTML = `
    <div class="pistas" role="tablist">
      <button class="pista activa" data-pista="instrumental" role="tab">🎹 Pista karaoke</button>
      <button class="pista" data-pista="voz" role="tab">🎤 Solo voz</button>
    </div>
    <audio class="audio" controls preload="auto"></audio>
    <div class="tono">
      <p class="tono-titulo">Tono de la canción</p>
      <div class="tono-fila">
        <button class="redondo baja" aria-label="Bajar tono">➖</button>
        <div class="tono-valor"><strong>Original</strong><small>semitonos</small></div>
        <button class="redondo sube" aria-label="Subir tono">➕</button>
      </div>
      <p class="tono-ayuda">¿Muy alta? Bájale ➖ · ¿Muy baja? Súbele ➕</p>
    </div>
    <p class="estado-tono" hidden></p>
    <div class="descargas">
      <p class="grupo-titulo">🎹 Pista karaoke</p>
      <button class="boton boton-whatsapp enviar-pista">${ICONO_WA} Enviar por WhatsApp</button>
      <button class="boton boton-sol descargar-pista">⬇️ Guardar en el celular</button>
      <p class="grupo-titulo">🎤 Solo voz</p>
      <div class="fila-botones">
        <button class="boton boton-whatsapp boton-chico enviar-voz">${ICONO_WA} WhatsApp</button>
        <button class="boton boton-cielo boton-chico descargar-voz">⬇️ Guardar</button>
      </div>
    </div>
  `;

  const $ = (s) => contenedor.querySelector(s);
  const audio = $('.audio');
  const estado = $('.estado-tono');
  const valor = $('.tono-valor strong');
  let pista = 'instrumental';
  let semitonos = 0;
  const originales = {};
  let actual = null; // AudioBuffer con el tono aplicado
  let urlAudio = null;
  let turno = 0;

  function mostrarEstado(t) {
    estado.hidden = !t;
    estado.textContent = t || '';
  }

  function cargarEnAudio(blob) {
    const pos = audio.currentTime;
    const sonaba = !audio.paused;
    if (urlAudio) URL.revokeObjectURL(urlAudio);
    urlAudio = URL.createObjectURL(blob);
    audio.src = urlAudio;
    audio.addEventListener('loadedmetadata', () => {
      if (pos) audio.currentTime = Math.min(pos, audio.duration || pos);
      if (sonaba) audio.play().catch(() => {});
    }, { once: true });
  }

  async function original(cual = pista) {
    if (!originales[cual]) originales[cual] = await decodificar(cancion[cual]);
    return originales[cual];
  }

  async function aplicar() {
    const mio = ++turno;
    valor.textContent = NOMBRE_TONO(semitonos);
    if (semitonos === 0) {
      actual = null;
      mostrarEstado('');
      cargarEnAudio(cancion[pista]);
      return;
    }
    mostrarEstado('🎛️ Cambiando el tono…');
    const base = await original();
    const nuevo = await cambiarTono(base, semitonos, (p) => {
      if (mio === turno) mostrarEstado(`🎛️ Cambiando el tono… ${Math.round(p * 100)}%`);
    });
    if (mio !== turno) return;
    actual = nuevo;
    cargarEnAudio(aWav(nuevo));
    mostrarEstado('');
  }

  let espera;
  function moverTono(paso) {
    semitonos = Math.max(-6, Math.min(6, semitonos + paso));
    valor.textContent = NOMBRE_TONO(semitonos);
    clearTimeout(espera);
    espera = setTimeout(aplicar, 500);
  }

  $('.baja').addEventListener('click', () => moverTono(-1));
  $('.sube').addEventListener('click', () => moverTono(1));

  contenedor.querySelectorAll('.pista').forEach((b) =>
    b.addEventListener('click', () => {
      contenedor.querySelectorAll('.pista').forEach((x) => x.classList.toggle('activa', x === b));
      pista = b.dataset.pista;
      aplicar();
    })
  );

  /** Prepara el MP3 de una pista (con el tono elegido) y devuelve un File listo para guardar o compartir. */
  async function preparar(cual, boton) {
    const sufijo = cual === 'voz' ? 'voz' : 'karaoke';
    if (semitonos === 0) {
      return new File([cancion[cual]], nombreArchivo(cancion.titulo, sufijo), { type: 'audio/mpeg' });
    }
    const base = await original(cual);
    const conTono = cual === pista && actual ? actual : await cambiarTono(base, semitonos, (p) => (boton.textContent = `🎛️ Tono… ${Math.round(p * 100)}%`));
    const mp3 = await aMp3(conTono, { alAvanzar: (p) => (boton.textContent = `💾 Preparando… ${Math.round(p * 100)}%`) });
    return new File([mp3], nombreArchivo(cancion.titulo, `${sufijo}-tono${NOMBRE_TONO(semitonos)}`), { type: 'audio/mpeg' });
  }

  async function conBoton(boton, tarea) {
    const html = boton.innerHTML;
    boton.disabled = true;
    try {
      await tarea();
    } finally {
      boton.disabled = false;
      boton.innerHTML = html;
    }
  }

  function guardar(cual, boton) {
    return conBoton(boton, async () => {
      const archivo = await preparar(cual, boton);
      descargar(archivo, archivo.name);
    });
  }

  function enviar(cual, boton) {
    return conBoton(boton, async () => {
      const archivo = await preparar(cual, boton);
      const datos = { files: [archivo], title: cancion.titulo, text: `🎤 ${cancion.titulo} (${cual === 'voz' ? 'solo voz' : 'pista karaoke'}) · Luza Canta ✨` };
      if (navigator.canShare?.(datos)) {
        try {
          await navigator.share(datos);
        } catch (e) {
          if (e?.name !== 'AbortError') alert('No se pudo compartir. Guárdala en el celular y envíala desde WhatsApp.');
        }
      } else {
        descargar(archivo, archivo.name);
        alert('Este navegador no deja compartir directo. La canción se guardó en Descargas: envíala desde WhatsApp con el clip 📎 → Documento o Audio.');
      }
    });
  }

  $('.enviar-pista').addEventListener('click', (e) => enviar('instrumental', e.currentTarget));
  $('.enviar-voz').addEventListener('click', (e) => enviar('voz', e.currentTarget));
  $('.descargar-pista').addEventListener('click', (e) => guardar('instrumental', e.currentTarget));
  $('.descargar-voz').addEventListener('click', (e) => guardar('voz', e.currentTarget));

  cargarEnAudio(cancion.instrumental);
  return { detener: () => audio.pause() };
}
