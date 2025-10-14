import React from 'react';

interface MasterDataComponentProps {
  // Add your props here
}

const MasterDataComponent: React.FC<MasterDataComponentProps> = (props) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Master Data Component</h2>
      <p className="text-muted-foreground">
        This is a reusable component for Master Data.
      </p>
    </div>
  );
};

export default MasterDataComponent;
