import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOffchainDefinitions, getOffchainRegistry } from '@/api/offchain.api';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useState } from 'react';

export default function MasterData() {
  const { superAppId } = useParams<{ superAppId: string }>();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const { data: offchainDefs, isLoading: isLoadingDefs } = useQuery({
    queryKey: ['offchainDefinitions'],
    queryFn: getOffchainDefinitions,
  });

  if (isLoadingDefs) return <LoadingSpinner />;
  if (!offchainDefs || offchainDefs.length === 0) {
    return <div className="p-6">No offchain collections configured</div>;
  }

  const collections = Object.entries(offchainDefs[0]?.states || {});

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Master Data</h2>

      <Tabs defaultValue={collections[0]?.[0] || ''} onValueChange={setSelectedCollection}>
        <TabsList>
          {collections.map(([name]) => (
            <TabsTrigger key={name} value={name}>
              {name}
            </TabsTrigger>
          ))}
        </TabsList>

        {collections.map(([name, config]: [string, any]) => (
          <TabsContent key={name} value={name}>
            <CollectionData collectionName={config.collection} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CollectionData({ collectionName }: { collectionName: string }) {
  const { data: records, isLoading } = useQuery({
    queryKey: ['offchainRegistry', collectionName],
    queryFn: () => getOffchainRegistry(collectionName),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!records || records.length === 0) {
    return <div>No records in this collection</div>;
  }

  return (
    <div className="space-y-3">
      {records.map((record: any, idx: number) => (
        <Card key={record._id || idx} className="p-4">
          <pre className="text-sm overflow-auto">{JSON.stringify(record, null, 2)}</pre>
        </Card>
      ))}
    </div>
  );
}
