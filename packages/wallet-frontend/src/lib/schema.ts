import type { SchemaProperty, OnchainSchemaDefinition } from '@/types/definitions';

export interface FieldEntry {
  key: string;
  path: string;
  prop: SchemaProperty;
  order: number;
  groupKey?: string;
  isArray?: boolean;
}

/**
 * Flattens schema properties into an ordered list of renderable fields.
 * Skips hidden fields. Groups are handled as nested entries.
 */
export function flattenSchema(schema: OnchainSchemaDefinition): FieldEntry[] {
  const entries: FieldEntry[] = [];

  const processProps = (
    props: Record<string, SchemaProperty>,
    prefix = '',
    groupKey?: string,
    baseOrder = 0,
  ) => {
    const sorted = Object.entries(props).sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));

    for (const [key, prop] of sorted) {
      if (prop.hidden) continue;

      const path = prefix ? `${prefix}.${key}` : key;
      const order = baseOrder + (prop.order ?? 99);

      if (prop.type === 'object' && prop.properties) {
        processProps(prop.properties, path, key, order * 100);
      } else if (prop.type === 'array') {
        entries.push({ key, path, prop, order, groupKey, isArray: true });
      } else {
        entries.push({ key, path, prop, order, groupKey });
      }
    }
  };

  processProps(schema.properties);
  return entries.sort((a, b) => a.order - b.order);
}

/**
 * Returns display label for a field key (converts C_FieldName → Field Name).
 */
export function fieldLabel(key: string, prop: SchemaProperty): string {
  if (prop.label) return prop.label;
  // Strip prefixes like C_, I_, etc. and convert camelCase to words
  const cleaned = key.replace(/^[A-Z]_/, '');
  return cleaned.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Build Zod-compatible field validation from schema property.
 */
export function getFieldType(prop: SchemaProperty): string {
  if (prop.enum) return 'enum';
  return prop.type;
}
