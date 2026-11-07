import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { hashPassword } from '../utils/auth';
import { createPlatformAdmin } from './createPlatformAdmin';

export async function runSeed(): Promise<void> {
  console.log('🌱 [QuotePilot Seed] Starting idempotent database seed (v1)...');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGOURL);
  }

  // 1. Ensure Platform Admin
  await createPlatformAdmin();

  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  // 2. Create Sample Customer User
  const customerEmail = 'zain.customer@example.com';
  let customerUser = await User.findOne({ email: customerEmail });
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Zain Ahmed',
      email: customerEmail,
      passwordHash: hashedPassword,
      role: 'customer',
      phone: '+92 300 9876543',
      status: 'active'
    });
    console.log(`[Seed] ✅ Created sample customer: ${customerEmail}`);
  }

  // 3. Approved Company 1: Pixel & Pine Studio (Web Development)
  const co1AdminEmail = 'tariq.pixel@example.com';
  let co1Admin = await User.findOne({ email: co1AdminEmail });
  if (!co1Admin) {
    co1Admin = await User.create({
      name: 'Tariq Malik',
      email: co1AdminEmail,
      passwordHash: hashedPassword,
      role: 'company_admin',
      phone: '+92 321 8887766',
      status: 'active'
    });
  }

  const co1Slug = 'pixel-and-pine-studio';
  let co1 = await Company.findOne({ slug: co1Slug });
  const co1Data = {
    ownerUserId: co1Admin._id,
    name: 'Pixel & Pine Studio',
    slug: co1Slug,
    tagline: 'High-craft digital products, corporate SaaS & industrial web systems',
    description:
      'Award-winning full-stack digital development firm based in Islamabad. Specializing in high-performance Next.js architectures, complex marketplace workflows, and institutional SaaS compliance.',
    city: 'Islamabad',
    contactEmail: 'desk@pixelandpine.com',
    contactPhone: '+92 51 2894100',
    website: 'https://pixelandpine.com',
    mainCategory: 'Web Development',
    status: 'approved',
    ratingAverage: 4.9,
    ratingCount: 14,
    minStartingPrice: 40000,
    searchText: 'pixel & pine studio web development islamabad custom e-commerce retail box packaging',
    isSeedData: true,
    logo: {
      url: 'https://ik.imagekit.io/166ie5jqi/samples/pixel_pine_logo.png',
      fileId: 'seed_logo_co1'
    },
    portfolio: [
      {
        title: 'Bespoke Artisan Marketplace & Logistics Engine',
        description: 'Multi-vendor marketplace handling 10k daily orders with real-time inventory ledgering.',
        image: {
          url: 'https://ik.imagekit.io/166ie5jqi/samples/portfolio_marketplace.webp',
          fileId: 'seed_pf_1'
        }
      },
      {
        title: 'Fintech Escrow Portal & Payment Audit Desk',
        description: 'SECP sandbox compliant automated escrow reconciliation system with automated ledgering.',
        image: {
          url: 'https://ik.imagekit.io/166ie5jqi/samples/portfolio_fintech.webp',
          fileId: 'seed_pf_2'
        }
      }
    ]
  };

  if (!co1) {
    co1 = await Company.create(co1Data);
    console.log(`[Seed] ✅ Created approved company: ${co1.name}`);
  } else {
    Object.assign(co1, co1Data);
    await co1.save();
    console.log(`[Seed] ♻️ Updated approved company: ${co1.name}`);
  }

  co1Admin.companyId = co1._id as mongoose.Types.ObjectId;
  await co1Admin.save();

  // Seed Services for Company 1
  const co1Services = [
    {
      companyId: co1._id,
      title: 'Custom E-Commerce & Marketplace Architecture',
      category: 'Web Development',
      description:
        'Turnkey production-ready online commerce engine including custom carts, vendor ledgering, and mobile-optimized checkouts.',
      startingPrice: 75000,
      pricingUnit: 'starting_at' as const,
      deliveryTimeEstimate: '3 to 5 Weeks',
      requirementsChecklist: [
        { item: 'Catalog scope & expected SKU inventory size', required: true, order: 0 },
        { item: 'Payment gateway covenants & bank settlement accounts', required: true, order: 1 },
        { item: 'Target launch date SLA and milestone windows', required: true, order: 2 },
        { item: 'Third-party courier/logistics API integration requirements', required: false, order: 3 }
      ],
      isActive: true,
      isSeedData: true
    },
    {
      companyId: co1._id,
      title: 'Corporate Web Platform & Client Portal',
      category: 'Web Development',
      description:
        'High-security enterprise web portal with RBAC permissions, audit trail logging, and institutional branding.',
      startingPrice: 40000,
      pricingUnit: 'starting_at' as const,
      deliveryTimeEstimate: '10 to 14 Working Days',
      requirementsChecklist: [
        { item: 'Primary business goal and target user personas', required: true, order: 0 },
        { item: 'Corporate brand guidelines & high-res vector assets', required: true, order: 1 },
        { item: 'Estimated budget allocation and sign-off SLA', required: true, order: 2 }
      ],
      isActive: true,
      isSeedData: true
    }
  ];

  for (const srvData of co1Services) {
    await Service.findOneAndUpdate(
      { companyId: co1._id, title: srvData.title },
      srvData,
      { upsert: true, new: true }
    );
  }
  console.log(`[Seed] ✅ Configured services for ${co1.name}`);

  // 4. Approved Company 2: Hearth Interiors (Interior Design)
  const co2AdminEmail = 'ayla.hearth@example.com';
  let co2Admin = await User.findOne({ email: co2AdminEmail });
  if (!co2Admin) {
    co2Admin = await User.create({
      name: 'Ayla Khan',
      email: co2AdminEmail,
      passwordHash: hashedPassword,
      role: 'company_admin',
      phone: '+92 333 7776655',
      status: 'active'
    });
  }

  const co2Slug = 'hearth-interiors';
  let co2 = await Company.findOne({ slug: co2Slug });
  const co2Data = {
    ownerUserId: co2Admin._id,
    name: 'Hearth Interiors',
    slug: co2Slug,
    tagline: 'Bespoke residential architectural spaces and turnkey interior craft',
    description:
      'Premier architectural and interior design atelier in Lahore. Focused on timeless spatial design, sustainable indigenous materials, and meticulously curated commercial hospitality suites.',
    city: 'Lahore',
    contactEmail: 'concierge@hearthinteriors.pk',
    contactPhone: '+92 42 35789120',
    website: 'https://hearthinteriors.pk',
    mainCategory: 'Interior Design',
    status: 'approved',
    ratingAverage: 4.8,
    ratingCount: 9,
    minStartingPrice: 95000,
    searchText: 'hearth interiors interior design lahore residential architectural executive office',
    isSeedData: true,
    logo: {
      url: 'https://ik.imagekit.io/166ie5jqi/samples/hearth_logo.png',
      fileId: 'seed_logo_co2'
    },
    portfolio: [
      {
        title: 'Modern Minimalist Villa (DHA Phase 6)',
        description: 'Complete 1-Kanal residence spatial design featuring raw concrete, warm teak, and ambient light wells.',
        image: {
          url: 'https://ik.imagekit.io/166ie5jqi/samples/portfolio_residence.webp',
          fileId: 'seed_pf_3'
        }
      },
      {
        title: 'Private Wealth Management Headquarters',
        description: 'Bespoke corporate boardroom, executive lounges, and acoustic paneling for financial advisory firm.',
        image: {
          url: 'https://ik.imagekit.io/166ie5jqi/samples/portfolio_office.webp',
          fileId: 'seed_pf_4'
        }
      }
    ]
  };

  if (!co2) {
    co2 = await Company.create(co2Data);
    console.log(`[Seed] ✅ Created approved company: ${co2.name}`);
  } else {
    Object.assign(co2, co2Data);
    await co2.save();
    console.log(`[Seed] ♻️ Updated approved company: ${co2.name}`);
  }

  co2Admin.companyId = co2._id as mongoose.Types.ObjectId;
  await co2Admin.save();

  // Seed Services for Company 2
  const co2Services = [
    {
      companyId: co2._id,
      title: 'Turnkey Residential Interior Architecture',
      category: 'Interior Design',
      description:
        'Complete end-to-end design, 3D photorealistic renderings, material schedules, and on-site contractor supervision.',
      startingPrice: 150000,
      pricingUnit: 'starting_at' as const,
      deliveryTimeEstimate: '4 to 8 Weeks',
      requirementsChecklist: [
        { item: 'Floor plan CAD drawings or dimensions with ceiling height', required: true, order: 0 },
        { item: 'Design aesthetic preference (e.g. Minimalist, Japandi, Classical)', required: true, order: 1 },
        { item: 'Total covered area in sq. ft. or room breakdown', required: true, order: 2 },
        { item: 'Material finish and renovation budget bracket', required: true, order: 3 }
      ],
      isActive: true,
      isSeedData: true
    },
    {
      companyId: co2._id,
      title: 'Commercial Executive Suite & Boardroom Concept',
      category: 'Interior Design',
      description:
        'Professional commercial office planning maximizing natural light, ergonomic employee flow, and acoustic confidentiality.',
      startingPrice: 95000,
      pricingUnit: 'starting_at' as const,
      deliveryTimeEstimate: '3 to 4 Weeks',
      requirementsChecklist: [
        { item: 'Office floor plate layout and workstation count', required: true, order: 0 },
        { item: 'Acoustic / privacy requirements for conference rooms', required: true, order: 1 },
        { item: 'Move-in handover date deadline', required: true, order: 2 }
      ],
      isActive: true,
      isSeedData: true
    }
  ];

  for (const srvData of co2Services) {
    await Service.findOneAndUpdate(
      { companyId: co2._id, title: srvData.title },
      srvData,
      { upsert: true, new: true }
    );
  }
  console.log(`[Seed] ✅ Configured services for ${co2.name}`);

  // Helper for additional companies
  const additionalCompanies = [
    {
      admin: { name: 'Omar Farooq', email: 'omar.monogram@example.com', phone: '+92 301 5551122' },
      slug: 'monogram-and-co',
      name: 'Monogram & Co. Visual Identity',
      tagline: 'Precision typography, luxury brand marks & trademark design',
      description: 'Award-winning visual identity studio based in Lahore. Specializing in timeless corporate trademarks, comprehensive brand guidelines, and high-craft typography systems.',
      city: 'Lahore',
      contactEmail: 'desk@monogramco.com',
      contactPhone: '+92 42 3578901',
      website: 'https://monogramco.com',
      mainCategory: 'Logo Design',
      ratingAverage: 4.9,
      ratingCount: 19,
      minStartingPrice: 35000,
      searchText: 'monogram & co visual identity logo design branding typography lahore',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-logo-design.jpg',
      portfolio: [
        {
          title: 'Imperial Foundry Brand Re-architecture',
          description: 'Complete corporate visual identity guidelines and vector monogram suite.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-logo-design.jpg', fileId: 'pf_mono_1' }
        }
      ],
      services: [
        {
          title: 'Full Brand Identity & Vector Guideline Book',
          category: 'Logo Design',
          description: 'Comprehensive brand identity comprising primary/secondary marks, color theory, typography hierarchy, and collateral assets.',
          startingPrice: 50000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: '2 to 3 Weeks',
          requirementsChecklist: [
            { item: 'Company background, target audience, and industry sector', required: true, order: 0 },
            { item: 'Aesthetic moodboard or design preference benchmarks', required: true, order: 1 },
            { item: 'Trademark registration jurisdictions intended', required: false, order: 2 }
          ]
        }
      ]
    },
    {
      admin: { name: 'Bilal Khan', email: 'bilal.ledgerstone@example.com', phone: '+92 333 4447788' },
      slug: 'ledgerstone-advisory-audit',
      name: 'Ledgerstone Advisory & Audit',
      tagline: 'SECP statutory audits, corporate tax structuring & financial bookkeeping',
      description: 'Chartered corporate accounting practice in Karachi. Providing statutory compliance, cross-border tax advisory, and automated bookkeeping infrastructure for fast-growing ventures.',
      city: 'Karachi',
      contactEmail: 'advisory@ledgerstone.com',
      contactPhone: '+92 21 3456789',
      website: 'https://ledgerstone.com',
      mainCategory: 'Accounting',
      ratingAverage: 4.8,
      ratingCount: 27,
      minStartingPrice: 45000,
      searchText: 'ledgerstone advisory audit accounting secp tax corporate bookkeeping karachi',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-accounting.jpg',
      portfolio: [
        {
          title: 'Institutional Holding Group Annual Audit',
          description: 'Multi-subsidiary consolidated financial audit and SECP statutory filing.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-accounting.jpg', fileId: 'pf_ledg_1' }
        }
      ],
      services: [
        {
          title: 'Corporate SECP Compliance & Statutory Tax Audit',
          category: 'Accounting',
          description: 'Complete year-end balance sheet reconciliation, tax filing covenant, and regulatory compliance certificate.',
          startingPrice: 65000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: '2 to 4 Weeks',
          requirementsChecklist: [
            { item: 'Prior year financial statements and general ledger access', required: true, order: 0 },
            { item: 'Bank statement reconciliations for past 12 months', required: true, order: 1 },
            { item: 'SECP incorporation number and NTN registration', required: true, order: 2 }
          ]
        }
      ]
    },
    {
      admin: { name: 'Hina Qureshi', email: 'hina.apexgrowth@example.com', phone: '+92 312 9993322' },
      slug: 'apex-growth-studio',
      name: 'Apex Growth Studio',
      tagline: 'Performance acquisition, data-driven paid social & omnichannel retention',
      description: 'Results-obsessed digital marketing agency in Islamabad. Managing millions in annual ad spend with guaranteed ROAS covenants and custom analytics tracking.',
      city: 'Islamabad',
      contactEmail: 'growth@apexgrowth.com',
      contactPhone: '+92 51 4567890',
      website: 'https://apexgrowth.com',
      mainCategory: 'Digital Marketing',
      ratingAverage: 4.7,
      ratingCount: 31,
      minStartingPrice: 50000,
      searchText: 'apex growth studio digital marketing performance roas seo ppc islamabad',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-digital-marketing.jpg',
      portfolio: [
        {
          title: 'Direct-to-Consumer Fintech Scaling Campaign',
          description: 'Achieved 3.8x blended return on ad spend across Meta and Google Search.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-digital-marketing.jpg', fileId: 'pf_apex_1' }
        }
      ],
      services: [
        {
          title: 'Omnichannel Performance Marketing & Paid Acquisition',
          category: 'Digital Marketing',
          description: 'Conversion-rate optimized ad campaigns with daily tracking and real-time ROAS dashboards.',
          startingPrice: 60000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: 'Monthly Retainer',
          requirementsChecklist: [
            { item: 'Current monthly ad spend budget and historical CAC metrics', required: true, order: 0 },
            { item: 'Target demographic profile and key geographical territories', required: true, order: 1 },
            { item: 'Analytics pixel & Conversion API access credentials', required: true, order: 2 }
          ]
        }
      ]
    },
    {
      admin: { name: 'Maryam Siddiqui', email: 'maryam.scribequill@example.com', phone: '+92 345 6667788' },
      slug: 'scribe-and-quill-editorial',
      name: 'Scribe & Quill Editorial',
      tagline: 'Institutional whitepapers, technical documentation & corporate storytelling',
      description: 'Elite editorial atelier delivering meticulously researched technical whitepapers, executive thought leadership, and high-impact commercial copy.',
      city: 'Lahore',
      contactEmail: 'editorial@scribequill.com',
      contactPhone: '+92 42 7891234',
      website: 'https://scribequill.com',
      mainCategory: 'Content Writing',
      ratingAverage: 4.9,
      ratingCount: 22,
      minStartingPrice: 30000,
      searchText: 'scribe and quill editorial content writing technical copy whitepaper lahore',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-content-writing.jpg',
      portfolio: [
        {
          title: 'Enterprise AI Governance Whitepaper',
          description: '45-page deep-dive policy monograph commissioned by banking trade consortium.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-content-writing.jpg', fileId: 'pf_scribe_1' }
        }
      ],
      services: [
        {
          title: 'Technical Whitepaper & Commercial Case Studies',
          category: 'Content Writing',
          description: 'Deep-dive analytical research papers and peer-reviewed case studies with full citation rigor.',
          startingPrice: 45000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: '2 to 3 Weeks',
          requirementsChecklist: [
            { item: 'Primary thesis, objective, and intended readership profile', required: true, order: 0 },
            { item: 'Raw research materials, internal data points, or subject matter expert access', required: true, order: 1 },
            { item: 'Target word count or document length range', required: true, order: 2 }
          ]
        }
      ]
    },
    {
      admin: { name: 'Kashif Mehmood', email: 'kashif.archiform@example.com', phone: '+92 334 1118899' },
      slug: 'archiform-3d-renders',
      name: 'Archiform 3D Renders',
      tagline: 'Photorealistic architectural visualization, BIM coordination & 3D animations',
      description: 'State-of-the-art architectural visualization studio delivering photorealistic ray-traced exterior renders, interior walk-throughs, and municipal submission drawings.',
      city: 'Rawalpindi',
      contactEmail: 'studio@archiform3d.com',
      contactPhone: '+92 51 8901234',
      website: 'https://archiform3d.com',
      mainCategory: 'Architecture & 3D',
      ratingAverage: 4.9,
      ratingCount: 18,
      minStartingPrice: 70000,
      searchText: 'archiform 3d renders architecture architectural visualization bim rawalpindi',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-architecture-3d.jpg',
      portfolio: [
        {
          title: 'Mid-Century Travertine Civic Center Render',
          description: 'Ray-traced 8K exterior architectural lighting and landscape study.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-architecture-3d.jpg', fileId: 'pf_archi_1' }
        }
      ],
      services: [
        {
          title: 'Photorealistic 3D Architectural Visualization',
          category: 'Architecture & 3D',
          description: 'High-fidelity exterior and interior CGI renderings with physically accurate daylighting and materials.',
          startingPrice: 85000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: '3 to 4 Weeks',
          requirementsChecklist: [
            { item: 'Architectural CAD plans (DWG/DXF) or Revit model', required: true, order: 0 },
            { item: 'Exterior landscape and material finish specifications', required: true, order: 1 },
            { item: 'Required camera angles and output resolution (4K/8K)', required: true, order: 2 }
          ]
        }
      ]
    },
    {
      admin: { name: 'Daniyal Raza', email: 'daniyal.swiftcraft@example.com', phone: '+92 302 7772211' },
      slug: 'swiftcraft-mobile-labs',
      name: 'SwiftCraft Mobile Labs',
      tagline: 'High-performance iOS Swift, Android Kotlin & React Native engineering',
      description: 'Engineered mobile applications built with native performance, offline-first sync engines, biometric security, and clean modern micro-interactions.',
      city: 'Karachi',
      contactEmail: 'contact@swiftcraftlabs.com',
      contactPhone: '+92 21 8904567',
      website: 'https://swiftcraftlabs.com',
      mainCategory: 'App Development',
      ratingAverage: 4.8,
      ratingCount: 25,
      minStartingPrice: 80000,
      searchText: 'swiftcraft mobile labs app development ios android flutter react native karachi',
      logoUrl: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-app-dev.jpg',
      portfolio: [
        {
          title: 'Cryptographic Escrow Mobile Wallet',
          description: 'Native iOS application with biometric authentication and hardware enclave keys.',
          image: { url: 'https://ik.imagekit.io/166ie5jqi/quotepilot/categories/cat-app-dev.jpg', fileId: 'pf_swift_1' }
        }
      ],
      services: [
        {
          title: 'Cross-Platform Flutter / React Native Mobile Application',
          category: 'App Development',
          description: 'Production-ready mobile application deployed to Apple App Store and Google Play Store with backend API integration.',
          startingPrice: 120000,
          pricingUnit: 'starting_at' as const,
          deliveryTimeEstimate: '4 to 8 Weeks',
          requirementsChecklist: [
            { item: 'Figma wireframes or screen-by-screen specification', required: true, order: 0 },
            { item: 'Target operating systems (iOS, Android, or both)', required: true, order: 1 },
            { item: 'Backend API documentation or database schema', required: true, order: 2 }
          ]
        }
      ]
    }
  ];

  for (const compData of additionalCompanies) {
    let admin = await User.findOne({ email: compData.admin.email });
    if (!admin) {
      admin = await User.create({
        name: compData.admin.name,
        email: compData.admin.email,
        passwordHash: hashedPassword,
        role: 'company_admin',
        phone: compData.admin.phone,
        status: 'active'
      });
    }

    let comp = await Company.findOne({ slug: compData.slug });
    const payload = {
      ownerUserId: admin._id,
      name: compData.name,
      slug: compData.slug,
      tagline: compData.tagline,
      description: compData.description,
      city: compData.city,
      contactEmail: compData.contactEmail,
      contactPhone: compData.contactPhone,
      website: compData.website,
      mainCategory: compData.mainCategory,
      status: 'approved',
      ratingAverage: compData.ratingAverage,
      ratingCount: compData.ratingCount,
      minStartingPrice: compData.minStartingPrice,
      searchText: compData.searchText,
      isSeedData: true,
      logo: {
        url: compData.logoUrl,
        fileId: `logo_${compData.slug}`
      },
      portfolio: compData.portfolio
    };

    if (!comp) {
      comp = await Company.create(payload);
      console.log(`[Seed] ✅ Created approved company: ${comp.name}`);
    } else {
      Object.assign(comp, payload);
      await comp.save();
      console.log(`[Seed] ♻️ Updated approved company: ${comp.name}`);
    }

    admin.companyId = comp._id as mongoose.Types.ObjectId;
    await admin.save();

    for (const srv of compData.services) {
      await Service.findOneAndUpdate(
        { companyId: comp._id, title: srv.title },
        { ...srv, companyId: comp._id, isActive: true, isSeedData: true },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] ✅ Configured services for ${comp.name}`);
  }

  console.log('🎉 [QuotePilot Seed] Idempotent seed completed successfully for all 8 categories!');
}

if (process.env.NODE_ENV !== 'test' && (!process.argv[1] || process.argv[1].includes('seed'))) {
  runSeed()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [QuotePilot Seed Error]:', err);
      process.exit(1);
    });
}
