// Reproductor de "¡A cantar!": escuchar pista o voz, voz guía, cambiar el tono, descargar y enviar por WhatsApp.
import { decodificar, aWav, aMp3, descargar, nombreArchivo } from './audio.js';
import { cambiarTono } from './tono.js';

const ICONO_WA = '<svg class="icono-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>';

const NOMBRE_TONO = (n) => (n === 0 ? 'Original' : n > 0 ? `+${n}` : `${n}`);
const NIVELES_GUIA = [
  { valor: 0, texto: 'Sin voz' },
  { valor: 0.2, texto: 'Bajita · 20%' },
  { valor: 0.35, texto: 'Media · 35%' },
];

/** Suma la pista sin voz con la voz original a un volumen bajo (la "voz guía"). */
function mezclar(instrumental, voz, volumen) {
  const largo = Math.max(instrumental.length, voz.length);
  const salida = new AudioBuffer({ numberOfChannels: 2, length: largo, sampleRate: instrumental.sampleRate });
  for (let c = 0; c < 2; c++) {
    const out = salida.getChannelData(c);
    const a = instrumental.getChannelData(Math.min(c, instrumental.numberOfChannels - 1));
    const b = voz.getChannelData(Math.min(c, voz.numberOfChannels - 1));
    for (let i = 0; i < largo; i++) {
      const s = (a[i] || 0) + (b[i] || 0) * volumen;
      out[i] = s > 1 ? 1 : s < -1 ? -1 : s;
    }
  }
  return salida;
}

