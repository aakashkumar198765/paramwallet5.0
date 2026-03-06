/**
 * Schema-based field whitelisting and filter building.
 * Per Section 16.1.1 of the architecture spec.
 */

export interface SchemaProperty {
  type?: string;
  bsonType?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  description?: string;
}

/**
 * Walk a schema's properties tree and build a Set of all valid field paths.
 * Handles nested objects and arrays.
 */
export function buildFieldWhitelist(
  schema: Record<string, unknown>,
  prefix = ''
): Set<string> {
  const whitelist = new Set<string>();
  const properties = (schema.properties ?? {}) as Record<string, SchemaProperty>;

  for (const [key, prop] of Object.entries(properties)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    whitelist.add(fieldPath);

    // Recurse into nested objects
    if (prop.properties) {
      const nested = buildFieldWhitelist(
        prop as Record<string, unknown>,
        fieldPath
      );
      for (const f of nested) whitelist.add(f);
    }

    // Recurse into array item objects
    if (prop.items?.properties) {
      const arrayItemPrefix = `${fieldPath}[]`;
      const nested = buildFieldWhitelist(
        prop.items as Record<string, unknown>,
        arrayItemPrefix
      );
      whitelist.add(arrayItemPrefix);
      for (const f of nested) whitelist.add(f);
    }
  }

  return whitelist;
}

/**
 * Coerce a string value to the correct MongoDB query type based on schema bsonType.
 */
function coerceValue(value: string, prop: SchemaProperty): unknown {
  const t = prop.bsonType ?? prop.type ?? 'string';
  switch (t) {
    case 'int':
    case 'integer':
    case 'long':
      return parseInt(value, 10);
    case 'double':
    case 'decimal':
    case 'number':
      return parseFloat(value);
    case 'bool':
    case 'boolean':
      return value === 'true' || value === '1';
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

/**
 * Get the schema property definition for a dot-notation field path.
 */
function getPropertyForPath(
  schemaProperties: Record<string, SchemaProperty>,
  fieldPath: string
): SchemaProperty | null {
  const parts = fieldPath.split('.');
  let current: Record<string, SchemaProperty> = schemaProperties;

  for (const part of parts) {
    const cleanPart = part.replace('[]', '');
    const prop = current[cleanPart];
    if (!prop) return null;
    if (prop.properties) {
      current = prop.properties;
    } else if (prop.items?.properties) {
      current = prop.items.properties;
    }
  }

  const last = parts[parts.length - 1].replace('[]', '');
  return current[last] ?? null;
}

/**
 * Group filter params by their array field prefix to build $elemMatch queries.
 */
function groupByArrayPrefix(
  filterParams: Record<string, string>,
  whitelist: Set<string>
): {
  direct: Record<string, string>;
  arrayGroups: Record<string, Record<string, string>>;
} {
  const direct: Record<string, string> = {};
  const arrayGroups: Record<string, Record<string, string>> = {};

  for (const [field, value] of Object.entries(filterParams)) {
    // Check if field is under an array (whitelist contains field[] prefix)
    const parts = field.split('.');
    let isArrayField = false;
    let arrayPrefix = '';

    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      if (whitelist.has(`${prefix}[]`)) {
        isArrayField = true;
        arrayPrefix = prefix;
        break;
      }
    }

    if (isArrayField) {
      if (!arrayGroups[arrayPrefix]) arrayGroups[arrayPrefix] = {};
      const subField = field.slice(arrayPrefix.length + 1); // strip "prefix."
      arrayGroups[arrayPrefix][subField] = value;
    } else {
      direct[field] = value;
    }
  }

  return { direct, arrayGroups };
}

/**
 * Build a validated + coerced MongoDB filter from query params.
 * Only whitelisted fields are allowed. Invalid fields are ignored.
 * Array fields use $elemMatch when multiple sub-fields from same array are filtered.
 */
export function buildSchemaFilter(
  filterParams: Record<string, string>,
  whitelist: Set<string>,
  schemaProperties: Record<string, SchemaProperty>
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // Separate unknown/invalid fields
  const validParams: Record<string, string> = {};
  for (const [field, value] of Object.entries(filterParams)) {
    if (whitelist.has(field)) {
      validParams[field] = value;
    }
    // Silently ignore non-whitelisted fields
  }

  const { direct, arrayGroups } = groupByArrayPrefix(validParams, whitelist);

  // Build direct field filters
  for (const [field, value] of Object.entries(direct)) {
    const prop = getPropertyForPath(schemaProperties, field);
    const coerced = prop ? coerceValue(value, prop) : value;
    filter[field] = coerced;
  }

  // Build $elemMatch for array groups
  for (const [arrayField, subFields] of Object.entries(arrayGroups)) {
    const elemMatch: Record<string, unknown> = {};
    for (const [subField, value] of Object.entries(subFields)) {
      const fullPath = `${arrayField}.${subField}`;
      const prop = getPropertyForPath(schemaProperties, fullPath);
      elemMatch[subField] = prop ? coerceValue(value, prop) : value;
    }
    filter[arrayField] = { $elemMatch: elemMatch };
  }

  return filter;
}
