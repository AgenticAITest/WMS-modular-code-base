import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@client/provider/AuthProvider';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Input } from '@client/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/alert-dialog';
import InventoryTypeDialog from './InventoryTypeDialog';

interface InventoryType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

const InventoryTypeTab = () => {
  const { user } = useAuth();
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryType | null>(null);

  const fetchInventoryTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/master-data/product-types', {
        params: {
          page: 1,
          limit: 100,
          search: searchTerm || undefined,
        },
      });
      setInventoryTypes(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch inventory types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryTypes();
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: InventoryType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: InventoryType) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/master-data/product-types/${deletingItem.id}`);
      toast.success('Inventory type deleted successfully');
      fetchInventoryTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete inventory type');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingItem(null);
    fetchInventoryTypes();
  };

  const filteredTypes = inventoryTypes.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Inventory Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage inventory type categories used for classification
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory Type
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No inventory types found
                </TableCell>
              </TableRow>
            ) : (
              filteredTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? 'default' : 'secondary'}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the inventory type "{deletingItem?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryTypeTab;
