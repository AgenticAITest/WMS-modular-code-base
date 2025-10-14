import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import DataPagination from '@client/components/data-pagination';
import SortButton from '@client/components/sort-button';
import Breadcrumbs from '@client/components/console/Breadcrumbs';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SampleModule {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SampleModuleList: React.FC = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<SampleModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const breadcrumbItems = [
    { label: 'Console', href: '/console' },
    { label: 'Modules', href: '/console/modules' },
    { label: 'Sample Module', href: '/console/modules/sample-module' },
  ];

  const fetchModules = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/modules/sample-module/sample-module?page=${page}&limit=${limit}`);
      setModules(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules(pagination.page, pagination.limit);
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchModules(page, pagination.limit);
  };

  const handleSort = (column: string) => {
    if (sort === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column);
      setOrder('asc');
    }
    // In a real implementation, you would refetch data with new sort parameters
  };

  const handleView = (id: string) => {
    navigate(`/console/modules/sample-module/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/console/modules/sample-module/${id}/edit`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await axios.delete(`/api/modules/sample-module/sample-module/${id}`);
        toast.success('Module deleted successfully');
        fetchModules(pagination.page, pagination.limit);
      } catch (error) {
        console.error('Error deleting module:', error);
        toast.error('Failed to delete module');
      }
    }
  };

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (module.description && module.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pt-4 px-2">
      {/* <Breadcrumbs items={breadcrumbItems} /> */}
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Item List</h1>
        <Button onClick={() => navigate('/console/modules/sample-module/add')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <SortButton 
                          column="name"
                          label="Name" 
                          sort={sort}
                          order={order}
                          sortBy={handleSort}
                        />
                      </th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">
                        <SortButton 
                          column="status"
                          label="Status" 
                          sort={sort}
                          order={order}
                          sortBy={handleSort}
                        />
                      </th>
                      <th className="text-left p-2">Public</th>
                      <th className="text-left p-2">
                        <SortButton 
                          column="createdAt"
                          label="Created" 
                          sort={sort}
                          order={order}
                          sortBy={handleSort}
                        />
                      </th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModules.map((module) => (
                      <tr key={module.id} className="border-b">
                        <td className="p-2 font-medium">{module.name}</td>
                        <td className="p-2 text-muted-foreground">
                          {module.description || '-'}
                        </td>
                        <td className="p-2">
                          <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
                            {module.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {module.isPublic ? (
                            <Badge variant="outline">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(module.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(module.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(module.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(module.id, module.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredModules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No Items found
                </div>
              )}

              <div className="mt-6">
                <DataPagination
                  page={pagination.page}
                  perPage={pagination.limit}
                  count={pagination.total}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(SampleModuleList, {
  moduleId: 'sample-module',
  moduleName: 'Sample Module'
});