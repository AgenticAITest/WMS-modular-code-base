import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Badge } from '@client/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Location {
  id: string;
  binId: string;
  binName: string;
  binBarcode: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  expiryDate: string | null;
  batchNumber: string | null;
  lotNumber: string | null;
  receivedDate: string | null;
  costPerUnit: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  hasExpiryDate: boolean;
}

interface ViewStockDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productSku: string;
  productName: string;
}

export function ViewStockDetailsDialog({
  open,
  onOpenChange,
  productId,
  productSku,
  productName,
}: ViewStockDetailsDialogProps) {
  const { token: accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    if (!open) {
      cleanupTimerRef.current = setTimeout(() => {
        document.body.style.pointerEvents = '';
        cleanupTimerRef.current = null;
      }, 100);
    }

    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (open && productId) {
      fetchLocationDetails();
    }
  }, [open, productId]);

  const fetchLocationDetails = async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/modules/inventory-items/stock-information/${productId}/locations`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.success) {
        setProduct(response.data.data.product);
        setLocations(response.data.data.locations);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch location details');
      console.error('Error fetching location details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const totalAvailable = locations.reduce((sum, loc) => sum + loc.availableQuantity, 0);
  const totalReserved = locations.reduce((sum, loc) => sum + loc.reservedQuantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Details - {productSku}</DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {product && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Product Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="ml-2 font-medium">{product.sku}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Has Expiry:</span>
                    <span className="ml-2">
                      {product.hasExpiryDate ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </span>
                  </div>
                  {product.description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Locations:</span>
                  <span className="ml-2 font-medium">{locations.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Available:</span>
                  <span className="ml-2 font-medium">{totalAvailable.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Reserved:</span>
                  <span className="ml-2 font-medium">{totalReserved.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Location Details</h3>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations found for this product.
                </p>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{location.binName}</h4>
                          {location.binBarcode && (
                            <p className="text-xs text-muted-foreground">
                              Barcode: {location.binBarcode}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Available: </span>
                            <span className="font-semibold text-green-600">
                              {location.availableQuantity.toLocaleString()}
                            </span>
                          </div>
                          {location.reservedQuantity > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Reserved: </span>
                              <span className="font-semibold text-orange-600">
                                {location.reservedQuantity.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {location.batchNumber && (
                          <div>
                            <span className="text-muted-foreground">Batch:</span>
                            <span className="ml-1 font-medium">{location.batchNumber}</span>
                          </div>
                        )}
                        {location.lotNumber && (
                          <div>
                            <span className="text-muted-foreground">Lot:</span>
                            <span className="ml-1 font-medium">{location.lotNumber}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Expiry:</span>
                          <span className="ml-1 font-medium">
                            {formatDate(location.expiryDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Received:</span>
                          <span className="ml-1 font-medium">
                            {formatDate(location.receivedDate)}
                          </span>
                        </div>
                        {location.costPerUnit && (
                          <div>
                            <span className="text-muted-foreground">Cost/Unit:</span>
                            <span className="ml-1 font-medium">
                              ${parseFloat(location.costPerUnit).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
