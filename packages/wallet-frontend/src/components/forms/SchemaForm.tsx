import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SchemaFieldInput } from './SchemaField';
import { getSortedGroups, getSortedFields } from '@/lib/schema';
import type { SchemaDefinition } from '@/types/definitions';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';

interface SchemaFormProps {
  schema: SchemaDefinition;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  submitLabel?: string;
}

function ArrayGroupSection({
  groupKey,
  schema,
  control,
}: {
  groupKey: string;
  schema: SchemaDefinition;
  control: ReturnType<typeof useForm<Record<string, unknown>>>['control'];
}) {
  const group = schema.properties[groupKey];
  const itemProps = group.items?.properties ?? {};
  const { fields, append, remove } = useFieldArray({
    control: control as never,
    name: groupKey,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{groupKey}</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({})}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
      </div>
      <div className="mt-2 space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="relative rounded-md border p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6 text-destructive"
              onClick={() => remove(idx)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(itemProps)
                .filter(([, f]) => !f.hidden)
                .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999))
                .map(([fk, f]) => (
                  <SchemaFieldInput
                    key={fk}
                    fieldKey={fk}
                    field={f}
                    name={`${groupKey}.${idx}.${fk}`}
                    control={control as unknown as ReturnType<typeof useForm<Record<string, unknown>>>['control']}
                  />
                ))}
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No items yet. Click Add Row.</p>
        )}
      </div>
    </div>
  );
}

export function SchemaForm({
  schema,
  defaultValues = {},
  onSubmit,
  isSubmitting,
  disabled,
  submitLabel = 'Submit',
}: SchemaFormProps) {
  const {
    control,
    handleSubmit,
  } = useForm<Record<string, unknown>>({
    defaultValues,
  });

  const sortedGroups = getSortedGroups(schema);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {sortedGroups.map(([groupKey, group], idx) => (
        <div key={groupKey}>
          {idx > 0 && <Separator className="mb-4" />}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.type === 'contact' ? `Party: ${groupKey}` : groupKey}
            </h3>

            {group.type === 'array' ? (
              <ArrayGroupSection groupKey={groupKey} schema={schema} control={control} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {getSortedFields(group).map(([fieldKey, field]) => (
                  <SchemaFieldInput
                    key={fieldKey}
                    fieldKey={fieldKey}
                    field={field}
                    name={`${groupKey}.${fieldKey}`}
                    control={control}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      <Button type="submit" disabled={isSubmitting || disabled} className="w-full">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
