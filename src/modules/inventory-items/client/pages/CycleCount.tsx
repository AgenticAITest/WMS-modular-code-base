import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { Construction } from 'lucide-react';

const CycleCount = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cycle Count / Audit</h1>
          <p className="text-muted-foreground">
            Perform physical inventory counts and audits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Construction className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">This feature is under development</p>
            <p className="text-sm mt-2">
              Cycle count and audit functionality will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(CycleCount, {
  moduleId: 'inventory-items',
  moduleName: 'Inventory Items'
});
