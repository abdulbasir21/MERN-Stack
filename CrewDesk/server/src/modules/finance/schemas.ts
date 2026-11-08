import { z } from 'zod';
import { ExpenseCategory, PaymentMethod, InvoiceStatus } from '@prisma/client';

export const createExpenseSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  category: z.nativeEnum(ExpenseCategory).default('OTHER'),
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  receiptUrl: z.string().url().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(3, 'Invoice number is required'),
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  subtotal: z.union([z.string(), z.number()]).transform((v) => String(v)),
  tax: z.union([z.string(), z.number()]).default('0.00').transform((v) => String(v)),
  total: z.union([z.string(), z.number()]).transform((v) => String(v)),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'issueDate must be YYYY-MM-DD'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  notes: z.string().optional().nullable(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

export const recordPaymentSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  method: z.nativeEnum(PaymentMethod).default('BANK_TRANSFER'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
