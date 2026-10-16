// Conexión con el "motor" de IA (un Space gratis de Hugging Face con Demucs + yt-dlp).
import { Client, handle_file } from '@gradio/client';

const CLAVE = 'lucesita-motor';

export function motorConfigurado() {
  return obtenerMotor() !== '';
}

export function obtenerMotor() {
  let guardado = '';
  try {
    guardado = localStorage.getItem(CLAVE) || '';
  } catch {}
  return (guardado || import.meta.env.PUBLIC_MOTOR_URL || '').trim().replace(/^https?:\/\/huggingface\.co\/spaces\//, '');
}

export function guardarMotor(valor) {
  try {
    localStorage.setItem(CLAVE, valor.trim());
  } catch {}
}

let cliente = null;

async function conectar(aviso) {
  if (cliente) return cliente;
  const motor = obtenerMotor();
  if (!motor) throw new Error('Falta configurar el motor (⚙️ Ajustes).');
  aviso('Conectando con el motor…');
  cliente = await Client.connect(motor, {
    status_callback: (s) => {
      if (s.status === 'sleeping' || s.status === 'starting' || s.status === 'building') {
        aviso('El motor estaba dormido 😴 despertándolo… (puede tardar 1 o 2 minutos)');
      } else if (s.status === 'paused' || s.status === 'space_error') {
        aviso('El motor está apagado o con error. Revisa el Space en Hugging Face.');
      }
    },
  });
  return cliente;
}

/**
 * Envía la canción al motor.
 * entrada = { archivo: File } o { youtube: 'https://...' }
 * Devuelve { titulo, instrumental: Blob, voz: Blob }
 */
export async function separarConIA(entrada, aviso) {
  try {
    const app = await conectar(aviso);
    const trabajo = entrada.archivo
      ? app.submit('/separar', [handle_file(entrada.archivo)])
      : app.submit('/desde_youtube', [entrada.youtube]);

    let resultado = null;
    for await (const msg of trabajo) {
      if (msg.type === 'status') {
        if (msg.stage === 'pending' && msg.position > 0) {
          aviso(`Hay ${msg.position} canción(es) antes que la tuya en la fila… ⏳`);
        } else if (msg.stage === 'pending' || msg.stage === 'generating') {
          const p = msg.progress_data?.[0];
          aviso(p?.desc || 'La inteligencia artificial está separando la voz… 🎶', p?.progress ?? null);
        } else if (msg.stage === 'error') {
          throw new Error(textoError(msg.message));
        }
      } else if (msg.type === 'data') {
        resultado = msg.data;
        break;
      }
    }
    if (!resultado) throw new Error('El motor no devolvió nada. Intenta de nuevo.');

    const [instrumental, voz, titulo] = resultado;
    aviso('Bajando las pistas al celular… 📲');
    const [bInst, bVoz] = await Promise.all([bajar(instrumental), bajar(voz)]);
    return { titulo: titulo || entrada.archivo?.name?.replace(/\.[^.]+$/, '') || 'Canción', instrumental: bInst, voz: bVoz };
  } catch (e) {
    cliente = null;
    throw new Error(textoError(e?.message));
  }
}

async function bajar(archivo) {
  const url = typeof archivo === 'string' ? archivo : archivo?.url;
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo bajar la pista del motor.');
  return await r.blob();
}

function textoError(m) {
  const t = Array.isArray(m) ? m.map((x) => x.message || x).join(' ') : String(m || '');
  if (!t || t === 'undefined') return 'Algo salió mal con el motor. Intenta de nuevo en un momento.';
  if (/fetch|network|Failed to/i.test(t)) return 'No hay conexión con el motor. Revisa el internet o la dirección del motor.';
  return t;
}
