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

const inventoryTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean(),
});

type InventoryTypeForm = z.infer<typeof inventoryTypeSchema>;

interface InventoryTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  onSuccess: () => void;
}

const InventoryTypeDialog = ({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: InventoryTypeDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<InventoryTypeForm>({
    resolver: zodResolver(inventoryTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      isActive: true,
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (editingItem) {
      setValue('name', editingItem.name);
      setValue('description', editingItem.description || '');
      setValue('category', editingItem.category || '');
      setValue('isActive', editingItem.isActive);
    } else {
      reset({
        name: '',
        description: '',
        category: '',
        isActive: true,
      });
    }
  }, [editingItem, open, reset, setValue]);

  const onSubmit = async (data: InventoryTypeForm) => {
    try {
      if (editingItem) {
        await axios.put(`/api/modules/master-data/product-types/${editingItem.id}`, data);
        toast.success('Inventory type updated successfully');
      } else {
        await axios.post('/api/modules/master-data/product-types', data);
        toast.success('Inventory type created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save inventory type');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit Inventory Type' : 'Add Inventory Type'}
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
              placeholder="Enter inventory type name"
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

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Enter category (optional)"
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

export default InventoryTypeDialog;
