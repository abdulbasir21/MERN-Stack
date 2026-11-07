import { Request, Response } from 'express';
import { SERVICE_CATEGORIES } from '../../config/constants';
import { slugify } from '../../utils/slugify';
import { sendSuccess } from '../../utils/response';

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
}

const CATEGORY_DETAILS: Record<string, string> = {
  'Web Development': 'Modern websites, full-stack web applications, e-commerce stores, and APIs.',
  'Interior Design': 'Residential, corporate office, commercial retail, and architectural interior spaces.',
  'Logo Design': 'Brand identity packages, vector trademarks, guidelines, and corporate iconography.',
  'Accounting': 'Tax filing, corporate audits, bookkeeping, payroll, and financial compliance.',
  'Digital Marketing': 'Performance advertising, SEO, social media marketing, and content campaigns.',
  'Content Writing': 'Technical copywriting, brand storytelling, blogs, articles, and whitepapers.',
  'Architecture & 3D': '3D modeling, architectural blueprints, photorealistic renders, and CAD drafting.',
  'App Development': 'Native iOS, Android, and cross-platform Flutter/React Native mobile solutions.'
};

export class CategoryController {
  static getCategories = (_req: Request, res: Response): void => {
    const categories: CategoryInfo[] = SERVICE_CATEGORIES.map((cat) => ({
      id: slugify(cat),
      name: cat,
      slug: slugify(cat),
      description: CATEGORY_DETAILS[cat] || `${cat} professional services.`
    }));

    sendSuccess(res, { categories });
  };
}
