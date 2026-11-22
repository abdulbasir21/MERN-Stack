import type { ImageLoaderProps } from 'next/image';

export default function imageKitLoader({ src, width, quality }: ImageLoaderProps): string {
  const base = (
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
    process.env.NEXT_PUBLIC_URL_ENDPOINT ||
    'https://ik.imagekit.io/166ie5jqi'
  ).replace(/\/+$/, '');
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${base}${path}?tr=w-${width},q-${quality || 75},f-auto`;
}
