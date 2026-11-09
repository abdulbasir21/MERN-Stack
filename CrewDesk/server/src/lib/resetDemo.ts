import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const CORE_DEMO_USERS = [
  {
    name: 'Tariq Mansoor',
    email: 'owner@crewdesk.agency',
    role: 'OWNER' as const,
    title: 'Chief Executive Officer & Founder',
    phone: '+1 (555) 019-2831',
    dept: 'Executive Leadership',
  },
  {
    name: 'Adnan Qureshi',
    email: 'hr@crewdesk.agency',
    role: 'HR_MANAGER' as const,
    title: 'Director of People Operations',
    phone: '+1 (555) 019-4492',
    dept: 'Executive Leadership',
  },
  {
    name: 'Rashid Al-Banna',
    email: 'pm@crewdesk.agency',
    role: 'PROJECT_MANAGER' as const,
    title: 'Principal Technical Project Lead',
    phone: '+1 (555) 019-7721',
    dept: 'Product & UX Design',
  },
  {
    name: 'Sohail Abbasi',
    email: 'finance@crewdesk.agency',
    role: 'FINANCE_MANAGER' as const,
    title: 'Chief Financial Controller',
    phone: '+1 (555) 019-8833',
    dept: 'Finance & Operations',
  },
  {
    name: 'Asim Zafar',
    email: 'inventory@crewdesk.agency',
    role: 'INVENTORY_MANAGER' as const,
    title: 'Global Assets & Facilities Lead',
    phone: '+1 (555) 019-5561',
    dept: 'Finance & Operations',
  },
  {
    name: 'Zain Khalid',
    email: 'employee@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Senior Full-Stack Engineer',
    phone: '+1 (555) 019-1104',
    dept: 'Engineering & Platform',
  },
] as const;

export const EXTRA_DEMO_EMPLOYEES = [
  {
    name: 'Farhan Siddiqui',
    email: 'farhan.siddiqui@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Staff Backend Engineer',
    phone: '+1 (555) 019-3011',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Kamran Mirza',
    email: 'kamran.mirza@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Cloud Infrastructure Architect',
    phone: '+1 (555) 019-3012',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Noman Hashmi',
    email: 'noman.hashmi@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Senior Frontend Engineer',
    phone: '+1 (555) 019-3013',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Salman Javed',
    email: 'salman.javed@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Site Reliability Engineer',
    phone: '+1 (555) 019-3014',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Waqas Shareef',
    email: 'waqas.shareef@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Principal Product Designer',
    phone: '+1 (555) 019-3015',
    dept: 'Product & UX Design',
  },
  {
    name: 'Zubair Kazmi',
    email: 'zubair.kazmi@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Design Systems Lead',
    phone: '+1 (555) 019-3016',
    dept: 'Product & UX Design',
  },
  {
    name: 'Haris Mehmood',
    email: 'haris.mehmood@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'UX Research Specialist',
    phone: '+1 (555) 019-3017',
    dept: 'Product & UX Design',
  },
  {
    name: 'Junaid Akram',
    email: 'junaid.akram@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Senior Security Engineer',
    phone: '+1 (555) 019-3018',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Danish Nawaz',
    email: 'danish.nawaz@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Quality Engineering Lead',
    phone: '+1 (555) 019-3019',
    dept: 'Engineering & Platform',
  },
  {
    name: 'Faisal Latif',
    email: 'faisal.latif@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'Financial Operations Analyst',
    phone: '+1 (555) 019-3020',
    dept: 'Finance & Operations',
  },
  {
    name: 'Imran Pasha',
    email: 'imran.pasha@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'IT Systems Administrator',
    phone: '+1 (555) 019-3021',
    dept: 'Finance & Operations',
  },
  {
    name: 'Rizwan Ghafoor',
    email: 'rizwan.ghafoor@crewdesk.agency',
    role: 'EMPLOYEE' as const,
    title: 'People Operations Coordinator',
    phone: '+1 (555) 019-3022',
    dept: 'Executive Leadership',
  },
] as const;

