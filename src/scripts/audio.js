// Utilidades de audio: decodificar, convertir a WAV (para escuchar) y a MP3 (para descargar/guardar).
import { Mp3Encoder } from '@breezystack/lamejs';

let ctx;
export function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export async function decodificar(blob) {
  const datos = await blob.arrayBuffer();
  return await audioCtx().decodeAudioData(datos);
}

const pausa = () => new Promise((r) => setTimeout(r, 0));

function aInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** AudioBuffer -> Blob MP3. `alAvanzar(0..1)` informa el progreso. */
export async function aMp3(buffer, { kbps = 160, alAvanzar } = {}) {
  const canales = Math.min(2, buffer.numberOfChannels);
  const enc = new Mp3Encoder(canales, buffer.sampleRate, kbps);
  const izq = aInt16(buffer.getChannelData(0));
  const der = canales > 1 ? aInt16(buffer.getChannelData(1)) : null;
  const partes = [];
  const bloque = 1152 * 40;
  for (let i = 0; i < izq.length; i += bloque) {
    const l = izq.subarray(i, i + bloque);
    const mp3 = der ? enc.encodeBuffer(l, der.subarray(i, i + bloque)) : enc.encodeBuffer(l);
    if (mp3.length) partes.push(new Uint8Array(mp3));
    if ((i / bloque) % 20 === 0) {
      alAvanzar?.(i / izq.length);
      await pausa();
    }
  }
  const fin = enc.flush();
  if (fin.length) partes.push(new Uint8Array(fin));
  alAvanzar?.(1);
  return new Blob(partes, { type: 'audio/mpeg' });
}

/** AudioBuffer -> Blob WAV (rápido, para reproducir en el reproductor). */
export function aWav(buffer) {
  const canales = buffer.numberOfChannels;
  const largo = buffer.length;
  const bytes = 44 + largo * canales * 2;
  const vista = new DataView(new ArrayBuffer(bytes));
  const txt = (o, s) => [...s].forEach((c, i) => vista.setUint8(o + i, c.charCodeAt(0)));
  txt(0, 'RIFF');
  vista.setUint32(4, bytes - 8, true);
  txt(8, 'WAVE');
  txt(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, canales, true);
  vista.setUint32(24, buffer.sampleRate, true);
  vista.setUint32(28, buffer.sampleRate * canales * 2, true);
  vista.setUint16(32, canales * 2, true);
  vista.setUint16(34, 16, true);
  txt(36, 'data');
  vista.setUint32(40, largo * canales * 2, true);
  const datos = [];
  for (let c = 0; c < canales; c++) datos.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < largo; i++) {
    for (let c = 0; c < canales; c++) {
      const s = Math.max(-1, Math.min(1, datos[c][i]));
      vista.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([vista.buffer], { type: 'audio/wav' });
}

export function descargar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

export function nombreArchivo(titulo, sufijo) {
  const limpio = (titulo || 'cancion')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${limpio || 'cancion'}-${sufijo}.mp3`;
}
