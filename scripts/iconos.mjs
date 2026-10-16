// Genera los íconos PNG de la app a partir de public/icons/icono.svg
import sharp from 'sharp';

const svg = 'public/icons/icono.svg';
for (const t of [192, 512]) {
  await sharp(svg).resize(t, t).png().toFile(`public/icons/icono-${t}.png`);
}
// Versión "maskable": el dibujo un poco más pequeño para que Android lo recorte en círculo sin cortarlo
const interior = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#8a2bea' } })
  .composite([{ input: interior, gravity: 'center' }])
  .png()
  .toFile('public/icons/icono-maskable-512.png');
console.log('Íconos listos ✨');
