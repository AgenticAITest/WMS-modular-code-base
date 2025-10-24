import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer } from 'lucide-react';

interface POPrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poData: any;
  onClose: () => void;
}

export const POPrintView: React.FC<POPrintViewProps> = ({
  open,
  onOpenChange,
  poData,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  if (!poData) return null;

  const calculateTotal = () => {
    if (!poData.items) return 0;
    return poData.items.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.totalCost || 0);
    }, 0);
  };

  const getSupplierAddress = () => {
    const parts = [];
    if (poData.locationAddress) parts.push(poData.locationAddress);
    if (poData.locationCity) parts.push(poData.locationCity);
    if (poData.locationState) parts.push(poData.locationState);
    if (poData.locationPostalCode) parts.push(poData.locationPostalCode);
    if (poData.locationCountry) parts.push(poData.locationCountry);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="print:p-8">
          <div id="print-content" className="bg-white text-black">
            <div className="space-y-6">
              <div className="text-center border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold">PURCHASE ORDER</h1>
                <p className="text-sm text-gray-600 mt-2">This document serves as an official purchase order</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h2 className="text-sm font-bold mb-2 text-gray-700">SUPPLIER</h2>
                  <div className="border border-gray-300 p-4 rounded">
                    <div className="font-bold text-lg">{poData.supplierName}</div>
                    <div className="text-sm mt-2 space-y-1">
                      <div>{getSupplierAddress()}</div>
                      {poData.supplierEmail && (
                        <div>Email: {poData.supplierEmail}</div>
                      )}
                      {poData.supplierPhone && (
                        <div>Phone: {poData.supplierPhone}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold mb-2 text-gray-700">ORDER DETAILS</h2>
                  <div className="border border-gray-300 p-4 rounded space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">PO Number:</span>
                      <span className="font-mono">{poData.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Order Date:</span>
                      <span>{new Date(poData.orderDate).toLocaleDateString()}</span>
                    </div>
                    {poData.expectedDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Expected Delivery:</span>
                        <span>{new Date(poData.expectedDeliveryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-semibold">Status:</span>
                      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                        Pending Approval
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold mb-2 text-gray-700">ITEMS ORDERED</h2>
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">SKU</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Product Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold">Unit Price</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poData.items && poData.items.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{item.productSku}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">{item.productName}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right">{item.orderedQuantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                          ${parseFloat(item.unitCost || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                          ${parseFloat(item.totalCost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-bold">
                        TOTAL PURCHASE VALUE
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-bold text-lg">
                        ${parseFloat(poData.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {poData.notes && (
                <div>
                  <h2 className="text-sm font-bold mb-2 text-gray-700">NOTES</h2>
                  <div className="border border-gray-300 p-4 rounded text-sm">
                    {poData.notes}
                  </div>
                </div>
              )}

              <div className="border-t-2 border-gray-300 pt-6 mt-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm font-bold mb-2">PREPARED BY</div>
                    <div className="border-t border-gray-400 pt-2 mt-8">
                      <div className="text-sm">{poData.createdByName || 'N/A'}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(poData.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-2">APPROVED BY</div>
                    <div className="border-t border-gray-400 pt-2 mt-8">
                      <div className="text-sm text-gray-400">Pending Approval</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
                <p>This is a system-generated purchase order document.</p>
                <p>For questions or concerns, please contact the purchasing department.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={onClose}>
            OK
          </Button>
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-content, #print-content * {
              visibility: visible;
            }
            #print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:p-8 {
              padding: 2rem;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
