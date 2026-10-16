// "Modo rápido": quita la voz en el propio celular, gratis e instantáneo.
// La voz suele estar en el centro de la mezcla: restando canal izquierdo menos derecho se cancela.
// Para no perder los bajos (que también van al centro) se devuelven los graves por debajo de ~140 Hz.
// Funciona mejor con grabaciones de estudio en estéreo; no es tan limpio como el motor con IA.

export async function separarRapido(buffer) {
  const { sampleRate, length } = buffer;
  const L = buffer.getChannelData(0);
  const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;

  // Pista sin voz (mono): (L - R) + graves del centro
  const sinVoz = new OfflineAudioContext(1, length, sampleRate);
  const diff = sinVoz.createBuffer(1, length, sampleRate);
  const centro = sinVoz.createBuffer(1, length, sampleRate);
  const d = diff.getChannelData(0);
  const c = centro.getChannelData(0);
  for (let i = 0; i < length; i++) {
    d[i] = (L[i] - R[i]) * 0.5;
    c[i] = (L[i] + R[i]) * 0.5;
  }
  const fDiff = sinVoz.createBufferSource();
  fDiff.buffer = diff;
  const fGraves = sinVoz.createBufferSource();
  fGraves.buffer = centro;
  const pasaBajos = sinVoz.createBiquadFilter();
  pasaBajos.type = 'lowpass';
  pasaBajos.frequency.value = 140;
  const pasaBajos2 = sinVoz.createBiquadFilter();
  pasaBajos2.type = 'lowpass';
  pasaBajos2.frequency.value = 140;
  const volumen = sinVoz.createGain();
  volumen.gain.value = 1.4;
  fGraves.connect(pasaBajos).connect(pasaBajos2).connect(sinVoz.destination);
  fDiff.connect(volumen).connect(sinVoz.destination);
  fDiff.start();
  fGraves.start();

  // Voz aproximada: el centro filtrado a la zona de la voz humana
  const soloVoz = new OfflineAudioContext(1, length, sampleRate);
  const fVoz = soloVoz.createBufferSource();
  fVoz.buffer = centro;
  const agudos = soloVoz.createBiquadFilter();
  agudos.type = 'highpass';
  agudos.frequency.value = 180;
  const graves = soloVoz.createBiquadFilter();
  graves.type = 'lowpass';
  graves.frequency.value = 6000;
  fVoz.connect(agudos).connect(graves).connect(soloVoz.destination);
  fVoz.start();

  const [instrumental, voz] = await Promise.all([sinVoz.startRendering(), soloVoz.startRendering()]);
  normalizar(instrumental);
  return { instrumental, voz };
}

function normalizar(buffer) {
  let max = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const datos = buffer.getChannelData(c);
    for (let i = 0; i < datos.length; i++) max = Math.max(max, Math.abs(datos[i]));
  }
  if (max < 0.01 || max > 0.95) return;
  const g = 0.9 / max;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const datos = buffer.getChannelData(c);
    for (let i = 0; i < datos.length; i++) datos[i] *= g;
  }
}
