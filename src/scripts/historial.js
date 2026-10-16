// Historial de canciones guardado en el propio celular (IndexedDB).
import { get, set, del, keys, createStore } from 'idb-keyval';

// Nombre interno de la app anterior (Lucesita): se mantiene para no perder las canciones ya guardadas.
const almacen = createStore('lucesita-canta', 'canciones');

/** cancion = { id, titulo, fecha, modo: 'ia' | 'rapido', instrumental: Blob, voz: Blob } */
export async function guardar(cancion) {
  const id = cancion.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await set(id, { ...cancion, id, fecha: cancion.fecha || Date.now() }, almacen);
  pedirAlmacenamientoPersistente();
  return id;
}

export async function obtener(id) {
  return get(id, almacen);
}

export async function listar() {
  const ids = await keys(almacen);
  const todas = await Promise.all(ids.map((id) => get(id, almacen)));
  return todas.filter(Boolean).sort((a, b) => b.fecha - a.fecha);
}

export async function borrar(id) {
  await del(id, almacen);
}

function pedirAlmacenamientoPersistente() {
  navigator.storage?.persist?.().catch(() => {});
}
