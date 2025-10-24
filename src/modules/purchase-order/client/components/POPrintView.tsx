import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import { Button } from '@client/components/ui/button';
import { Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && poData?.id) {
      fetchGeneratedDocument();
    }
  }, [open, poData?.id]);

  const fetchGeneratedDocument = async () => {
    try {
      setLoading(true);
      // Fetch the generated document record
      const docResponse = await axios.get(
        `/api/modules/document-numbering/documents/by-reference/purchase_order/${poData.id}`
      );

      if (docResponse.data.data && docResponse.data.data.length > 0) {
        // Get the latest version (first item, since API returns ordered by version desc)
        const document = docResponse.data.data[0];
        const htmlPath = document.files?.html?.path;

        if (htmlPath) {
          // Fetch the actual HTML file
          const htmlResponse = await axios.get(`/${htmlPath}`, {
            responseType: 'text',
          });
          setHtmlContent(htmlResponse.data);
        } else {
          toast.error('Document HTML file path not found');
        }
      } else {
        toast.error('No generated document found for this PO');
      }
    } catch (error) {
      console.error('Error fetching generated document:', error);
      toast.error('Failed to load PO document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Print the iframe content
    const iframe = document.getElementById('po-document-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  if (!poData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90rem] sm:max-w-[90rem] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Purchase Order - {poData.orderNumber}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="text-lg">Loading document...</div>
            </div>
          </div>
        ) : htmlContent ? (
          <div className="flex-1 overflow-hidden">
            <iframe
              id="po-document-iframe"
              srcDoc={htmlContent}
              className="w-full h-[600px] border-0"
              title="Purchase Order Document"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center text-destructive">
              Failed to load document
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePrint} disabled={!htmlContent}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
