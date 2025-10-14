import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/components/ui/select';
import { Switch } from '@client/components/ui/switch';
import Breadcrumbs from '@client/components/console/Breadcrumbs';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { toast } from 'sonner';

const ModuleRegistryAdd: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    moduleId: '',
    moduleName: '',
    description: '',
    version: '',
    category: '',
    isActive: true,
    repositoryUrl: '',
    documentationUrl: '',
  });

  const breadcrumbItems = [
    { label: 'Console', href: '/console' },
    { label: 'System', href: '/console/system' },
    { label: 'Module Registered', href: '/console/system/module-registry' },
    { label: 'Add', href: '/console/system/module-registry/add' },
  ];

  const categories = [
    'Business Logic',
    'Integration',
    'UI Component',
    'Utility',
    'Authentication',
    'Data Management',
    'Communication',
    'Analytics',
    'Sample',
    'Custom'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.moduleId.trim() || !formData.moduleName.trim() || !formData.version.trim() || !formData.category) {
      toast.error('Module ID, Module Name, Version, and Category are required');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/system/module-registry', formData);
      toast.success('Module created successfully');
      navigate('/console/system/module-registry');
    } catch (error: any) {
      console.error('Error creating module:', error);
      if (error.response?.status === 409) {
        toast.error('Module ID already exists. Please choose a different ID.');
      } else {
        toast.error('Failed to create module');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/console/system/module-registry')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Modules
        </Button>
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Add Module</h1>
          <p className="text-muted-foreground">
            Add a new module to the registered modules registry
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="moduleId">Module ID *</Label>
                <Input
                  id="moduleId"
                  value={formData.moduleId}
                  onChange={(e) => handleInputChange('moduleId', e.target.value)}
                  placeholder="e.g., user-management, order-processing"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the module (kebab-case recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moduleName">Module Name *</Label>
                <Input
                  id="moduleName"
                  value={formData.moduleName}
                  onChange={(e) => handleInputChange('moduleName', e.target.value)}
                  placeholder="e.g., User Management, Order Processing"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this module does and its main features"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  placeholder="e.g., 1.0.0, 2.1.3"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="repositoryUrl">Repository URL</Label>
                <Input
                  id="repositoryUrl"
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={(e) => handleInputChange('repositoryUrl', e.target.value)}
                  placeholder="https://github.com/your-org/module-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentationUrl">Documentation URL</Label>
                <Input
                  id="documentationUrl"
                  type="url"
                  value={formData.documentationUrl}
                  onChange={(e) => handleInputChange('documentationUrl', e.target.value)}
                  placeholder="https://docs.your-org.com/modules/module-name"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Module is active and registered for authorization</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/console/system/module-registry')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Module
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ModuleRegistryAdd;