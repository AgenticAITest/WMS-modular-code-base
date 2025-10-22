import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@client/components/ui/table';
import { Separator } from '@client/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface POConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poData: any;
  onConfirm: (poData: any) => void;
  onBack: () => void;
}

export const POConfirmationModal: React.FC<POConfirmationModalProps> = ({
  open,
  onOpenChange,
  poData,
  onConfirm,
  onBack,
}) => {
  const [previewNumber, setPreviewNumber] = useState('');
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && poData) {
      fetchPreviewNumber();
      fetchSupplierInfo();
    }
  }, [open, poData]);

  const fetchPreviewNumber = async () => {
    try {
      const response = await axios.post('/api/modules/document-numbering/preview', {
        documentType: 'PO',
      });
      setPreviewNumber(response.data.previewNumber);
    } catch (error) {
      console.error('Error fetching preview number:', error);
      toast.error('Failed to generate PO number preview');
    }
  };

  const fetchSupplierInfo = async () => {
    if (!poData?.supplierId) return;
    
    try {
      const response = await axios.get(`/api/modules/master-data/suppliers/${poData.supplierId}`);
      if (response.data.success) {
        setSupplierInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching supplier info:', error);
    }
  };

  const calculateTotal = () => {
    if (!poData?.items) return 0;
    return poData.items.reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitCost);
    }, 0);
  };

  const getSupplierAddress = () => {
    if (!supplierInfo) return 'N/A';
    
    if (poData.supplierLocationId && supplierInfo.locations) {
      const location = supplierInfo.locations.find((loc: any) => loc.id === poData.supplierLocationId);
      if (location) {
        return `${location.address}, ${location.city}, ${location.state} ${location.postalCode}, ${location.country}`;
      }
    }
    
    return 'No location specified';
  };

  const handleConfirm = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onConfirm(poData);
    } catch (error) {
      console.error('Error confirming PO:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!poData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">PO Number</div>
              <div className="text-lg font-bold">{previewNumber || 'Generating...'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Order Date</div>
              <div className="text-lg font-semibold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Supplier Information</h3>
            <div className="p-4 border rounded-lg space-y-2">
              <div>
                <span className="font-medium">Name:</span> {supplierInfo?.name || 'Loading...'}
              </div>
              <div>
                <span className="font-medium">Address:</span> {getSupplierAddress()}
              </div>
              {supplierInfo?.email && (
                <div>
                  <span className="font-medium">Email:</span> {supplierInfo.email}
                </div>
              )}
              {supplierInfo?.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {supplierInfo.phone}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poData.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.unitCost).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        ${(item.orderedQuantity * item.unitCost).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">
                      Total Purchase Value
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      ${calculateTotal().toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {poData.expectedDeliveryDate && (
            <div>
              <span className="text-sm font-medium">Expected Delivery:</span>{' '}
              {new Date(poData.expectedDeliveryDate).toLocaleDateString()}
            </div>
          )}

          {poData.notes && (
            <div>
              <div className="text-sm font-semibold mb-1">Notes</div>
              <div className="p-3 bg-muted rounded-lg text-sm">{poData.notes}</div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Creating...' : 'Confirm & Create PO'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
