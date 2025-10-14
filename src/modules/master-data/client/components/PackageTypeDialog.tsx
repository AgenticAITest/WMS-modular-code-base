import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { Switch } from '@client/components/ui/switch';

const packageTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unitsPerPackage: z.number().optional().or(z.nan().transform(() => undefined)),
  barcode: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  isActive: z.boolean(),
});

type PackageTypeForm = z.infer<typeof packageTypeSchema>;

interface PackageTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  onSuccess: () => void;
}

const PackageTypeDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: PackageTypeDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<PackageTypeForm>({
    resolver: zodResolver(packageTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      unitsPerPackage: undefined,
      barcode: '',
      dimensions: '',
      weight: '',
      isActive: true,
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (editingItem) {
      setValue('name', editingItem.name);
      setValue('description', editingItem.description || '');
      setValue('unitsPerPackage', editingItem.unitsPerPackage || undefined);
      setValue('barcode', editingItem.barcode || '');
      setValue('dimensions', editingItem.dimensions || '');
      setValue('weight', editingItem.weight || '');
      setValue('isActive', editingItem.isActive);
    } else {
      reset({
        name: '',
        description: '',
        unitsPerPackage: undefined,
        barcode: '',
        dimensions: '',
        weight: '',
        isActive: true,
      });
    }
  }, [editingItem, open, reset, setValue]);

  const onSubmit = async (data: PackageTypeForm) => {
    try {
      const payload = {
        ...data,
        unitsPerPackage: data.unitsPerPackage || undefined,
        weight: data.weight || undefined,
      };

      if (editingItem) {
        await axios.put(`/api/modules/master-data/package-types/${editingItem.id}`, payload);
        toast.success('Package type updated successfully');
      } else {
        await axios.post('/api/modules/master-data/package-types', payload);
        toast.success('Package type created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save package type');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit Package Type' : 'Add Package Type'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter package type name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitsPerPackage">Units Per Package</Label>
              <Input
                id="unitsPerPackage"
                type="number"
                {...register('unitsPerPackage', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                {...register('weight')}
                placeholder="e.g., 2.5kg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              {...register('dimensions')}
              placeholder="e.g., 10x20x30 cm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              {...register('barcode')}
              placeholder="Enter barcode (optional)"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageTypeDialog;
