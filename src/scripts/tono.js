// Cambia el tono (semitonos) de una pista sin cambiar su velocidad, usando SoundTouch.
import { SoundTouch, SimpleFilter } from 'soundtouchjs';
import { audioCtx } from './audio.js';

const pausa = () => new Promise((r) => setTimeout(r, 0));

/** Fuente que entrega muestras intercaladas y rellena con silencio al final. */
class Fuente {
  constructor(buffer) {
    this.l = buffer.getChannelData(0);
    this.r = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : this.l;
  }
  extract(destino, cuantos = 0, desde = 0) {
    const disponibles = Math.max(0, Math.min(cuantos, this.l.length - desde));
    for (let i = 0; i < disponibles; i++) {
      destino[i * 2] = this.l[desde + i];
      destino[i * 2 + 1] = this.r[desde + i];
    }
    return disponibles;
  }
}

/** Devuelve un AudioBuffer nuevo con el tono movido `semitonos` (puede ser negativo). */
export async function cambiarTono(buffer, semitonos, alAvanzar) {
  if (!semitonos) return buffer;
  const st = new SoundTouch();
  st.pitchSemitones = semitonos;
  const filtro = new SimpleFilter(new Fuente(buffer), st);

  const total = buffer.length;
  const salida = audioCtx().createBuffer(2, total, buffer.sampleRate);
  const l = salida.getChannelData(0);
  const r = salida.getChannelData(1);
  const bloque = 8192;
  const tmp = new Float32Array(bloque * 2);
  let escrito = 0;
  let vueltas = 0;
  while (escrito < total) {
    const n = filtro.extract(tmp, Math.min(bloque, total - escrito));
    if (n === 0) break;
    for (let i = 0; i < n; i++) {
      l[escrito + i] = tmp[i * 2];
      r[escrito + i] = tmp[i * 2 + 1];
    }
    escrito += n;
    if (++vueltas % 8 === 0) {
      alAvanzar?.(escrito / total);
      await pausa();
    }
  }
  alAvanzar?.(1);
  return salida;
}
