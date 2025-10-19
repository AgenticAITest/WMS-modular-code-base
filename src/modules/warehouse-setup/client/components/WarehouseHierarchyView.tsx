import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@client/components/ui/accordion';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Plus, Warehouse, MapPin, Grid3x3, Layers, Package, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@client/provider/AuthProvider';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';

interface Bin {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  maxWeight: number | null;
  maxVolume: number | null;
  accessibilityScore: number | null;
}

interface Shelf {
  id: string;
  name: string;
  description: string | null;
  bins?: Bin[];
}

interface Aisle {
  id: string;
  name: string;
  description: string | null;
  shelves?: Shelf[];
}

interface Zone {
  id: string;
  name: string;
  description: string | null;
  aisles?: Aisle[];
}

interface WarehouseType {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  zones?: Zone[];
}

export const WarehouseHierarchyView = () => {
  const { token: accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWarehouses, setExpandedWarehouses] = useState<string[]>([]);
  const [expandedZones, setExpandedZones] = useState<string[]>([]);
  const [expandedAisles, setExpandedAisles] = useState<string[]>([]);
  const [expandedShelves, setExpandedShelves] = useState<string[]>([]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      console.log('Fetching warehouses with token:', accessToken ? 'Token present' : 'NO TOKEN');
      const response = await axios.get('/api/modules/warehouse-setup/warehouses', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 }
      });
      console.log('Warehouse response:', response.data);
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async (warehouseId: string) => {
    try {
      const response = await axios.get('/api/modules/warehouse-setup/zones', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { warehouseId, limit: 100 }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching zones:', error);
      return [];
    }
  };

  const fetchAisles = async (zoneId: string) => {
    try {
      const response = await axios.get('/api/modules/warehouse-setup/aisles', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { zoneId, limit: 100 }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching aisles:', error);
      return [];
    }
  };

  const fetchShelves = async (aisleId: string) => {
    try {
      const response = await axios.get('/api/modules/warehouse-setup/shelves', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { aisleId, limit: 100 }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching shelves:', error);
      return [];
    }
  };

  const fetchBins = async (shelfId: string) => {
    try {
      const response = await axios.get('/api/modules/warehouse-setup/bins', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { shelfId, limit: 100 }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching bins:', error);
      return [];
    }
  };

  const loadWarehouseZones = async (warehouseId: string) => {
    const zones = await fetchZones(warehouseId);
    setWarehouses(prev => prev.map(w => 
      w.id === warehouseId ? { ...w, zones } : w
    ));
  };

  const loadZoneAisles = async (warehouseId: string, zoneId: string) => {
    const aisles = await fetchAisles(zoneId);
    setWarehouses(prev => prev.map(w => 
      w.id === warehouseId 
        ? { ...w, zones: w.zones?.map(z => z.id === zoneId ? { ...z, aisles } : z) }
        : w
    ));
  };

  const loadAisleShelves = async (warehouseId: string, zoneId: string, aisleId: string) => {
    const shelves = await fetchShelves(aisleId);
    setWarehouses(prev => prev.map(w => 
      w.id === warehouseId 
        ? { 
            ...w, 
            zones: w.zones?.map(z => 
              z.id === zoneId 
                ? { ...z, aisles: z.aisles?.map(a => a.id === aisleId ? { ...a, shelves } : a) }
                : z
            )
          }
        : w
    ));
  };

  const loadShelfBins = async (warehouseId: string, zoneId: string, aisleId: string, shelfId: string) => {
    const bins = await fetchBins(shelfId);
    setWarehouses(prev => prev.map(w => 
      w.id === warehouseId 
        ? { 
            ...w, 
            zones: w.zones?.map(z => 
              z.id === zoneId 
                ? { 
                    ...z, 
                    aisles: z.aisles?.map(a => 
                      a.id === aisleId 
                        ? { ...a, shelves: a.shelves?.map(s => s.id === shelfId ? { ...s, bins } : s) }
                        : a
                    )
                  }
                : z
            )
          }
        : w
    ));
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleWarehouseExpand = async (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (warehouse && !warehouse.zones) {
      await loadWarehouseZones(warehouseId);
    }
  };

  const handleZoneExpand = async (warehouseId: string, zoneId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    const zone = warehouse?.zones?.find(z => z.id === zoneId);
    if (zone && !zone.aisles) {
      await loadZoneAisles(warehouseId, zoneId);
    }
  };

  const handleAisleExpand = async (warehouseId: string, zoneId: string, aisleId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    const zone = warehouse?.zones?.find(z => z.id === zoneId);
    const aisle = zone?.aisles?.find(a => a.id === aisleId);
    if (aisle && !aisle.shelves) {
      await loadAisleShelves(warehouseId, zoneId, aisleId);
    }
  };

  const handleShelfExpand = async (warehouseId: string, zoneId: string, aisleId: string, shelfId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    const zone = warehouse?.zones?.find(z => z.id === zoneId);
    const aisle = zone?.aisles?.find(a => a.id === aisleId);
    const shelf = aisle?.shelves?.find(s => s.id === shelfId);
    if (shelf && !shelf.bins) {
      await loadShelfBins(warehouseId, zoneId, aisleId, shelfId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading warehouses...</div>
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg">
        <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Warehouses Found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get started by creating your first warehouse
        </p>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Warehouse Layout</h2>
          <p className="text-sm text-muted-foreground">
            Hierarchical view of warehouses, zones, aisles, shelves, and bins
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <div className="space-y-2">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="border rounded-lg">
            <Accordion
              type="multiple"
              value={expandedWarehouses}
              onValueChange={setExpandedWarehouses}
            >
              <AccordionItem value={warehouse.id} className="border-none">
                <AccordionTrigger
                  className="px-4 py-3 hover:bg-muted/50"
                  onClick={() => handleWarehouseExpand(warehouse.id)}
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <Warehouse className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-semibold">{warehouse.name}</div>
                      {warehouse.address && (
                        <div className="text-sm text-muted-foreground">{warehouse.address}</div>
                      )}
                    </div>
                    <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Zone
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  {!warehouse.zones || warehouse.zones.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No zones. Click "Add Zone" to create one.
                    </div>
                  ) : (
                    <Accordion
                      type="multiple"
                      value={expandedZones}
                      onValueChange={setExpandedZones}
                    >
                      {warehouse.zones.map((zone) => (
                        <AccordionItem key={zone.id} value={zone.id} className="border-l-2 border-primary/20 ml-4">
                          <AccordionTrigger
                            className="px-4 py-2 hover:bg-muted/30"
                            onClick={() => handleZoneExpand(warehouse.id, zone.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              <MapPin className="h-4 w-4 text-blue-500" />
                              <div className="flex-1">
                                <div className="font-medium">{zone.name}</div>
                                {zone.description && (
                                  <div className="text-xs text-muted-foreground">{zone.description}</div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Aisle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-2">
                            {!zone.aisles || zone.aisles.length === 0 ? (
                              <div className="py-3 text-center text-sm text-muted-foreground">
                                No aisles. Click "Add Aisle" to create one.
                              </div>
                            ) : (
                              <Accordion
                                type="multiple"
                                value={expandedAisles}
                                onValueChange={setExpandedAisles}
                              >
                                {zone.aisles.map((aisle) => (
                                  <AccordionItem key={aisle.id} value={aisle.id} className="border-l-2 border-green-500/20 ml-4">
                                    <AccordionTrigger
                                      className="px-4 py-2 hover:bg-muted/30"
                                      onClick={() => handleAisleExpand(warehouse.id, zone.id, aisle.id)}
                                    >
                                      <div className="flex items-center gap-3 flex-1 text-left">
                                        <Grid3x3 className="h-4 w-4 text-green-500" />
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">{aisle.name}</div>
                                          {aisle.description && (
                                            <div className="text-xs text-muted-foreground">{aisle.description}</div>
                                          )}
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                              <Plus className="h-4 w-4 mr-2" />
                                              Add Shelf
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-2">
                                      {!aisle.shelves || aisle.shelves.length === 0 ? (
                                        <div className="py-2 text-center text-xs text-muted-foreground">
                                          No shelves. Click "Add Shelf" to create one.
                                        </div>
                                      ) : (
                                        <Accordion
                                          type="multiple"
                                          value={expandedShelves}
                                          onValueChange={setExpandedShelves}
                                        >
                                          {aisle.shelves.map((shelf) => (
                                            <AccordionItem key={shelf.id} value={shelf.id} className="border-l-2 border-orange-500/20 ml-4">
                                              <AccordionTrigger
                                                className="px-4 py-2 hover:bg-muted/30"
                                                onClick={() => handleShelfExpand(warehouse.id, zone.id, aisle.id, shelf.id)}
                                              >
                                                <div className="flex items-center gap-3 flex-1 text-left">
                                                  <Layers className="h-4 w-4 text-orange-500" />
                                                  <div className="flex-1">
                                                    <div className="font-medium text-sm">{shelf.name}</div>
                                                    {shelf.description && (
                                                      <div className="text-xs text-muted-foreground">{shelf.description}</div>
                                                    )}
                                                  </div>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                      <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem>
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Bin
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem className="text-destructive">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                              </AccordionTrigger>
                                              <AccordionContent className="px-4 pb-2">
                                                {!shelf.bins || shelf.bins.length === 0 ? (
                                                  <div className="py-2 text-center text-xs text-muted-foreground">
                                                    No bins. Click "Add Bin" to create one.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    {shelf.bins.map((bin) => (
                                                      <div
                                                        key={bin.id}
                                                        className="flex items-center gap-3 px-4 py-2 rounded hover:bg-muted/50 border-l-2 border-purple-500/20 ml-4"
                                                      >
                                                        <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                          <div className="font-medium text-sm">{bin.name}</div>
                                                          <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                                            {bin.barcode && <span>Barcode: {bin.barcode}</span>}
                                                            {bin.category && <span>• {bin.category}</span>}
                                                            {bin.accessibilityScore !== null && (
                                                              <span>• Score: {bin.accessibilityScore}</span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                              <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                              <Edit className="h-4 w-4 mr-2" />
                                                              Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive">
                                                              <Trash2 className="h-4 w-4 mr-2" />
                                                              Delete
                                                            </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ))}
      </div>
    </div>
  );
};
