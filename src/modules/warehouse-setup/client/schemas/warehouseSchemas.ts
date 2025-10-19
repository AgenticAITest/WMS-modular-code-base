import { z } from 'zod';

export const warehouseFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  address: z.string().optional(),
  isActive: z.boolean(),
});

export const zoneFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  warehouseId: z.string().uuid(),
});

export const aisleFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  zoneId: z.string().uuid(),
});

export const shelfFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  aisleId: z.string().uuid(),
});

export const binFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  barcode: z.string().max(100, 'Barcode is too long').optional().or(z.literal('')),
  maxWeight: z.string().optional().or(z.literal('')),
  maxVolume: z.string().optional().or(z.literal('')),
  fixedSku: z.string().max(255, 'SKU is too long').optional().or(z.literal('')),
  category: z.string().max(100, 'Category is too long').optional().or(z.literal('')),
  requiredTemperature: z.string().max(50, 'Temperature is too long').optional().or(z.literal('')),
  accessibilityScore: z.number().int().min(0).max(100),
  shelfId: z.string().uuid(),
});

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
export type ZoneFormData = z.infer<typeof zoneFormSchema>;
export type AisleFormData = z.infer<typeof aisleFormSchema>;
export type ShelfFormData = z.infer<typeof shelfFormSchema>;
export type BinFormData = z.infer<typeof binFormSchema>;
