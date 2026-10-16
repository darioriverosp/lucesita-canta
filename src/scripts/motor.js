// Conexión con el "motor" de IA en Modal (Demucs en una GPU + yt-dlp).
const CLAVE = 'lucesita-motor';
const POR_DEFECTO = 'https://darioriverosp--lucesita-motor.modal.run';

export function motorConfigurado() {
  return obtenerMotor() !== '';
}

export function obtenerMotor() {
  let guardado = '';
  try {
    guardado = localStorage.getItem(CLAVE) || '';
  } catch {}
  return (guardado || import.meta.env.PUBLIC_MOTOR_URL || POR_DEFECTO).trim().replace(/\/+$/, '');
}

export function guardarMotor(valor) {
  try {
    if (valor.trim()) localStorage.setItem(CLAVE, valor.trim());
    else localStorage.removeItem(CLAVE);
  } catch {}
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(ruta, opciones) {
  let r;
  try {
    r = await fetch(`${obtenerMotor()}${ruta}`, opciones);
  } catch {
    throw new Error('No hay conexión con el motor. Revisa el internet e intenta de nuevo.');
  }
  if (!r.ok) {
    let detalle = '';
    try {
      detalle = (await r.json()).detail;
    } catch {}
    throw new Error(typeof detalle === 'string' && detalle ? detalle : `El motor respondió con un error (${r.status}).`);
  }
  return r;
}

/**
 * Envía la canción al motor.
 * entrada = { archivo: File } o { youtube: 'https://...' }
 * Devuelve { titulo, instrumental: Blob, voz: Blob }
 */
export async function separarConIA(entrada, aviso) {
  aviso('Enviando la canción… 📤');
  let r;
  if (entrada.archivo) {
    const datos = new FormData();
    datos.append('archivo', entrada.archivo);
    r = await pedir('/separar', { method: 'POST', body: datos });
  } else {
    r = await pedir('/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: entrada.youtube }),
    });
  }
  const { id } = await r.json();

  const inicio = Date.now();
  let estado;
  while (true) {
    await esperar(3000);
    try {
      estado = await (await pedir(`/estado/${encodeURIComponent(id)}`)).json();
    } catch (e) {
      if (Date.now() - inicio > 15 * 60 * 1000) throw e;
      continue; // un corte de señal momentáneo no detiene el trabajo
    }
    if (estado.error) throw new Error(estado.error);
    if (estado.listo) break;
    const seg = Math.round((Date.now() - inicio) / 1000);
    aviso(`${estado.mensaje || 'Trabajando…'}  ·  ${seg} s`);
    if (Date.now() - inicio > 15 * 60 * 1000) throw new Error('El motor está tardando demasiado. Intenta de nuevo más tarde.');
  }

  aviso('Bajando las pistas al celular… 📲');
  const [inst, voz] = await Promise.all([
    pedir(`/pista/${encodeURIComponent(id)}/instrumental`).then((x) => x.blob()),
    pedir(`/pista/${encodeURIComponent(id)}/voz`).then((x) => x.blob()),
  ]);
  return {
    titulo: estado.titulo || entrada.archivo?.name?.replace(/\.[^.]+$/, '') || 'Canción',
    instrumental: inst,
    voz,
  };
}
