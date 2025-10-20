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
import { AddWarehouseDialog } from './AddWarehouseDialog';
import { AddZoneDialog } from './AddZoneDialog';
import { AddAisleDialog } from './AddAisleDialog';
import { AddShelfDialog } from './AddShelfDialog';
import { AddBinDialog } from './AddBinDialog';

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

  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [aisleDialogOpen, setAisleDialogOpen] = useState(false);
  const [shelfDialogOpen, setShelfDialogOpen] = useState(false);
  const [binDialogOpen, setBinDialogOpen] = useState(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState<{ id: string; name: string } | null>(null);
  const [selectedZone, setSelectedZone] = useState<{ id: string; name: string } | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<{ id: string; name: string } | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<{ id: string; name: string } | null>(null);

  const fetchWarehouses = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/warehouse-setup/warehouses', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100, includeHierarchy: true }
      });
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshWarehouses = async () => {
    if (!accessToken) return;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const response = await axios.get('/api/modules/warehouse-setup/warehouses', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100, includeHierarchy: true }
      });
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [accessToken]);

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
        <Button onClick={() => setWarehouseDialogOpen(true)}>
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
        <Button onClick={() => setWarehouseDialogOpen(true)}>
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
                <div className="relative">
                  <AccordionTrigger
                    className="px-4 py-3 hover:bg-muted/50 pr-16"
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
                    </div>
                  </AccordionTrigger>
                  <div className="absolute right-4 top-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedWarehouse({ id: warehouse.id, name: warehouse.name });
                            setZoneDialogOpen(true);
                          }}
                        >
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
                </div>
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
                          <div className="relative">
                            <AccordionTrigger
                              className="px-4 py-2 hover:bg-muted/30 pr-12"
                            >
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                <div className="flex-1">
                                  <div className="font-medium">{zone.name}</div>
                                  {zone.description && (
                                    <div className="text-xs text-muted-foreground">{zone.description}</div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <div className="absolute right-3 top-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedZone({ id: zone.id, name: zone.name });
                                      setAisleDialogOpen(true);
                                    }}
                                  >
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
                          </div>
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
                                    <div className="relative">
                                      <AccordionTrigger
                                        className="px-4 py-2 hover:bg-muted/30 pr-12"
                                      >
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                          <Grid3x3 className="h-4 w-4 text-green-500" />
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">{aisle.name}</div>
                                            {aisle.description && (
                                              <div className="text-xs text-muted-foreground">{aisle.description}</div>
                                            )}
                                          </div>
                                        </div>
                                      </AccordionTrigger>
                                      <div className="absolute right-3 top-2">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setSelectedAisle({ id: aisle.id, name: aisle.name });
                                                setShelfDialogOpen(true);
                                              }}
                                            >
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
                                    </div>
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
                                              <div className="relative">
                                                <AccordionTrigger
                                                  className="px-4 py-2 hover:bg-muted/30 pr-12"
                                                >
                                                  <div className="flex items-center gap-3 flex-1 text-left">
                                                    <Layers className="h-4 w-4 text-orange-500" />
                                                    <div className="flex-1">
                                                      <div className="font-medium text-sm">{shelf.name}</div>
                                                      {shelf.description && (
                                                        <div className="text-xs text-muted-foreground">{shelf.description}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </AccordionTrigger>
                                                <div className="absolute right-3 top-2">
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem
                                                        onClick={() => {
                                                          setSelectedShelf({ id: shelf.id, name: shelf.name });
                                                          setBinDialogOpen(true);
                                                        }}
                                                      >
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
                                              </div>
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

      <AddWarehouseDialog
        open={warehouseDialogOpen}
        onOpenChange={setWarehouseDialogOpen}
        onSuccess={refreshWarehouses}
      />

      {selectedWarehouse && (
        <AddZoneDialog
          open={zoneDialogOpen}
          onOpenChange={setZoneDialogOpen}
          warehouseId={selectedWarehouse.id}
          warehouseName={selectedWarehouse.name}
          onSuccess={refreshWarehouses}
        />
      )}

      {selectedZone && (
        <AddAisleDialog
          open={aisleDialogOpen}
          onOpenChange={setAisleDialogOpen}
          zoneId={selectedZone.id}
          zoneName={selectedZone.name}
          onSuccess={refreshWarehouses}
        />
      )}

      {selectedAisle && (
        <AddShelfDialog
          open={shelfDialogOpen}
          onOpenChange={setShelfDialogOpen}
          aisleId={selectedAisle.id}
          aisleName={selectedAisle.name}
          onSuccess={refreshWarehouses}
        />
      )}

      {selectedShelf && (
        <AddBinDialog
          open={binDialogOpen}
          onOpenChange={setBinDialogOpen}
          shelfId={selectedShelf.id}
          shelfName={selectedShelf.name}
          onSuccess={refreshWarehouses}
        />
      )}
    </div>
  );
};
