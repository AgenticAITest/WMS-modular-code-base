import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';

interface PlaceholderProps {
  title: string;
}

export const PurchaseOrderPlaceholder: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">This feature is coming soon</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Development</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This module is currently under development and will be available in a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const ApprovePOPage = () => <PurchaseOrderPlaceholder title="Approve Purchase Order" />;
export const ReceivePOPage = () => <PurchaseOrderPlaceholder title="Receive" />;
export const PutawayPOPage = () => <PurchaseOrderPlaceholder title="Putaway" />;
