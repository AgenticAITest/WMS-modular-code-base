import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { WarehouseHierarchyView } from '../components/WarehouseHierarchyView';

const PlaceholderTab = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="rounded-full bg-muted p-3 mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md">{description}</p>
  </div>
);

const WarehouseSetupManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'warehouses';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Warehouse Setup</h1>
        <p className="text-muted-foreground">
          Configure warehouses, zones, locations, and storage settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0">
          <TabsTrigger 
            value="warehouses" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Warehouses
          </TabsTrigger>
          <TabsTrigger 
            value="zones"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Zones
          </TabsTrigger>
          <TabsTrigger 
            value="locations"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Locations
          </TabsTrigger>
          <TabsTrigger 
            value="storage-types"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Storage Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="warehouses" className="mt-6">
          <WarehouseHierarchyView />
        </TabsContent>

        <TabsContent value="zones" className="mt-6">
          <PlaceholderTab 
            title="Zones" 
            description="Zone management feature is under development. This will allow you to organize your warehouse into different zones for better inventory control."
          />
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <PlaceholderTab 
            title="Locations" 
            description="Location management feature is under development. This will allow you to define specific storage locations within zones."
          />
        </TabsContent>

        <TabsContent value="storage-types" className="mt-6">
          <PlaceholderTab 
            title="Storage Types" 
            description="Storage type configuration is under development. This will allow you to define different types of storage areas (e.g., Cold Storage, Dry Storage, etc.)."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WarehouseSetupManagement;
