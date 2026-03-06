import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { useSuperAppStore } from '@/store/superapp.store';
import { useSMs, useSchema } from '@/hooks/use-definitions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createDocument } from '@/api/paramgateway/stubs';
import { toast } from '@/hooks/use-toast';
import { flattenSchema, fieldLabel, getFieldType } from '@/lib/schema';

export function DocumentCreate() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
  const { activeSuperApp } = useSuperAppStore();
  const navigate = useNavigate();

  const [selectedSmId, setSelectedSmId] = useState('');
  const [selectedSchemaId, setSelectedSchemaId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: sms, isLoading: loadingSMs } = useSMs(workspaceId ?? '');
  const { data: schema, isLoading: loadingSchema } = useSchema(workspaceId ?? '', selectedSchemaId);

  const { register, handleSubmit, setValue } = useForm<Record<string, unknown>>();

  const linkedSMs = activeSuperApp?.linkedSMs ?? [];
  const availableSMs = sms?.filter((sm) => linkedSMs.includes(sm._id)) ?? [];

  const selectedSM = sms?.find((sm) => sm._id === selectedSmId);
  const startState = selectedSM?.startAt ?? '';
  const startStateDef = selectedSM?.states[startState];
  const startSchemaId = startStateDef?.schema ?? '';

  // Auto-select schema when SM changes
  const fields = schema ? flattenSchema(schema) : [];

  const onSubmit = async (data: Record<string, unknown>) => {
    if (!selectedSmId || !startState) {
      toast({ variant: 'destructive', title: 'Select a State Machine first' });
      return;
    }
    setSubmitting(true);
    try {
      await createDocument(selectedSmId, {
        smId: selectedSmId,
        roles: {},
        stateTo: startState,
        subStateTo: null,
        data,
      });
      toast({ title: 'Document creation submitted' });
      navigate(`/${workspaceId}/sa/${superAppId}/documents`);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create document' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">New Document</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6">
          {/* SM selector */}
          <div className="space-y-1.5">
            <Label>State Machine</Label>
            {loadingSMs ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Select
                value={selectedSmId}
                onValueChange={(v) => {
                  setSelectedSmId(v);
                  setSelectedSchemaId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state machine" />
                </SelectTrigger>
                <SelectContent>
                  {availableSMs.map((sm) => (
                    <SelectItem key={sm._id} value={sm._id}>
                      {sm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start state info */}
          {startState && (
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Start state: </span>
              <span className="font-mono font-medium">{startState}</span>
              {startSchemaId && (
                <>
                  <span className="text-muted-foreground ml-4">Schema: </span>
                  <span className="font-mono font-medium">{startSchemaId}</span>
                </>
              )}
            </div>
          )}

          {/* Schema-driven fields */}
          {loadingSchema && <LoadingSpinner size="sm" />}
          {fields.map((field) => {
            const type = getFieldType(field.prop);
            const label = fieldLabel(field.key, field.prop);

            if (type === 'boolean') {
              return (
                <div key={field.key} className="flex items-center justify-between">
                  <Label htmlFor={field.key}>{label}</Label>
                  <Switch
                    id={field.key}
                    onCheckedChange={(checked) => setValue(field.key, checked)}
                  />
                </div>
              );
            }

            if (type === 'enum' && field.prop.enum) {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{label}</Label>
                  <Select onValueChange={(v) => setValue(field.key, v)}>
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder={`Select ${label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.prop.enum.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{label}</Label>
                <Input
                  id={field.key}
                  type={type === 'number' ? 'number' : 'text'}
                  {...register(field.key)}
                />
              </div>
            );
          })}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting || !selectedSmId}>
              {submitting ? 'Submitting…' : 'Create Document'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
