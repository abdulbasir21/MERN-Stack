import type { ImageLoaderProps } from 'next/image';

export default function imageKitLoader({ src, width, quality }: ImageLoaderProps): string {
  const base = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '').replace(/\/+$/, '');
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${base}${path}?tr=w-${width},q-${quality || 75},f-auto`;
}
