import fs from 'fs';
import path from 'path';
import ImageKit from 'imagekit';
import { env } from '../config/env';

const ik = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT
});

async function main() {
  console.log('--- QuotePilot ImageKit Asset Synchronization ---');
  console.log(`Target ImageKit Endpoint: ${env.IMAGEKIT_URL_ENDPOINT}`);

  const results: Record<string, string> = {};

  // 1. Upload existing local AI images
  const localImages = [
    { name: 'hero-covenant.jpg', file: path.resolve(__dirname, '../../../frontend/public/images/hero-covenant.jpg') },
    { name: 'hearth-architecture.jpg', file: path.resolve(__dirname, '../../../frontend/public/images/hearth-architecture.jpg') },
    { name: 'pixel-branding.jpg', file: path.resolve(__dirname, '../../../frontend/public/images/pixel-branding.jpg') }
  ];

  for (const img of localImages) {
    if (fs.existsSync(img.file)) {
      console.log(`Uploading local file to ImageKit: ${img.name}...`);
      const fileBuffer = fs.readFileSync(img.file);
      const res = await ik.upload({
        file: fileBuffer.toString('base64'),
        fileName: img.name,
        folder: '/quotepilot/hero',
        useUniqueFileName: false
      });
      console.log(`✓ Uploaded ${img.name} -> ${res.url}`);
      results[img.name] = res.url;
    } else {
      console.warn(`File not found: ${img.file}`);
    }
  }

  // 2. Upload curated, high-resolution visuals for the 8 categories
  const categoryImages = [
    {
      category: 'Web Development',
      slug: 'web-dev',
      sourceUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Interior Design',
      slug: 'interior-design',
      sourceUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Logo Design',
      slug: 'logo-design',
      sourceUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Accounting',
      slug: 'accounting',
      sourceUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Digital Marketing',
      slug: 'digital-marketing',
      sourceUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Content Writing',
      slug: 'content-writing',
      sourceUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'Architecture & 3D',
      slug: 'architecture-3d',
      sourceUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80'
    },
    {
      category: 'App Development',
      slug: 'app-dev',
      sourceUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80'
    }
  ];

  for (const cat of categoryImages) {
    console.log(`Uploading category image for ${cat.category} to ImageKit...`);
    const res = await ik.upload({
      file: cat.sourceUrl,
      fileName: `cat-${cat.slug}.jpg`,
      folder: '/quotepilot/categories',
      useUniqueFileName: false
    });
    console.log(`✓ Uploaded ${cat.category} -> ${res.url}`);
    results[cat.category] = res.url;
  }

  // Save generated asset map to a JSON file in both backend and frontend
  const outPath = path.resolve(__dirname, '../../../frontend/src/config/imagekit-assets.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Saved ImageKit asset registry to: ${outPath}`);
  console.log('Asset synchronization complete!');
}

main().catch((err) => {
  console.error('Asset upload failure:', err);
  process.exit(1);
});
