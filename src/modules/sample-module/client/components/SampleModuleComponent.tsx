import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Badge } from '@client/components/ui/badge';

interface SampleModuleComponentProps {
  module: {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  };
  onClick?: (moduleId: string) => void;
}

export const SampleModuleComponent: React.FC<SampleModuleComponentProps> = ({ 
  module, 
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(module.id);
    }
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{module.name}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
              {module.status}
            </Badge>
            {module.isPublic && (
              <Badge variant="outline">Public</Badge>
            )}
          </div>
        </div>
        {module.description && (
          <CardDescription className="mt-2">
            {module.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Created: {new Date(module.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(module.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleModuleComponent;