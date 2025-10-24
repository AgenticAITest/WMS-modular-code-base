import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (open && poData) {
      fetchHTMLPreview();
    }
  }, [open, poData]);

  const fetchHTMLPreview = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/modules/purchase-order/preview-html', {
        supplierId: poData.supplierId,
        supplierLocationId: poData.supplierLocationId,
        orderDate: poData.orderDate,
        expectedDeliveryDate: poData.expectedDeliveryDate,
        deliveryMethod: poData.deliveryMethod,
        warehouseId: poData.warehouseId,
        notes: poData.notes,
        items: poData.items
      }, {
        responseType: 'text'
      });
      setHtmlContent(response.data);
    } catch (error) {
      console.error('Error fetching HTML preview:', error);
      toast.error('Failed to generate PO preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (confirmLoading) return;
    
    setConfirmLoading(true);
    try {
      await onConfirm(poData);
    } catch (error) {
      console.error('Error confirming PO:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!poData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Purchase Order</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="text-lg">Generating preview...</div>
            </div>
          </div>
        ) : htmlContent ? (
          <div className="flex-1 overflow-hidden">
            <iframe
              id="po-preview-iframe"
              srcDoc={htmlContent}
              className="w-full h-[600px] border-0"
              title="Purchase Order Preview"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              No preview available
            </div>
          </div>
        )}

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
            <Button onClick={handleConfirm} disabled={confirmLoading || loading}>
              {confirmLoading ? 'Creating...' : 'Confirm & Create PO'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