export async function resetDemoWorkspace() {
  const demoPasswordHash = await bcrypt.hash('CrewDesk2026!', 10);
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];

  const departmentsData = [
    'Executive Leadership',
    'Engineering & Platform',
    'Product & UX Design',
    'Finance & Operations',
  ];
  const leaveTypesData = [
    { name: 'ANNUAL', defaultAllowance: 20 },
    { name: 'SICK', defaultAllowance: 10 },
    { name: 'CASUAL', defaultAllowance: 5 },
  ];

  // 1. Upsert CompanySettings, Departments, and Leave Types in parallel
  const [, deptRecords, leaveTypeRecords] = await Promise.all([
    prisma.companySettings.upsert({
      where: { id: 'default-settings' },
      update: {},
      create: {
        id: 'default-settings',
        companyName: 'CrewDesk Enterprise Agency',
        currency: 'USD',
        timezone: 'UTC',
        officeStartTime: '09:00',
        lateGraceMinutes: 15,
      },
    }),
    Promise.all(
      departmentsData.map((name) =>
        prisma.department.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    ),
    Promise.all(
      leaveTypesData.map((lt) =>
        prisma.leaveType.upsert({
          where: { name: lt.name },
          update: { defaultAllowance: lt.defaultAllowance },
          create: { name: lt.name, defaultAllowance: lt.defaultAllowance },
        })
      )
    ),
  ]);

  const departments: Record<string, string> = {};
  for (const d of deptRecords) {
    departments[d.name] = d.id;
  }

  const leaveTypes: Record<string, string> = {};
  for (const lt of leaveTypeRecords) {
    leaveTypes[lt.name] = lt.id;
  }

  // 2. Upsert the 6 Core Demo Users IN-PLACE (keeps IDs, emails, roles, and password) + 12 extra employees
  const allDemoUsers = [...CORE_DEMO_USERS, ...EXTRA_DEMO_EMPLOYEES];
  const upsertedUsers = await Promise.all(
    allDemoUsers.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role,
          title: u.title,
          phone: u.phone,
          passwordHash: demoPasswordHash,
          departmentId: departments[u.dept],
          mustChangePassword: false,
          isActive: true,
          isDemo: true,
        },
        create: {
          name: u.name,
          email: u.email,
          passwordHash: demoPasswordHash,
          role: u.role,
          title: u.title,
          phone: u.phone,
          departmentId: departments[u.dept],
          mustChangePassword: false,
          isActive: true,
          isDemo: true,
        },
      })
    )
  );

  const userByEmail: Record<string, string> = {};
  const userByRole: Record<string, string> = {};
  for (const user of upsertedUsers) {
    userByEmail[user.email] = user.id;
    if (CORE_DEMO_USERS.some((c) => c.email === user.email)) {
      userByRole[user.role] = user.id;
    }
  }

  const demoUserIds = Object.values(userByEmail);

  const balanceRows: Prisma.LeaveBalanceCreateManyInput[] = [];
  for (const u of allDemoUsers) {
    const uid = userByEmail[u.email];
    for (const lt of leaveTypesData) {
      const usedDays =
        u.email === 'pm@crewdesk.agency' && lt.name === 'SICK'
          ? 2
          : u.email === 'farhan.siddiqui@crewdesk.agency' && lt.name === 'ANNUAL'
            ? 3
            : 0;
      balanceRows.push({
        userId: uid,
        leaveTypeId: leaveTypes[lt.name],
        year: currentYear,
        allowance: lt.defaultAllowance,
        used: usedDays,
      });
    }
  }

  // 3. Single batch transaction to atomically wipe transient demo records and reset balances
  await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({
      where: { key: { startsWith: 'demo-' } },
    }),
    prisma.taskComment.deleteMany({
      where: {
        OR: [{ authorId: { in: demoUserIds } }, { task: { project: { isDemo: true } } }],
      },
    }),
    prisma.task.deleteMany({
      where: { project: { isDemo: true } },
    }),
    prisma.milestone.deleteMany({
      where: { project: { isDemo: true } },
    }),
    prisma.projectMember.deleteMany({
      where: {
        OR: [{ project: { isDemo: true } }, { userId: { in: demoUserIds } }],
      },
    }),
    prisma.payment.deleteMany({
      where: {
        OR: [{ invoice: { client: { isDemo: true } } }, { recordedById: { in: demoUserIds } }],
      },
    }),
    prisma.invoice.deleteMany({
      where: {
        OR: [{ client: { isDemo: true } }, { createdById: { in: demoUserIds } }],
      },
    }),
    prisma.expense.deleteMany({
      where: {
        OR: [{ project: { isDemo: true } }, { recordedById: { in: demoUserIds } }],
      },
    }),
    prisma.project.deleteMany({
      where: { isDemo: true },
    }),
    prisma.client.deleteMany({
      where: {
        isDemo: true,
        email: { notIn: ['enterprise@acmetech.io', 'partners@novadynamics.com'] },
      },
    }),
    prisma.attendance.deleteMany({
      where: { userId: { in: demoUserIds } },
    }),
    prisma.leaveRequest.deleteMany({
      where: { userId: { in: demoUserIds } },
    }),
    prisma.leaveBalance.deleteMany({
      where: { userId: { in: demoUserIds }, year: currentYear },
    }),
    prisma.leaveBalance.createMany({
      data: balanceRows,
    }),
    prisma.assetAssignment.deleteMany({
      where: {
        OR: [{ item: { isDemo: true } }, { userId: { in: demoUserIds } }],
      },
    }),
    prisma.stockMovement.deleteMany({
      where: {
        OR: [{ item: { isDemo: true } }, { recordedById: { in: demoUserIds } }],
      },
    }),
    prisma.inventoryItem.deleteMany({
      where: {
        isDemo: true,
        serialNumber: {
          notIn: ['CD-APPLE-MBP-2026-01', 'CD-DELL-U32-2026-08', 'CD-LENOVO-X1-2026-19'],
        },
        name: {
          notIn: [
            'Cat6 Shielded High-Speed Ethernet Cable 10ft',
            'Anker 10-in-1 Thunderbolt 4 Docking Station',
          ],
        },
      },
    }),
    prisma.notification.deleteMany({
      where: { userId: { in: demoUserIds } },
    }),
    prisma.auditLog.deleteMany({
      where: { actorId: { in: demoUserIds } },
    }),
  ]);

  // 4. Re-seed baseline Demo Clients & Inventory Assets
  const [clientAcme, clientNova, asset1] = await Promise.all([
    prisma.client.upsert({
      where: { email: 'enterprise@acmetech.io' },
      update: {
        name: 'Acme Cloud Technologies',
        company: 'Acme Global Corp',
        phone: '+1 (800) 555-0100',
        notes: 'Tier 1 Strategic Enterprise Client - Point of Contact: Bilal Siddiqui (VP Engineering)',
        isDemo: true,
      },
      create: {
        name: 'Acme Cloud Technologies',
        email: 'enterprise@acmetech.io',
        company: 'Acme Global Corp',
        phone: '+1 (800) 555-0100',
        notes: 'Tier 1 Strategic Enterprise Client - Point of Contact: Bilal Siddiqui (VP Engineering)',
        isDemo: true,
      },
    }),
    prisma.client.upsert({
      where: { email: 'partners@novadynamics.com' },
      update: {
        name: 'Nova Dynamics AI',
        company: 'Nova Dynamics Inc',
        phone: '+1 (800) 555-0200',
        notes: 'Generative AI platform development - Point of Contact: Kashif Raza (CTO)',
        isDemo: true,
      },
      create: {
        name: 'Nova Dynamics AI',
        email: 'partners@novadynamics.com',
        company: 'Nova Dynamics Inc',
        phone: '+1 (800) 555-0200',
        notes: 'Generative AI platform development - Point of Contact: Kashif Raza (CTO)',
        isDemo: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { serialNumber: 'CD-APPLE-MBP-2026-01' },
      update: {
        name: 'MacBook Pro 16" M3 Max (64GB / 2TB)',
        category: 'Workstations',
        assignedUserId: userByRole['EMPLOYEE'],
        assetStatus: 'ASSIGNED',
        location: 'Primary Remote Workstation',
        notes: 'Issued to Senior Full-Stack Engineer Zain Khalid',
        isDemo: true,
      },
      create: {
        kind: 'ASSET',
        name: 'MacBook Pro 16" M3 Max (64GB / 2TB)',
        category: 'Workstations',
        serialNumber: 'CD-APPLE-MBP-2026-01',
        assetStatus: 'ASSIGNED',
        assignedUserId: userByRole['EMPLOYEE'],
        location: 'Primary Remote Workstation',
        notes: 'Issued to Senior Full-Stack Engineer Zain Khalid',
        isDemo: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { serialNumber: 'CD-DELL-U32-2026-08' },
      update: {
        name: 'Dell UltraSharp 32" 4K USB-C Hub Monitor',
        category: 'Monitors',
        assignedUserId: userByRole['PROJECT_MANAGER'],
        assetStatus: 'ASSIGNED',
        location: 'Agency Office - Desk 14',
        notes: 'Issued to Principal Technical Project Lead Rashid Al-Banna',
        isDemo: true,
      },
      create: {
        kind: 'ASSET',
        name: 'Dell UltraSharp 32" 4K USB-C Hub Monitor',
        category: 'Monitors',
        serialNumber: 'CD-DELL-U32-2026-08',
        assetStatus: 'ASSIGNED',
        assignedUserId: userByRole['PROJECT_MANAGER'],
        location: 'Agency Office - Desk 14',
        notes: 'Issued to Principal Technical Project Lead Rashid Al-Banna',
        isDemo: true,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { serialNumber: 'CD-LENOVO-X1-2026-19' },
      update: {
        name: 'Lenovo ThinkPad X1 Carbon Gen 12',
        category: 'Workstations',
        assignedUserId: null,
        assetStatus: 'AVAILABLE',
        location: 'Secure IT Locker B-2',
        isDemo: true,
      },
      create: {
        kind: 'ASSET',
        name: 'Lenovo ThinkPad X1 Carbon Gen 12',
        category: 'Workstations',
        serialNumber: 'CD-LENOVO-X1-2026-19',
        assetStatus: 'AVAILABLE',
        location: 'Secure IT Locker B-2',
        isDemo: true,
      },
    }),
  ]);

  let stockCables = await prisma.inventoryItem.findFirst({
    where: { name: 'Cat6 Shielded High-Speed Ethernet Cable 10ft', isDemo: true },
  });
  if (!stockCables) {
    stockCables = await prisma.inventoryItem.create({
      data: {
        kind: 'STOCK',
        name: 'Cat6 Shielded High-Speed Ethernet Cable 10ft',
        category: 'Peripherals & Cabling',
        currentQuantity: 38,
        minQuantity: 10,
        location: 'Storage Bay 3',
        isDemo: true,
      },
    });
  } else {
    stockCables = await prisma.inventoryItem.update({
      where: { id: stockCables.id },
      data: { currentQuantity: 38, minQuantity: 10, isDemo: true },
    });
  }

  let stockHubs = await prisma.inventoryItem.findFirst({
    where: { name: 'Anker 10-in-1 Thunderbolt 4 Docking Station', isDemo: true },
  });
  if (!stockHubs) {
    stockHubs = await prisma.inventoryItem.create({
      data: {
        kind: 'STOCK',
        name: 'Anker 10-in-1 Thunderbolt 4 Docking Station',
        category: 'Hardware Hubs',
        currentQuantity: 3,
        minQuantity: 6,
        location: 'IT Cabinet 1',
        isDemo: true,
      },
    });
  } else {
    stockHubs = await prisma.inventoryItem.update({
      where: { id: stockHubs.id },
      data: { currentQuantity: 3, minQuantity: 6, isDemo: true },
    });
  }

  // 5. Projects
  const [projectAlpha, projectBeta] = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Omni-Channel Customer Experience Platform',
        clientId: clientAcme.id,
        managerId: userByRole['PROJECT_MANAGER'],
        budget: new Prisma.Decimal('185000.00'),
        status: 'ACTIVE',
        description:
          'End-to-end redesign and cloud re-architecture of customer portals with real-time analytics.',
        startDate: new Date('2026-01-15'),
        deadline: new Date('2026-11-30'),
        isDemo: true,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Nova Enterprise AI Knowledge Engine',
        clientId: clientNova.id,
        managerId: userByRole['PROJECT_MANAGER'],
        budget: new Prisma.Decimal('120000.00'),
        status: 'ACTIVE',
        description:
          'Distributed retrieval-augmented indexing pipeline and multi-tenant governance dashboard.',
        startDate: new Date('2026-03-01'),
        deadline: new Date('2026-12-15'),
        isDemo: true,
      },
    }),
  ]);

  // 6. Tasks & Invoices (need IDs for comments & payments)
  const [task1, task2, inv1, inv2] = await Promise.all([
    prisma.task.create({
      data: {
        projectId: projectAlpha.id,
        title: 'Implement Resilient JWT & Session Invalidation',
        description: 'Enforce dual token flow with rotated refresh tokens in secure httpOnly cookies.',
        assigneeId: userByRole['EMPLOYEE'],
        createdById: userByRole['PROJECT_MANAGER'],
        priority: 'HIGH',
        status: 'DONE',
        progressPercent: 100,
        dueDate: new Date('2026-08-10'),
      },
    }),
    prisma.task.create({
      data: {
        projectId: projectAlpha.id,
        title: 'Database Query Optimization & Connection Pooling',
        description: 'Tune PostgreSQL indexes and pool size to handle peak 50,000 req/min gracefully.',
        assigneeId: userByRole['EMPLOYEE'],
        createdById: userByRole['PROJECT_MANAGER'],
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        progressPercent: 75,
        dueDate: new Date('2026-12-05'),
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-001',
        clientId: clientAcme.id,
        projectId: projectAlpha.id,
        subtotal: new Prisma.Decimal('50000.00'),
        tax: new Prisma.Decimal('0.00'),
        total: new Prisma.Decimal('50000.00'),
        status: 'SENT',
        issueDate: new Date('2026-02-01'),
        dueDate: new Date('2026-03-01'),
        createdById: userByRole['FINANCE_MANAGER'],
        notes: 'Initial Milestone 1 Settlement - Approved by Tariq Mansoor',
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-002',
        clientId: clientAcme.id,
        projectId: projectAlpha.id,
        subtotal: new Prisma.Decimal('65000.00'),
        tax: new Prisma.Decimal('0.00'),
        total: new Prisma.Decimal('65000.00'),
        status: 'SENT',
        issueDate: new Date('2026-08-01'),
        dueDate: new Date('2026-09-01'),
        createdById: userByRole['FINANCE_MANAGER'],
        notes: 'Milestone 2 Delivery Billing',
      },
    }),
  ]);

  const mkTime = (h: number, m: number) => {
    const d = new Date();
    d.setUTCHours(h, m, 0, 0);
    return d;
  };

  // 7. Single batch transaction for all remaining child records
  await prisma.$transaction([
    prisma.projectMember.createMany({
      data: [
        { projectId: projectAlpha.id, userId: userByRole['PROJECT_MANAGER'], role: 'Project Lead' },
        { projectId: projectAlpha.id, userId: userByRole['EMPLOYEE'], role: 'Lead Architect & Engineer' },
        { projectId: projectAlpha.id, userId: userByEmail['farhan.siddiqui@crewdesk.agency'], role: 'Staff Backend Engineer' },
        { projectId: projectAlpha.id, userId: userByEmail['noman.hashmi@crewdesk.agency'], role: 'Senior Frontend Engineer' },
        { projectId: projectAlpha.id, userId: userByEmail['waqas.shareef@crewdesk.agency'], role: 'Principal Product Designer' },
        { projectId: projectAlpha.id, userId: userByEmail['danish.nawaz@crewdesk.agency'], role: 'Quality Engineering Lead' },
        { projectId: projectBeta.id, userId: userByRole['PROJECT_MANAGER'], role: 'Project Lead' },
        { projectId: projectBeta.id, userId: userByRole['EMPLOYEE'], role: 'Principal Systems Advisor' },
        { projectId: projectBeta.id, userId: userByEmail['kamran.mirza@crewdesk.agency'], role: 'Cloud Infrastructure Architect' },
        { projectId: projectBeta.id, userId: userByEmail['salman.javed@crewdesk.agency'], role: 'Site Reliability Engineer' },
        { projectId: projectBeta.id, userId: userByEmail['junaid.akram@crewdesk.agency'], role: 'Senior Security Engineer' },
      ],
    }),
    prisma.milestone.createMany({
      data: [
        {
          projectId: projectAlpha.id,
          title: 'System Design & High-Throughput Architecture',
          dueDate: new Date('2026-03-31'),
          status: 'DONE',
          completedAt: new Date('2026-03-28'),
        },
        {
          projectId: projectAlpha.id,
          title: 'Core Engine Microservices Implementation',
          dueDate: new Date('2026-07-31'),
          status: 'DONE',
          completedAt: new Date('2026-07-25'),
        },
        {
          projectId: projectAlpha.id,
          title: 'Multi-Region High Availability & Security Sign-off',
          dueDate: new Date('2026-11-25'),
          status: 'PENDING',
        },
        {
          projectId: projectBeta.id,
          title: 'Vector Ingestion Pipeline & RBAC Enforcement',
          dueDate: new Date('2026-08-15'),
          status: 'DONE',
          completedAt: new Date('2026-08-12'),
        },
        {
          projectId: projectBeta.id,
          title: 'Latency & Compliance Benchmark Sign-off',
          dueDate: new Date('2026-12-01'),
          status: 'PENDING',
        },
      ],
    }),
    prisma.task.createMany({
      data: [
        {
          projectId: projectAlpha.id,
          title: 'Audit Trail & Role-Scope Verification Suite',
          description: 'Verify strict tenant and demo scope isolation across all API endpoints.',
          assigneeId: userByEmail['farhan.siddiqui@crewdesk.agency'],
          createdById: userByRole['PROJECT_MANAGER'],
          priority: 'HIGH',
          status: 'DONE',
          progressPercent: 100,
          dueDate: new Date('2026-09-18'),
        },
        {
          projectId: projectBeta.id,
          title: 'Zero-Downtime Schema Migration & Read Replica Routing',
          description: 'Configure automated failover and connection pooling for regional clusters.',
          assigneeId: userByEmail['kamran.mirza@crewdesk.agency'],
          createdById: userByRole['PROJECT_MANAGER'],
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          progressPercent: 60,
          dueDate: new Date('2026-12-10'),
        },
      ],
    }),
    prisma.taskComment.createMany({
      data: [
        {
          taskId: task1.id,
          authorId: userByRole['EMPLOYEE'],
          content: 'Implemented with token hash storage in PostgreSQL and complete test coverage.',
        },
        {
          taskId: task2.id,
          authorId: userByRole['PROJECT_MANAGER'],
          content: 'Benchmarked latency reduction of 42% on read endpoints. Ready for final load tests.',
        },
      ],
    }),
    prisma.payment.createMany({
      data: [
        {
          invoiceId: inv1.id,
          amount: new Prisma.Decimal('50000.00'),
          date: new Date('2026-02-20'),
          method: 'BANK_TRANSFER',
          reference: 'WIRE-ACME-88912',
          recordedById: userByRole['FINANCE_MANAGER'],
          notes: 'Received in full via corporate wire transfer',
        },
        {
          invoiceId: inv2.id,
          amount: new Prisma.Decimal('30000.00'),
          date: new Date('2026-08-15'),
          method: 'BANK_TRANSFER',
          reference: 'WIRE-ACME-90214',
          recordedById: userByRole['FINANCE_MANAGER'],
          notes: 'Tranche 1 payment recorded by Sohail Abbasi',
        },
      ],
    }),
    prisma.expense.createMany({
      data: [
        {
          projectId: projectAlpha.id,
          category: 'SOFTWARE',
          amount: new Prisma.Decimal('3200.00'),
          description: 'Vercel Enterprise, Neon DB, and observability subscription',
          date: new Date('2026-03-01'),
          recordedById: userByRole['FINANCE_MANAGER'],
        },
        {
          projectId: projectAlpha.id,
          category: 'HARDWARE',
          amount: new Prisma.Decimal('4800.00'),
          description: 'Dedicated staging load-testing appliance rack',
          date: new Date('2026-04-10'),
          recordedById: userByRole['FINANCE_MANAGER'],
        },
        {
          projectId: projectAlpha.id,
          category: 'CONTRACTOR',
          amount: new Prisma.Decimal('8500.00'),
          description: 'External Cyber-Security Penetration Test & Audit Sign-off',
          date: new Date('2026-07-20'),
          recordedById: userByRole['FINANCE_MANAGER'],
        },
      ],
    }),
    prisma.attendance.createMany({
      data: [
        {
          userId: userByRole['EMPLOYEE'],
          date: todayStr,
          checkIn: mkTime(8, 48),
          checkOut: mkTime(17, 18),
          workingHours: new Prisma.Decimal('8.50'),
          isLate: false,
          notes: 'Full workday logged with sprint velocity goals achieved',
        },
        {
          userId: userByRole['PROJECT_MANAGER'],
          date: todayStr,
          checkIn: mkTime(9, 28),
          checkOut: null,
          workingHours: null,
          isLate: true,
          notes: 'Morning client briefing call with Acme Cloud engineering team',
        },
        {
          userId: userByRole['HR_MANAGER'],
          date: todayStr,
          checkIn: mkTime(8, 55),
          checkOut: mkTime(17, 10),
          workingHours: new Prisma.Decimal('8.25'),
          isLate: false,
          notes: 'Quarterly people operations review',
        },
        {
          userId: userByRole['FINANCE_MANAGER'],
          date: todayStr,
          checkIn: mkTime(8, 50),
          checkOut: mkTime(17, 20),
          workingHours: new Prisma.Decimal('8.50'),
          isLate: false,
          notes: 'Reconciled Q3 enterprise invoices',
        },
        {
          userId: userByRole['INVENTORY_MANAGER'],
          date: todayStr,
          checkIn: mkTime(9, 2),
          checkOut: mkTime(17, 17),
          workingHours: new Prisma.Decimal('8.25'),
          isLate: false,
          notes: 'Completed hardware locker audit',
        },
        {
          userId: userByEmail['farhan.siddiqui@crewdesk.agency'],
          date: todayStr,
          checkIn: mkTime(8, 45),
          checkOut: mkTime(17, 15),
          workingHours: new Prisma.Decimal('8.50'),
          isLate: false,
          notes: 'API throughput optimization sprint',
        },
        {
          userId: userByEmail['kamran.mirza@crewdesk.agency'],
          date: todayStr,
          checkIn: mkTime(9, 5),
          checkOut: null,
          workingHours: null,
          isLate: false,
          notes: 'Cluster maintenance window monitoring',
        },
        {
          userId: userByEmail['noman.hashmi@crewdesk.agency'],
          date: todayStr,
          checkIn: mkTime(8, 58),
          checkOut: mkTime(17, 28),
          workingHours: new Prisma.Decimal('8.50'),
          isLate: false,
          notes: 'Dashboard accessibility verification',
        },
      ],
    }),
    prisma.leaveRequest.createMany({
      data: [
        {
          userId: userByRole['EMPLOYEE'],
          leaveTypeId: leaveTypes['ANNUAL'],
          startDate: new Date('2026-12-21'),
          endDate: new Date('2026-12-24'),
          daysCount: 4,
          status: 'PENDING',
          reason: 'Year-end family travel',
        },
        {
          userId: userByEmail['noman.hashmi@crewdesk.agency'],
          leaveTypeId: leaveTypes['CASUAL'],
          startDate: new Date('2026-12-14'),
          endDate: new Date('2026-12-15'),
          daysCount: 2,
          status: 'PENDING',
          reason: 'Personal administrative appointments',
        },
        {
          userId: userByRole['PROJECT_MANAGER'],
          leaveTypeId: leaveTypes['SICK'],
          startDate: new Date('2026-06-10'),
          endDate: new Date('2026-06-11'),
          daysCount: 2,
          status: 'APPROVED',
          reason: 'Seasonal recovery',
          decidedById: userByRole['HR_MANAGER'],
          decidedAt: new Date('2026-06-09'),
        },
      ],
    }),
    prisma.assetAssignment.create({
      data: {
        itemId: asset1.id,
        userId: userByRole['EMPLOYEE'],
        assignedById: userByRole['INVENTORY_MANAGER'],
        condition: 'Pristine / Factory Sealed',
        notes: 'Initial developer hardware deployment package issued by Asim Zafar',
      },
    }),
    prisma.stockMovement.createMany({
      data: [
        {
          itemId: stockCables.id,
          type: 'IN',
          quantity: 38,
          previousQuantity: 0,
          newQuantity: 38,
          reason: 'Initial wholesale agency purchase order logged by Asim Zafar',
          recordedById: userByRole['INVENTORY_MANAGER'],
        },
        {
          itemId: stockHubs.id,
          type: 'OUT',
          quantity: 7,
          previousQuantity: 10,
          newQuantity: 3,
          reason: 'Dispatched to engineering team workstations',
          recordedById: userByRole['INVENTORY_MANAGER'],
        },
      ],
    }),
    prisma.notification.createMany({
      data: [
        {
          userId: userByRole['EMPLOYEE'],
          type: 'TASK',
          message: 'Rashid Al-Banna assigned you to: "Database Query Optimization & Connection Pooling"',
          link: '/tasks',
          isRead: false,
        },
        {
          userId: userByRole['HR_MANAGER'],
          type: 'LEAVE',
          message: 'Zain Khalid submitted a 4-day Annual Leave request for review.',
          link: '/leave',
          isRead: false,
        },
        {
          userId: userByRole['OWNER'],
          type: 'FINANCE',
          message: 'Wire payment of $30,000.00 recorded by Sohail Abbasi from Acme Cloud Technologies.',
          link: '/finance',
          isRead: true,
        },
      ],
    }),
    prisma.auditLog.createMany({
      data: [
        {
          actorId: userByRole['OWNER'],
          action: 'system:init',
          entityType: 'CompanySettings',
          entityId: 'default-settings',
          newValues: { companyName: 'CrewDesk Enterprise Agency', owner: 'Tariq Mansoor', currency: 'USD' },
        },
        {
          actorId: userByRole['FINANCE_MANAGER'],
          action: 'invoice:payment_record',
          entityType: 'Invoice',
          entityId: inv2.id,
          newValues: { amount: '30000.00', method: 'BANK_TRANSFER', recordedBy: 'Sohail Abbasi' },
        },
        {
          actorId: userByRole['INVENTORY_MANAGER'],
          action: 'inventory:asset_assigned',
          entityType: 'InventoryItem',
          entityId: asset1.id,
          newValues: {
            assignedUserId: userByRole['EMPLOYEE'],
            assignedTo: 'Zain Khalid',
            serialNumber: 'CD-APPLE-MBP-2026-01',
          },
        },
      ],
    }),
  ]);

  return {
    demoUsersCount: allDemoUsers.length,
    coreUsers: CORE_DEMO_USERS.map((u) => ({ email: u.email, name: u.name, role: u.role })),
  };
}
