import React from 'react';

interface WorkflowComponentProps {
  // Add your props here
}

const WorkflowComponent: React.FC<WorkflowComponentProps> = (props) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Workflow Component</h2>
      <p className="text-muted-foreground">
        This is a reusable component for Workflow.
      </p>
    </div>
  );
};

export default WorkflowComponent;
