import { prisma } from '../../lib/prisma.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import { Prisma } from '@prisma/client';

export class DashboardService {
  async getDashboardData(user: AuthenticatedUser) {
    switch (user.role) {
      case 'OWNER':
        return this.getOwnerDashboard();
      case 'HR_MANAGER':
        return this.getHrDashboard();
      case 'PROJECT_MANAGER':
        return this.getPmDashboard(user.userId);
      case 'FINANCE_MANAGER':
        return this.getFinanceDashboard();
      case 'INVENTORY_MANAGER':
        return this.getInventoryDashboard();
      case 'EMPLOYEE':
      default:
        return this.getEmployeeDashboard(user.userId);
    }
  }

  // --- 1. OWNER DASHBOARD ---
  private async getOwnerDashboard() {
    const [clientsCount, projectsCount, usersCount, pendingLeavesCount] = await Promise.all([
      prisma.client.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { payments: true },
    });
    const expenses = await prisma.expense.findMany();

    const totalInvoiced = invoices.reduce((acc, inv) => acc.add(inv.total), new Prisma.Decimal(0));
    const totalCollected = invoices
      .flatMap((i) => i.payments)
      .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const totalExpenses = expenses.reduce((acc, e) => acc.add(e.amount), new Prisma.Decimal(0));

    const recentAudit = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, role: true } } },
    });

    return {
      role: 'OWNER',
      metrics: {
        activeClients: clientsCount,
        activeProjects: projectsCount,
        headcount: usersCount,
        pendingApprovals: pendingLeavesCount,
        totalInvoiced: totalInvoiced.toString(),
        totalCollected: totalCollected.toString(),
        totalExpenses: totalExpenses.toString(),
        netRevenue: totalCollected.sub(totalExpenses).toString(),
      },
      recentAudit,
    };
  }

  // --- 2. HR MANAGER DASHBOARD ---
  private async getHrDashboard() {
    const todayStr = new Date().toISOString().split('T')[0];

    const [totalUsers, activeLeaves, todayAttendance, pendingRequests, departments] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.leaveRequest.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.attendance.findMany({
        where: { date: todayStr },
        include: { user: { select: { name: true } } },
      }),
      prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { name: true, role: true } }, leaveType: true },
        take: 5,
      }),
      prisma.department.findMany({
        include: { _count: { select: { users: true } } },
      }),
    ]);

    const lateCount = todayAttendance.filter((a) => a.isLate).length;

    return {
      role: 'HR_MANAGER',
      metrics: {
        totalHeadcount: totalUsers,
        todayPresent: todayAttendance.length,
        todayLate: lateCount,
        currentlyOnLeave: activeLeaves,
        pendingLeaveRequests: pendingRequests.length,
      },
      departments: departments.map((d) => ({ name: d.name, count: d._count.users })),
      pendingQueue: pendingRequests,
    };
  }

  // --- 3. PROJECT MANAGER DASHBOARD ---
  private async getPmDashboard(pmUserId: string) {
    const managedProjects = await prisma.project.findMany({
      where: { managerId: pmUserId },
      include: {
        client: { select: { name: true } },
        milestones: true,
        tasks: true,
      },
    });

    const allTasks = managedProjects.flatMap((p) => p.tasks);
    const completedTasks = allTasks.filter((t) => t.status === 'DONE').length;
    const now = new Date();
    const overdueTasks = allTasks.filter((t) => t.status !== 'DONE' && new Date(t.dueDate) < now).length;

    return {
      role: 'PROJECT_MANAGER',
      metrics: {
        managedProjectsCount: managedProjects.length,
        totalTasks: allTasks.length,
        completedTasks,
        overdueTasks,
        completionRate: allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0,
      },
      projects: managedProjects.map((p) => {
        const total = p.tasks.length;
        const done = p.tasks.filter((t) => t.status === 'DONE').length;
        return {
          id: p.id,
          name: p.name,
          client: p.client.name,
          status: p.status,
          deadline: p.deadline,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      }),
    };
  }

  // --- 4. FINANCE MANAGER DASHBOARD ---
  private async getFinanceDashboard() {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { payments: true, client: { select: { name: true } } },
    });
    const expenses = await prisma.expense.findMany({
      include: { project: { select: { name: true } } },
    });

    const totalInvoiced = invoices.reduce((acc, inv) => acc.add(inv.total), new Prisma.Decimal(0));
    const totalCollected = invoices
      .flatMap((i) => i.payments)
      .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const totalExpenses = expenses.reduce((acc, e) => acc.add(e.amount), new Prisma.Decimal(0));

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount.toNumber();
    }

    return {
      role: 'FINANCE_MANAGER',
      metrics: {
        totalInvoiced: totalInvoiced.toString(),
        totalCollected: totalCollected.toString(),
        totalOutstanding: totalInvoiced.sub(totalCollected).toString(),
        totalExpenses: totalExpenses.toString(),
        netProfit: totalCollected.sub(totalExpenses).toString(),
      },
      expenseBreakdown: Object.entries(categoryTotals).map(([cat, val]) => ({ category: cat, total: val })),
      recentInvoices: invoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        number: inv.invoiceNumber,
        client: inv.client.name,
        total: inv.total.toString(),
        dueDate: inv.dueDate,
      })),
    };
  }

  // --- 5. INVENTORY MANAGER DASHBOARD ---
  private async getInventoryDashboard() {
    const [totalAssets, available, assigned, maintenance, stock] = await Promise.all([
      prisma.inventoryItem.count({ where: { kind: 'ASSET' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'AVAILABLE' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'ASSIGNED' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'UNDER_MAINTENANCE' } }),
      prisma.inventoryItem.findMany({ where: { kind: 'STOCK' } }),
    ]);

    const lowStock = stock.filter((s) => s.currentQuantity <= s.minQuantity);

    return {
      role: 'INVENTORY_MANAGER',
      metrics: {
        totalHardwareAssets: totalAssets,
        availableAssets: available,
        assignedAssets: assigned,
        inMaintenance: maintenance,
        totalStockSkus: stock.length,
        lowStockAlerts: lowStock.length,
      },
      lowStockItems: lowStock.map((s) => ({
        id: s.id,
        name: s.name,
        inStock: s.currentQuantity,
        min: s.minQuantity,
      })),
    };
  }

  // --- 6. EMPLOYEE PORTAL ---
  private async getEmployeeDashboard(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [todayAttendance, leaveBalances, myTasks, myAssets] = await Promise.all([
      prisma.attendance.findUnique({
        where: { userId_date: { userId, date: todayStr } },
      }),
      prisma.leaveBalance.findMany({
        where: { userId, year: new Date().getFullYear() },
        include: { leaveType: true },
      }),
      prisma.task.findMany({
        where: { assigneeId: userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        include: { project: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.inventoryItem.findMany({
        where: { kind: 'ASSET', assignedUserId: userId },
      }),
    ]);

    return {
      role: 'EMPLOYEE',
      todayAttendance: todayAttendance
        ? {
            checkedIn: true,
            checkInTime: todayAttendance.checkIn,
            checkOutTime: todayAttendance.checkOut,
            workingHours: todayAttendance.workingHours?.toString() || null,
            isLate: todayAttendance.isLate,
          }
        : { checkedIn: false },
      leaves: leaveBalances.map((b) => ({
        type: b.leaveType.name,
        allowance: b.allowance,
        used: b.used,
        remaining: Math.max(0, b.allowance - b.used),
      })),
      activeTasks: myTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.project.name,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
      })),
      hardwareCount: myAssets.length,
    };
  }
}

export const dashboardService = new DashboardService();
