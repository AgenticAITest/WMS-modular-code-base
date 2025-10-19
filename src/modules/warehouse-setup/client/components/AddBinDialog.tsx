import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Loader2 } from 'lucide-react';
import { binFormSchema, type BinFormData } from '../schemas/warehouseSchemas';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import { toast } from 'sonner';

interface AddBinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelfId: string;
  shelfName: string;
  onSuccess: () => void;
}

export function AddBinDialog({
  open,
  onOpenChange,
  shelfId,
  shelfName,
  onSuccess,
}: AddBinDialogProps) {
  const { token: accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BinFormData>({
    resolver: zodResolver(binFormSchema),
    defaultValues: {
      name: '',
      barcode: '',
      maxWeight: '',
      maxVolume: '',
      fixedSku: '',
      category: '',
      requiredTemperature: '',
      accessibilityScore: 50,
      shelfId,
    },
  });

  const onSubmit = async (data: BinFormData) => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/modules/warehouse-setup/bins', data, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      toast.success('Bin created successfully');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Bin</DialogTitle>
          <p className="text-sm text-muted-foreground">
            in <span className="font-medium">{shelfName}</span>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('shelfId')} value={shelfId} />

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="Bin 001" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              {...register('barcode')}
              placeholder="BIN-001-ABC"
            />
            {errors.barcode && (
              <p className="text-sm text-destructive">{errors.barcode.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWeight">Max Weight (kg)</Label>
              <Input
                id="maxWeight"
                {...register('maxWeight')}
                type="number"
                step="0.001"
                placeholder="100.000"
              />
              {errors.maxWeight && (
                <p className="text-sm text-destructive">{errors.maxWeight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxVolume">Max Volume (m³)</Label>
              <Input
                id="maxVolume"
                {...register('maxVolume')}
                type="number"
                step="0.001"
                placeholder="5.000"
              />
              {errors.maxVolume && (
                <p className="text-sm text-destructive">{errors.maxVolume.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixedSku">Fixed SKU</Label>
            <Input
              id="fixedSku"
              {...register('fixedSku')}
              placeholder="SKU-12345 (if bin is dedicated to one product)"
            />
            {errors.fixedSku && (
              <p className="text-sm text-destructive">{errors.fixedSku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Heavy, Fragile, etc."
            />
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredTemperature">Required Temperature</Label>
            <Input
              id="requiredTemperature"
              {...register('requiredTemperature')}
              placeholder="Cold (2-8°C), Frozen, Room Temp"
            />
            {errors.requiredTemperature && (
              <p className="text-sm text-destructive">
                {errors.requiredTemperature.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessibilityScore">
              Accessibility Score (0-100)
            </Label>
            <Input
              id="accessibilityScore"
              {...register('accessibilityScore', { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              placeholder="50"
            />
            {errors.accessibilityScore && (
              <p className="text-sm text-destructive">
                {errors.accessibilityScore.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Higher score = easier to access (e.g., ground level = 100, high shelf = 20)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Bin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
