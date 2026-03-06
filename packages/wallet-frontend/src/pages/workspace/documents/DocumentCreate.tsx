import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SchemaForm } from '@/components/forms/SchemaForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { getOnchainSchema } from '@/api/definitions.api';
import { createDocument } from '@/api/paramgateway/stubs/documentCreate';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

export default function DocumentCreate() {
  const { workspace, superAppId, smId } = useParams<{ workspace: string; superAppId: string; smId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load schema for the start state of this SM
  const { data: schema, isLoading } = useQuery({
    queryKey: ['schema', smId],
    queryFn: () => getOnchainSchema(smId!),
    enabled: !!smId,
  });

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      // ParamGateway stub — returns { success: true }
      await createDocument('pipe:create-document-v1', {
        ...formData,
        _chain: {
          smId,
          superAppId,
          workspace,
        },
      });

      toast({
        title: 'Document created',
        description: 'Document created successfully',
      });

      navigate(`/workspace/${workspace}/${superAppId}/documents`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!schema) return <div>Schema not found</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/workspace/${workspace}/${superAppId}/documents`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Create Document</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-4xl p-6">
          <SchemaForm
            schema={schema}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </Card>
      </div>
    </div>
  );
}
