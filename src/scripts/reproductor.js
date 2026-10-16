// Reproductor de "¡A cantar!": escuchar pista o voz, cambiar el tono y descargar.
import { decodificar, aWav, aMp3, descargar, nombreArchivo } from './audio.js';
import { cambiarTono } from './tono.js';

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
      <button class="boton boton-sol descargar-pista">⬇️ Descargar pista karaoke</button>
      <button class="boton boton-cielo descargar-voz">⬇️ Descargar solo voz</button>
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

  async function bajar(cual, boton) {
    const sufijo = cual === 'voz' ? 'voz' : 'karaoke';
    if (semitonos === 0) {
      return descargar(cancion[cual], nombreArchivo(cancion.titulo, sufijo));
    }
    const texto = boton.textContent;
    boton.disabled = true;
    try {
      const base = await original(cual);
      const conTono = cual === pista && actual ? actual : await cambiarTono(base, semitonos, (p) => (boton.textContent = `🎛️ Tono… ${Math.round(p * 100)}%`));
      const mp3 = await aMp3(conTono, { alAvanzar: (p) => (boton.textContent = `💾 Preparando… ${Math.round(p * 100)}%`) });
      descargar(mp3, nombreArchivo(cancion.titulo, `${sufijo}-tono${NOMBRE_TONO(semitonos)}`));
    } finally {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }

  $('.descargar-pista').addEventListener('click', (e) => bajar('instrumental', e.currentTarget));
  $('.descargar-voz').addEventListener('click', (e) => bajar('voz', e.currentTarget));

  cargarEnAudio(cancion.instrumental);
  return { detener: () => audio.pause() };
}
