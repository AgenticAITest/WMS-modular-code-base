import React from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import axios from 'axios';

const inventoryItemsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type InventoryItemsFormData = z.infer<typeof inventoryItemsSchema>;

const InventoryItemsAdd: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemsFormData>({
    resolver: zodResolver(inventoryItemsSchema),
  });

  const onSubmit = async (data: InventoryItemsFormData) => {
    try {
      await axios.post('/api/modules/inventory-items/inventory-items', data);
      navigate('..');
    } catch (error) {
      console.error('Error creating inventory items:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('..')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Inventory Items</h1>
          <p className="text-muted-foreground">
            Create a new inventory items record
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('..')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(InventoryItemsAdd, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
