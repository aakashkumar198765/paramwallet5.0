import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPlants } from '@/api/workspace.api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Plants() {
  const { workspace } = useParams<{ workspace: string }>();

  const { data: plants, isLoading } = useQuery({
    queryKey: ['plants', workspace],
    queryFn: listPlants,
    enabled: !!workspace,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!plants || plants.length === 0) {
    return <div className="p-6">No plants configured</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Plants</h2>

      <div className="space-y-3">
        {plants.map((plant: any) => (
          <Card key={plant._id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{plant.name}</div>
                <div className="text-sm text-muted-foreground">Code: {plant.code}</div>
                {plant.location && (
                  <div className="text-sm text-muted-foreground">
                    {[plant.location.city, plant.location.state, plant.location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
              <Badge variant={plant.isActive ? 'default' : 'secondary'}>
                {plant.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
