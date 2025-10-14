import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Badge } from '@client/components/ui/badge';
import Breadcrumbs from '@client/components/console/Breadcrumbs';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface SampleModule {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const SampleModuleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<SampleModule | null>(null);
  const [loading, setLoading] = useState(true);

  const breadcrumbItems = [
    { label: 'Sample List', href: '/console/modules/sample-module' },
    { label: 'Details', href: `/console/modules/sample-module/${id}` },
  ];

  useEffect(() => {
    if (id) {
      fetchModule();
    }
  }, [id]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/modules/sample-module/sample-module/${id}`);
      setModule(response.data);
    } catch (error) {
      console.error('Error fetching module:', error);
      toast.error('Failed to fetch module details');
      navigate('/console/modules/sample-module');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!module) return;
    
    if (window.confirm(`Are you sure you want to delete "${module.name}"?`)) {
      try {
        await axios.delete(`/api/modules/sample-module/sample-module/${id}`);
        toast.success('Module deleted successfully');
        navigate('/console/modules/sample-module');
      } catch (error) {
        console.error('Error deleting module:', error);
        toast.error('Failed to delete module');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Item not found</h2>
        <Button onClick={() => navigate('/console/modules/sample-module')} className="mt-4">
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/console/modules/sample-module')}
          >
            <ArrowLeft className="mr-0 h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{module.name}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/console/modules/sample-module/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Name</h3>
              <p className="text-lg">{module.name}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Description</h3>
              <p className="text-sm">{module.description || 'No description provided'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
              <div className="mt-1">
                <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
                  {module.status}
                </Badge>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Public</h3>
              <div className="mt-1">
                {module.isPublic ? (
                  <Badge variant="outline">Yes</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">No</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Created</h3>
              <p className="text-sm">
                {new Date(module.createdAt).toLocaleString()}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Last Updated</h3>
              <p className="text-sm">
                {new Date(module.updatedAt).toLocaleString()}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">ID</h3>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {module.id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default withModuleAuthorization(SampleModuleDetail, {
  moduleId: 'sample-module',
  moduleName: 'Sample Module'
});