export function montarReproductor(contenedor, cancion) {
  contenedor.innerHTML = `
    <div class="pistas" role="tablist">
      <button class="pista activa" data-pista="instrumental" role="tab">🎹 Pista karaoke</button>
      <button class="pista" data-pista="voz" role="tab">🎤 Solo voz</button>
    </div>
    <audio class="audio" controls preload="auto"></audio>
    <div class="guia">
      <p class="tono-titulo">🎧 Voz guía para ensayar</p>
      <div class="guia-opciones">
        ${NIVELES_GUIA.map((n, i) => `<button class="guia-opcion${i === 0 ? ' activa' : ''}" data-guia="${n.valor}">${n.texto}</button>`).join('')}
      </div>
      <p class="tono-ayuda">Deja la voz original bajita debajo de la música para aprenderte la melodía.</p>
    </div>
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
  const cajaGuia = $('.guia');
  let pista = 'instrumental';
  let semitonos = 0;
  let guia = 0;
  const originales = {};
  const mezclas = {};
  let actual = null; // { clave, buffer } de lo que suena ahora (con voz guía y/o tono aplicados)
  let urlAudio = null;
  let turno = 0;

  const clave = (cual) => `${cual}|${semitonos}|${cual === 'instrumental' ? guia : 0}`;
  const sinCambios = (cual) => semitonos === 0 && (cual === 'voz' || guia === 0);

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

  async function original(cual) {
    if (!originales[cual]) originales[cual] = await decodificar(cancion[cual]);
    return originales[cual];
  }

  /** La pista lista para cambiarle el tono: la voz sola, o la pista karaoke con la voz guía mezclada. */
  async function base(cual) {
    if (cual === 'voz' || guia === 0) return original(cual);
    if (!mezclas[guia]) mezclas[guia] = mezclar(await original('instrumental'), await original('voz'), guia);
    return mezclas[guia];
  }

  async function procesar(cual, alAvanzar) {
    const b = await base(cual);
    return semitonos ? cambiarTono(b, semitonos, alAvanzar) : b;
  }

  async function aplicar() {
    const mio = ++turno;
    valor.textContent = NOMBRE_TONO(semitonos);
    cajaGuia.hidden = pista !== 'instrumental';
    if (sinCambios(pista)) {
      actual = null;
      mostrarEstado('');
      cargarEnAudio(cancion[pista]);
      return;
    }
    const k = clave(pista);
    if (actual?.clave === k) return;
    mostrarEstado('🎛️ Preparando…');
    try {
      const nuevo = await procesar(pista, (p) => {
        if (mio === turno) mostrarEstado(`🎛️ Cambiando el tono… ${Math.round(p * 100)}%`);
      });
      if (mio !== turno) return;
      actual = { clave: k, buffer: nuevo };
      cargarEnAudio(aWav(nuevo));
      mostrarEstado('');
    } catch {
      if (mio === turno) mostrarEstado('😕 No se pudo preparar la pista. Intenta de nuevo.');
    }
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

  contenedor.querySelectorAll('.guia-opcion').forEach((b) =>
    b.addEventListener('click', () => {
      contenedor.querySelectorAll('.guia-opcion').forEach((x) => x.classList.toggle('activa', x === b));
      guia = Number(b.dataset.guia);
      aplicar();
    })
  );

  /** Prepara el MP3 de una pista (con voz guía y tono elegidos) y devuelve un File listo para guardar o compartir. */
  async function preparar(cual, boton) {
    if (sinCambios(cual)) {
      const sufijo = cual === 'voz' ? 'voz' : 'karaoke';
      return new File([cancion[cual]], nombreArchivo(cancion.titulo, sufijo), { type: 'audio/mpeg' });
    }
    const k = clave(cual);
    const buffer = actual?.clave === k
      ? actual.buffer
      : await procesar(cual, (p) => (boton.textContent = `🎛️ Tono… ${Math.round(p * 100)}%`));
    const mp3 = await aMp3(buffer, { alAvanzar: (p) => (boton.textContent = `💾 Preparando… ${Math.round(p * 100)}%`) });
    let sufijo = cual === 'voz' ? 'voz' : 'karaoke';
    if (cual === 'instrumental' && guia) sufijo += `-vozguia${Math.round(guia * 100)}`;
    if (semitonos) sufijo += `-tono${NOMBRE_TONO(semitonos)}`;
    return new File([mp3], nombreArchivo(cancion.titulo, sufijo), { type: 'audio/mpeg' });
  }

  async function conBoton(boton, tarea) {
    const html = boton.innerHTML;
    boton.disabled = true;
    try {
      await tarea();
    } catch {
      alert('😕 No se pudo preparar la canción. Intenta de nuevo.');
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

  // Android solo deja abrir "Compartir" justo después de un toque. Si preparar el MP3 tardó,
  // se guarda listo y se pide un segundo toque para enviarlo.
  const listos = {};

  async function compartir(archivo, cual) {
    const tipo = cual === 'voz' ? 'solo voz' : guia ? 'pista karaoke con voz guía' : 'pista karaoke';
    const datos = { files: [archivo], title: cancion.titulo, text: `🎤 ${cancion.titulo} (${tipo}) · Luza Canta ✨` };
    if (!navigator.canShare?.(datos)) {
      descargar(archivo, archivo.name);
      alert('Este navegador no deja compartir directo. La canción se guardó en Descargas: envíala desde WhatsApp con el clip 📎 → Documento o Audio.');
      return true;
    }
    try {
      await navigator.share(datos);
      return true;
    } catch (e) {
      if (e?.name === 'AbortError') return true;
      if (e?.name === 'NotAllowedError') return false;
      alert('No se pudo compartir. Guárdala en el celular y envíala desde WhatsApp.');
      return true;
    }
  }

  async function enviar(cual, boton) {
    const k = clave(cual);
    if (listos[cual] && listos[cual].clave !== k) {
      // Cambiaron el tono o la voz guía después de prepararla: se vuelve a preparar
      boton.innerHTML = boton.dataset.html;
      delete listos[cual];
    }
    if (listos[cual]) {
      const archivo = listos[cual].archivo;
      delete listos[cual];
      boton.innerHTML = boton.dataset.html || boton.innerHTML;
      await compartir(archivo, cual);
      return;
    }
    const html = boton.innerHTML;
    let archivo;
    await conBoton(boton, async () => {
      archivo = await preparar(cual, boton);
    });
    if (!archivo) return;
    const enviado = await compartir(archivo, cual);
    if (!enviado) {
      listos[cual] = { clave: k, archivo };
      boton.dataset.html = html;
      boton.innerHTML = `${ICONO_WA} ✅ Lista · toca para enviar`;
    }
  }

  $('.enviar-pista').addEventListener('click', (e) => enviar('instrumental', e.currentTarget));
  $('.enviar-voz').addEventListener('click', (e) => enviar('voz', e.currentTarget));
  $('.descargar-pista').addEventListener('click', (e) => guardar('instrumental', e.currentTarget));
  $('.descargar-voz').addEventListener('click', (e) => guardar('voz', e.currentTarget));

  cargarEnAudio(cancion.instrumental);
  return {
    detener: () => {
      audio.pause();
      turno++;
    },
  };
}
