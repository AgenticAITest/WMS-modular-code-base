import { Package } from 'lucide-react';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

const PlaceholderTab = ({ title, description }: PlaceholderTabProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="rounded-full bg-muted p-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Coming Soon</p>
      </div>
    </div>
  );
};

export default PlaceholderTab;
