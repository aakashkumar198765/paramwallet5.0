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

export type FilterOperator = 'exact' | 'gte' | 'lte' | 'contains' | 'in';

export interface ParsedFilterParam {
  field: string;
  operator: FilterOperator;
  value: string;
}

/** Validate result: either valid parsed params, or an error to return 400. */
export type FilterValidationResult =
  | { ok: true; params: ParsedFilterParam[] }
  | { ok: false; error: string; field: string };

/**
 * Walk a schema's properties tree and build a Set of all valid field paths.
 * MED-7 fix: Also adds plain paths (without []) so filter[OrderedItems.I_SKU] matches
 * whitelist entry OrderedItems[].I_SKU. Both forms stored for grouping + lookup.
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
      const nested = buildFieldWhitelist(prop as Record<string, unknown>, fieldPath);
      for (const f of nested) whitelist.add(f);
    }

    // Recurse into array item objects
    if (prop.items?.properties) {
      const arrayItemPrefix = `${fieldPath}[]`;
      const nested = buildFieldWhitelist(prop.items as Record<string, unknown>, arrayItemPrefix);
      whitelist.add(arrayItemPrefix);
      for (const f of nested) {
        whitelist.add(f);
        // Also add the plain (no []) path so filter[Field.SubField] matches
        whitelist.add(f.replace(`${arrayItemPrefix}.`, `${fieldPath}.`));
      }
    }
  }

  return whitelist;
}

/**
 * HIGH-8 + HIGH-9 fix: Parse and validate raw query entries matching filter[path] or filter[path][op].
 * Returns 400 error info if any field is a system field (_prefix) or not in the whitelist.
 * Operators: gte, lte, contains, in — plus no operator = exact match.
 */
export function parseAndValidateFilterParams(
  rawQuery: Record<string, string>,
  whitelist: Set<string>
): FilterValidationResult {
  const params: ParsedFilterParam[] = [];
  const OPS = new Set(['gte', 'lte', 'contains', 'in']);
  // Matches: filter[path] or filter[path][op]
  const RE = /^filter\[([^\]]+)\](?:\[([^\]]+)\])?$/;

  for (const [k, value] of Object.entries(rawQuery)) {
    const m = k.match(RE);
    if (!m) continue;

    const field = m[1];
    const opRaw = m[2] ?? '';
    const operator: FilterOperator = (OPS.has(opRaw) ? opRaw : 'exact') as FilterOperator;

    // Reject system fields
    if (field.startsWith('_')) {
      return { ok: false, error: 'Filter on system fields is not allowed', field };
    }

    // Reject unknown fields (normalize: strip [] for lookup)
    const lookupField = field.replace(/\[\]/g, '');
    if (!whitelist.has(lookupField) && !whitelist.has(field)) {
      return { ok: false, error: 'Unknown schema field', field };
    }

    params.push({ field, operator, value });
  }

  return { ok: true, params };
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
 * Apply a single filter operator to build a MongoDB condition.
 */
function applyOperator(
  operator: FilterOperator,
  value: string,
  prop: SchemaProperty | null
): unknown {
  switch (operator) {
    case 'gte':
      return { $gte: prop ? coerceValue(value, prop) : value };
    case 'lte':
      return { $lte: prop ? coerceValue(value, prop) : value };
    case 'contains':
      // Case-insensitive substring match
      return { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    case 'in':
      // Comma-separated list
      return { $in: value.split(',').map(v => prop ? coerceValue(v.trim(), prop) : v.trim()) };
    default:
      // exact match
      return prop ? coerceValue(value, prop) : value;
  }
}

/**
 * Build a MongoDB filter from parsed+validated filter params.
 * Array sub-fields sharing the same array parent are grouped into $elemMatch.
 * HIGH-8 + HIGH-9: Accepts ParsedFilterParam[] (already validated, with operators).
 */
export function buildSchemaFilter(
  parsedParams: ParsedFilterParam[],
  whitelist: Set<string>,
  schemaProperties: Record<string, SchemaProperty>
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // Group array sub-fields by their array parent for $elemMatch
  const arrayGroups: Record<string, Array<{ subField: string; operator: FilterOperator; value: string }>> = {};
  const directParams: ParsedFilterParam[] = [];

  for (const param of parsedParams) {
    const parts = param.field.split('.');
    let isArray = false;
    let arrayPrefix = '';

    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      if (whitelist.has(`${prefix}[]`)) {
        isArray = true;
        arrayPrefix = prefix;
        break;
      }
    }

    if (isArray) {
      if (!arrayGroups[arrayPrefix]) arrayGroups[arrayPrefix] = [];
      const subField = param.field.slice(arrayPrefix.length + 1);
      arrayGroups[arrayPrefix].push({ subField, operator: param.operator, value: param.value });
    } else {
      directParams.push(param);
    }
  }

  // Direct (non-array) fields
  for (const { field, operator, value } of directParams) {
    const prop = getPropertyForPath(schemaProperties, field);
    const condition = applyOperator(operator, value, prop);
    if (operator !== 'exact') {
      filter[field] = condition;
    } else {
      filter[field] = condition;
    }
  }

  // Array fields — group into $elemMatch
  for (const [arrayField, entries] of Object.entries(arrayGroups)) {
    const elemMatch: Record<string, unknown> = {};
    for (const { subField, operator, value } of entries) {
      const fullPath = `${arrayField}.${subField}`;
      const prop = getPropertyForPath(schemaProperties, fullPath);
      elemMatch[subField] = applyOperator(operator, value, prop);
    }
    filter[arrayField] = { $elemMatch: elemMatch };
  }

  return filter;
}
