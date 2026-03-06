import type { Document } from 'mongodb';

export interface SchemaProperty {
  type: string;
  required?: boolean;
  order?: number;
  hidden?: boolean;
  title?: string;
  enum?: string[];
  items?: { type: string; properties?: Record<string, SchemaProperty> };
  properties?: Record<string, SchemaProperty>;
  desc?: string;
}

export interface SchemaDefinition {
  _id: string;
  properties: Record<string, { type: string; properties?: Record<string, SchemaProperty>; items?: { properties?: Record<string, SchemaProperty> } }>;
}

/**
 * Builds the set of all filterable field paths from a schema definition.
 * System fields (_*) are always excluded.
 * Only non-hidden leaf fields are included.
 *
 * Returns paths in dot notation: "GroupName.FieldName" or "ArrayGroup.items.FieldName"
 */
export function buildFieldWhitelist(schema: SchemaDefinition): Set<string> {
  const whitelist = new Set<string>();

  for (const [groupName, group] of Object.entries(schema.properties)) {
    if (groupName.startsWith('_')) continue;

    if (group.type === 'array' && group.items?.properties) {
      for (const [fieldName, field] of Object.entries(group.items.properties)) {
        if (!field.hidden) {
          whitelist.add(`${groupName}.${fieldName}`);
        }
      }
    } else if (group.properties) {
      for (const [fieldName, field] of Object.entries(group.properties)) {
        if (!field.hidden) {
          whitelist.add(`${groupName}.${fieldName}`);
        }
      }
    }
  }

  return whitelist;
}

/**
 * Coerces a filter value to the correct type based on schema field type.
 */
function coerceValue(value: string, fieldType: string): unknown {
  switch (fieldType) {
    case 'number': {
      const n = Number(value);
      if (isNaN(n)) throw new Error(`Expected number, got: ${value}`);
      return n;
    }
    case 'boolean':
      return value === 'true' || value === '1';
    case 'date': {
      const ts = Number(value);
      return isNaN(ts) ? value : ts;
    }
    default:
      return value;
  }
}

/**
 * Finds a field's schema definition by dot-notation path.
 */
function findFieldSchema(
  schema: SchemaDefinition,
  path: string,
): SchemaProperty | null {
  const parts = path.split('.');
  if (parts.length < 2) return null;

  const [groupName, ...rest] = parts;
  const group = schema.properties[groupName];
  if (!group) return null;

  if (group.type === 'array') {
    const fieldName = rest[rest.length - 1];
    return group.items?.properties?.[fieldName] ?? null;
  }

  let current: Record<string, SchemaProperty> | undefined = group.properties;
  for (const part of rest) {
    if (!current?.[part]) return null;
    const next = current[part];
    current = next.properties;
    if (rest[rest.length - 1] === part) return next;
  }
  return null;
}

/**
 * Builds a MongoDB filter from validated request filter params.
 *
 * filterParams: e.g. { "DocDetails.D_OrderNumber": "PO123", "Seller.C_Organization": "Bosch" }
 *
 * Array fields from the same group are combined with $elemMatch.
 * System fields (_*) and fields not in whitelist → throws 400 error.
 */
export function buildSchemaFilter(
  filterParams: Record<string, string>,
  whitelist: Set<string>,
  schema: SchemaDefinition,
): Document {
  const filter: Document = {};

  // Group array field filters by their group name for $elemMatch
  const arrayGroupFilters: Record<string, Record<string, unknown>> = {};

  for (const [path, rawValue] of Object.entries(filterParams)) {
    // Block system fields
    if (path.startsWith('_')) {
      throw Object.assign(new Error(`Field '${path}' is not filterable`), { statusCode: 400 });
    }

    if (!whitelist.has(path)) {
      throw Object.assign(new Error(`Unknown schema field: '${path}'`), { statusCode: 400 });
    }

    const fieldSchema = findFieldSchema(schema, path);
    if (!fieldSchema) {
      throw Object.assign(new Error(`Field schema not found: '${path}'`), { statusCode: 400 });
    }

    const coerced = coerceValue(rawValue, fieldSchema.type);
    const parts = path.split('.');
    const groupName = parts[0];
    const group = schema.properties[groupName];

    if (group?.type === 'array') {
      // Accumulate for $elemMatch
      if (!arrayGroupFilters[groupName]) arrayGroupFilters[groupName] = {};
      arrayGroupFilters[groupName][parts.slice(1).join('.')] = coerced;
    } else {
      filter[path] = coerced;
    }
  }

  // Build $elemMatch for array groups
  for (const [groupName, fields] of Object.entries(arrayGroupFilters)) {
    const keys = Object.keys(fields);
    if (keys.length === 1) {
      filter[`${groupName}.${keys[0]}`] = fields[keys[0]];
    } else {
      filter[groupName] = { $elemMatch: fields };
    }
  }

  return filter;
}
