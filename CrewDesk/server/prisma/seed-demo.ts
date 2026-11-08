import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';

async function seedDemo() {
  console.log('Seeding comprehensive CrewDesk demo data...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default-settings' },
    update: {
      companyName: 'CrewDesk Enterprise Agency',
      currency: 'USD',
      timezone: 'UTC',
      officeStartTime: '09:00',
      lateGraceMinutes: 15,
    },
    create: {
      id: 'default-settings',
      companyName: 'CrewDesk Enterprise Agency',
      currency: 'USD',
      timezone: 'UTC',
      officeStartTime: '09:00',
      lateGraceMinutes: 15,
    },
  });

  // 2. Departments
  const departmentsData = [
    'Executive Leadership',
    'Engineering & Platform',
    'Product & UX Design',
    'Finance & Operations',
  ];
  const departments: Record<string, string> = {};
  for (const name of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    departments[name] = dept.id;
  }

  // 3. Leave Types
  const leaveTypesData = [
    { name: 'ANNUAL', defaultAllowance: 20 },
    { name: 'SICK', defaultAllowance: 10 },
    { name: 'CASUAL', defaultAllowance: 5 },
  ];
  const leaveTypes: Record<string, string> = {};
  for (const lt of leaveTypesData) {
    const createdLt = await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { defaultAllowance: lt.defaultAllowance },
      create: { name: lt.name, defaultAllowance: lt.defaultAllowance },
    });
    leaveTypes[lt.name] = createdLt.id;
  }

  // Common demo password
  const demoPasswordHash = await bcrypt.hash('CrewDesk2026!', 10);

  // 4. Six Demo Users (one per role)
  const usersToSeed = [
    {
      name: 'Alexander Vance',
      email: 'owner@crewdesk.agency',
      role: 'OWNER' as const,
      title: 'Chief Executive Officer & Founder',
      phone: '+1 (555) 019-2831',
      departmentId: departments['Executive Leadership'],
    },
    {
      name: 'Elena Rostova',
      email: 'hr@crewdesk.agency',
      role: 'HR_MANAGER' as const,
      title: 'Director of People Operations',
      phone: '+1 (555) 019-4492',
      departmentId: departments['Executive Leadership'],
    },
    {
      name: 'Marcus Chen',
      email: 'pm@crewdesk.agency',
      role: 'PROJECT_MANAGER' as const,
      title: 'Principal Technical Project Lead',
      phone: '+1 (555) 019-7721',
      departmentId: departments['Product & UX Design'],
    },
    {
      name: 'Sophia Sterling',
      email: 'finance@crewdesk.agency',
      role: 'FINANCE_MANAGER' as const,
      title: 'Chief Financial Controller',
      phone: '+1 (555) 019-8833',
      departmentId: departments['Finance & Operations'],
    },
    {
      name: 'Liam Gallagher',
      email: 'inventory@crewdesk.agency',
      role: 'INVENTORY_MANAGER' as const,
      title: 'Global Assets & Facilities Lead',
      phone: '+1 (555) 019-5561',
      departmentId: departments['Finance & Operations'],
    },
    {
      name: 'David Kim',
      email: 'employee@crewdesk.agency',
      role: 'EMPLOYEE' as const,
      title: 'Senior Full-Stack Engineer',
      phone: '+1 (555) 019-1104',
      departmentId: departments['Engineering & Platform'],
    },
  ];

  const seededUsers: Record<string, string> = {};
  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        title: u.title,
        phone: u.phone,
        passwordHash: demoPasswordHash,
        departmentId: u.departmentId,
        mustChangePassword: false, // Ready for direct demo login
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: demoPasswordHash,
        role: u.role,
        title: u.title,
        phone: u.phone,
        departmentId: u.departmentId,
        mustChangePassword: false,
        isActive: true,
      },
    });
    seededUsers[u.role] = user.id;

    // Leave Balances for 2026
    const currentYear = new Date().getFullYear();
    for (const lt of leaveTypesData) {
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: leaveTypes[lt.name],
            year: currentYear,
          },
        },
        update: {
          allowance: lt.defaultAllowance,
        },
        create: {
          userId: user.id,
          leaveTypeId: leaveTypes[lt.name],
          year: currentYear,
          allowance: lt.defaultAllowance,
          used: 0,
        },
      });
    }
  }

  // 5. Clients
  const clientAcme = await prisma.client.upsert({
    where: { email: 'enterprise@acmetech.io' },
    update: {},
    create: {
      name: 'Acme Cloud Technologies',
      email: 'enterprise@acmetech.io',
      company: 'Acme Global Corp',
      phone: '+1 (800) 555-0100',
      notes: 'Tier 1 Strategic Enterprise Client - Multi-year retainer',
    },
  });

  const clientNova = await prisma.client.upsert({
    where: { email: 'partners@novadynamics.com' },
    update: {},
    create: {
      name: 'Nova Dynamics AI',
      email: 'partners@novadynamics.com',
      company: 'Nova Dynamics Inc',
      phone: '+1 (800) 555-0200',
      notes: 'Generative AI platform development',
    },
  });

  // 6. Projects & Milestones
  let projectAlpha = await prisma.project.findFirst({
    where: { name: 'Omni-Channel Customer Experience Platform' },
  });
  if (!projectAlpha) {
    projectAlpha = await prisma.project.create({
      data: {
        name: 'Omni-Channel Customer Experience Platform',
        clientId: clientAcme.id,
        managerId: seededUsers['PROJECT_MANAGER'],
        budget: new Prisma.Decimal('185000.00'),
        status: 'ACTIVE',
        description: 'End-to-end redesign and cloud re-architecture of customer portals with real-time analytics.',
        startDate: new Date('2026-01-15'),
        deadline: new Date('2026-11-30'),
      },
    });
  }

  // Project Members
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: projectAlpha.id,
        userId: seededUsers['PROJECT_MANAGER'],
      },
    },
    update: {},
    create: {
      projectId: projectAlpha.id,
      userId: seededUsers['PROJECT_MANAGER'],
      role: 'Project Lead',
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: projectAlpha.id,
        userId: seededUsers['EMPLOYEE'],
      },
    },
    update: {},
    create: {
      projectId: projectAlpha.id,
      userId: seededUsers['EMPLOYEE'],
      role: 'Lead Architect & Engineer',
    },
  });

  // Milestones
  await prisma.milestone.deleteMany({ where: { projectId: projectAlpha.id } });
  await prisma.milestone.createMany({
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
        dueDate: new Date('2026-11-15'),
        status: 'PENDING',
      },
    ],
  });

  // Tasks & Comments
  await prisma.task.deleteMany({ where: { projectId: projectAlpha.id } });
  const task1 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: 'Implement Resilient JWT & Session Invalidation',
      description: 'Enforce dual token flow with rotated refresh tokens in secure httpOnly cookies.',
      assigneeId: seededUsers['EMPLOYEE'],
      createdById: seededUsers['PROJECT_MANAGER'],
      priority: 'HIGH',
      status: 'DONE',
      progressPercent: 100,
      dueDate: new Date('2026-08-10'),
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      authorId: seededUsers['EMPLOYEE'],
      content: 'Implemented with token hash storage in PostgreSQL and complete test coverage.',
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: 'Database Query Optimization & Connection Pooling',
      description: 'Tune PostgreSQL indexes and pool size to handle peak 50,000 req/min gracefully.',
      assigneeId: seededUsers['EMPLOYEE'],
      createdById: seededUsers['PROJECT_MANAGER'],
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      progressPercent: 75,
      dueDate: new Date('2026-12-05'),
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: task2.id,
      authorId: seededUsers['PROJECT_MANAGER'],
      content: 'Benchmarked latency reduction of 42% on read endpoints. Ready for final load tests.',
    },
  });

  // 7. Finance: Invoices, Payments, Expenses
  await prisma.invoice.deleteMany({ where: { clientId: clientAcme.id } });
  const inv1 = await prisma.invoice.create({
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
      createdById: seededUsers['FINANCE_MANAGER'],
      notes: 'Initial Milestone 1 Settlement',
    },
  });

  // Fully paid
  await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      amount: new Prisma.Decimal('50000.00'),
      date: new Date('2026-02-20'),
      method: 'BANK_TRANSFER',
      reference: 'WIRE-ACME-88912',
      recordedById: seededUsers['FINANCE_MANAGER'],
      notes: 'Received in full via J.P. Morgan Chase wire',
    },
  });

  const inv2 = await prisma.invoice.create({
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
      createdById: seededUsers['FINANCE_MANAGER'],
      notes: 'Milestone 2 Delivery Billing',
    },
  });

  // Partially paid ($30k paid of $65k) -> Derived status PARTIALLY_PAID
  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      amount: new Prisma.Decimal('30000.00'),
      date: new Date('2026-08-15'),
      method: 'BANK_TRANSFER',
      reference: 'WIRE-ACME-90214',
      recordedById: seededUsers['FINANCE_MANAGER'],
      notes: 'Tranche 1 payment received',
    },
  });

  // Expenses
  await prisma.expense.deleteMany({ where: { projectId: projectAlpha.id } });
  await prisma.expense.createMany({
    data: [
      {
        projectId: projectAlpha.id,
        category: 'SOFTWARE',
        amount: new Prisma.Decimal('3200.00'),
        description: 'Vercel Enterprise, Neon DB, and Datadog observability subscription',
        date: new Date('2026-03-01'),
        recordedById: seededUsers['FINANCE_MANAGER'],
      },
      {
        projectId: projectAlpha.id,
        category: 'HARDWARE',
        amount: new Prisma.Decimal('4800.00'),
        description: 'Dedicated staging load-testing appliance rack',
        date: new Date('2026-04-10'),
        recordedById: seededUsers['FINANCE_MANAGER'],
      },
      {
        projectId: projectAlpha.id,
        category: 'CONTRACTOR',
        amount: new Prisma.Decimal('8500.00'),
        description: 'External Cyber-Security Penetration Test & Audit Sign-off',
        date: new Date('2026-07-20'),
        recordedById: seededUsers['FINANCE_MANAGER'],
      },
    ],
  });

  // 8. Attendance Records
  const todayStr = new Date().toISOString().split('T')[0];
  await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: seededUsers['EMPLOYEE'],
        date: todayStr,
      },
    },
    update: {},
    create: {
      userId: seededUsers['EMPLOYEE'],
      date: todayStr,
      checkIn: new Date(new Date().setHours(8, 48, 0, 0)),
      checkOut: new Date(new Date().setHours(17, 18, 0, 0)),
      workingHours: new Prisma.Decimal('8.50'),
      isLate: false,
      notes: 'Full workday logged with sprint velocity goals achieved',
    },
  });

  await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: seededUsers['PROJECT_MANAGER'],
        date: todayStr,
      },
    },
    update: {},
    create: {
      userId: seededUsers['PROJECT_MANAGER'],
      date: todayStr,
      checkIn: new Date(new Date().setHours(9, 28, 0, 0)),
      checkOut: null,
      workingHours: null,
      isLate: true,
      notes: 'Morning client emergency briefing call',
    },
  });

  // 9. Leave Requests
  await prisma.leaveRequest.deleteMany({ where: { userId: seededUsers['EMPLOYEE'] } });
  await prisma.leaveRequest.create({
    data: {
      userId: seededUsers['EMPLOYEE'],
      leaveTypeId: leaveTypes['ANNUAL'],
      startDate: new Date('2026-12-21'),
      endDate: new Date('2026-12-24'),
      daysCount: 4,
      status: 'PENDING',
      reason: 'Year-end family holiday trip',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      userId: seededUsers['PROJECT_MANAGER'],
      leaveTypeId: leaveTypes['SICK'],
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-11'),
      daysCount: 2,
      status: 'APPROVED',
      reason: 'Seasonal recovery',
      decidedById: seededUsers['HR_MANAGER'],
      decidedAt: new Date('2026-06-09'),
    },
  });

  // 10. Hardware Assets & Consumable Stock
  const asset1 = await prisma.inventoryItem.upsert({
    where: { serialNumber: 'CD-APPLE-MBP-2026-01' },
    update: {
      assignedUserId: seededUsers['EMPLOYEE'],
      assetStatus: 'ASSIGNED',
    },
    create: {
      kind: 'ASSET',
      name: 'MacBook Pro 16" M3 Max (64GB / 2TB)',
      category: 'Workstations',
      serialNumber: 'CD-APPLE-MBP-2026-01',
      assetStatus: 'ASSIGNED',
      assignedUserId: seededUsers['EMPLOYEE'],
      location: 'Primary Remote Workstation',
      notes: 'Issued to Principal Engineer David Kim',
    },
  });

  await prisma.assetAssignment.create({
    data: {
      itemId: asset1.id,
      userId: seededUsers['EMPLOYEE'],
      assignedById: seededUsers['INVENTORY_MANAGER'],
      condition: 'Pristine / Factory Sealed',
      notes: 'Initial developer hardware deployment package',
    },
  });

  await prisma.inventoryItem.upsert({
    where: { serialNumber: 'CD-DELL-U32-2026-08' },
    update: {
      assignedUserId: seededUsers['PROJECT_MANAGER'],
      assetStatus: 'ASSIGNED',
    },
    create: {
      kind: 'ASSET',
      name: 'Dell UltraSharp 32" 4K USB-C Hub Monitor',
      category: 'Monitors',
      serialNumber: 'CD-DELL-U32-2026-08',
      assetStatus: 'ASSIGNED',
      assignedUserId: seededUsers['PROJECT_MANAGER'],
      location: 'Agency Office - Desk 14',
    },
  });

  await prisma.inventoryItem.upsert({
    where: { serialNumber: 'CD-LENOVO-X1-2026-19' },
    update: {
      assignedUserId: null,
      assetStatus: 'AVAILABLE',
    },
    create: {
      kind: 'ASSET',
      name: 'Lenovo ThinkPad X1 Carbon Gen 12',
      category: 'Workstations',
      serialNumber: 'CD-LENOVO-X1-2026-19',
      assetStatus: 'AVAILABLE',
      location: 'Secure IT Locker B-2',
    },
  });

  // Consumable Stock
  const stockCables = await prisma.inventoryItem.findFirst({
    where: { name: 'Cat6 Shielded High-Speed Ethernet Cable 10ft' },
  });
  if (!stockCables) {
    const item = await prisma.inventoryItem.create({
      data: {
        kind: 'STOCK',
        name: 'Cat6 Shielded High-Speed Ethernet Cable 10ft',
        category: 'Peripherals & Cabling',
        currentQuantity: 38,
        minQuantity: 10,
        location: 'Storage Bay 3',
      },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'IN',
        quantity: 50,
        previousQuantity: 0,
        newQuantity: 50,
        reason: 'Initial wholesale agency purchase order',
        recordedById: seededUsers['INVENTORY_MANAGER'],
      },
    });
  }

  const stockHubs = await prisma.inventoryItem.findFirst({
    where: { name: 'Anker 10-in-1 Thunderbolt 4 Docking Station' },
  });
  if (!stockHubs) {
    const item = await prisma.inventoryItem.create({
      data: {
        kind: 'STOCK',
        name: 'Anker 10-in-1 Thunderbolt 4 Docking Station',
        category: 'Hardware Hubs',
        currentQuantity: 3, // LOW STOCK (min is 6)
        minQuantity: 6,
        location: 'IT Cabinet 1',
      },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'OUT',
        quantity: 7,
        previousQuantity: 10,
        newQuantity: 3,
        reason: 'Dispatched to newly onboarded technical staff',
        recordedById: seededUsers['INVENTORY_MANAGER'],
      },
    });
  }

  // 11. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: seededUsers['EMPLOYEE'],
        type: 'TASK',
        message: 'You have been assigned to: "Database Query Optimization & Connection Pooling"',
        link: '/tasks',
        isRead: false,
      },
      {
        userId: seededUsers['HR_MANAGER'],
        type: 'LEAVE',
        message: 'David Kim submitted a 4-day Annual Leave request for review.',
        link: '/leave',
        isRead: false,
      },
      {
        userId: seededUsers['OWNER'],
        type: 'FINANCE',
        message: 'Wire payment of $30,000.00 received from Acme Cloud Technologies.',
        link: '/finance',
        isRead: true,
      },
    ],
  });

  // 12. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: seededUsers['OWNER'],
        action: 'system:init',
        entityType: 'CompanySettings',
        entityId: 'default-settings',
        newValues: { companyName: 'CrewDesk Enterprise Agency', currency: 'USD' },
      },
      {
        actorId: seededUsers['FINANCE_MANAGER'],
        action: 'invoice:payment_record',
        entityType: 'Invoice',
        entityId: inv2.id,
        newValues: { amount: '30000.00', method: 'BANK_TRANSFER' },
      },
      {
        actorId: seededUsers['INVENTORY_MANAGER'],
        action: 'inventory:asset_assigned',
        entityType: 'InventoryItem',
        entityId: asset1.id,
        newValues: { assignedUserId: seededUsers['EMPLOYEE'], serialNumber: 'CD-APPLE-MBP-2026-01' },
      },
    ],
  });

  console.log('Comprehensive CrewDesk demo seed successfully applied!');
  console.log('Demo Credentials for all 6 Roles (Password: CrewDesk2026!):');
  console.log('- Owner:             owner@crewdesk.agency');
  console.log('- HR Manager:        hr@crewdesk.agency');
  console.log('- Project Manager:   pm@crewdesk.agency');
  console.log('- Finance Manager:   finance@crewdesk.agency');
  console.log('- Inventory Manager: inventory@crewdesk.agency');
  console.log('- Employee:          employee@crewdesk.agency');
}

seedDemo()
  .catch((e) => {
    console.error('Demo seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
