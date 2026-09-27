import { getT } from '../i18n';

const MAX_SIDE = 1600;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Redraws the image on a canvas and exports it as JPEG. This drops all
 * metadata (EXIF, GPS, device model) and shrinks large screenshots.
 */
export async function stripAndShrink(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error(getT().errors.imageType(file.name));
  if (file.size > MAX_BYTES) throw new Error(getT().errors.imageSize(file.name));

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}
