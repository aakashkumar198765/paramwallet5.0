import type { SchemaDefinition, SchemaGroup, SchemaField } from '@/types/definitions';

/**
 * Get schema groups sorted by their order property.
 */
export function getSortedGroups(
  schema: SchemaDefinition
): Array<[string, SchemaGroup]> {
  return Object.entries(schema.properties).sort(
    ([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999)
  );
}

/**
 * Get fields within a group sorted by their order property.
 * Skips hidden fields.
 */
export function getSortedFields(
  group: SchemaGroup,
  includeHidden = false
): Array<[string, SchemaField]> {
  const properties = group.properties ?? {};
  return Object.entries(properties)
    .filter(([, f]) => includeHidden || !f.hidden)
    .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Get the primary display fields (order 1, 2, 3) for column headers.
 */
export function getPrimaryFields(
  schema: SchemaDefinition | null | undefined
): Array<[string, string, SchemaField]> {
  if (!schema) return [];
  const results: Array<[string, string, SchemaField]> = [];

  for (const [groupKey, group] of Object.entries(schema.properties)) {
    const fields = getSortedFields(group);
    for (const [fieldKey, field] of fields) {
      if ((field.order ?? 999) <= 3) {
        results.push([groupKey, fieldKey, field]);
      }
    }
  }

  return results.sort(([, , a], [, , b]) => (a.order ?? 999) - (b.order ?? 999)).slice(0, 3);
}
