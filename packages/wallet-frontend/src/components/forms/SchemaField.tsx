import { Controller, type Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SchemaField as SchemaFieldType } from '@/types/definitions';
import { cn } from '@/lib/utils';

interface SchemaFieldProps {
  fieldKey: string;
  field: SchemaFieldType;
  name: string; // react-hook-form field name
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
}

export function SchemaFieldInput({ fieldKey, field, name, control, disabled }: SchemaFieldProps) {
  const label = field.title ?? fieldKey;
  const required = field.required ?? false;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
        {label}
      </Label>
      {field.desc && <p className="text-xs text-muted-foreground">{field.desc}</p>}

      <Controller
        name={name}
        control={control}
        rules={{ required: required ? `${label} is required` : false }}
        render={({ field: rhfField, fieldState }) => {
          if (field.type === 'boolean') {
            return (
              <div className="flex items-center gap-2">
                <Switch
                  id={name}
                  checked={Boolean(rhfField.value)}
                  onCheckedChange={rhfField.onChange}
                  disabled={disabled}
                />
                <Label htmlFor={name} className="font-normal text-muted-foreground">
                  {rhfField.value ? 'Yes' : 'No'}
                </Label>
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            );
          }

          if (field.enum && field.enum.length > 0) {
            return (
              <div>
                <Select
                  value={String(rhfField.value ?? '')}
                  onValueChange={rhfField.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id={name}>
                    <SelectValue placeholder={`Select ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.enum.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            );
          }

          return (
            <div>
              <Input
                id={name}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                placeholder={field.desc ?? label}
                value={String(rhfField.value ?? '')}
                onChange={rhfField.onChange}
                onBlur={rhfField.onBlur}
                disabled={disabled}
                className={fieldState.error ? 'border-destructive' : ''}
              />
              {fieldState.error && (
                <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
