import { describe, it, expect } from 'vitest';
import {
  buildFieldWhitelist,
  buildSchemaFilter,
  type SchemaDefinition,
} from '../../../src/engines/query/schema-filter.js';

const testSchema: SchemaDefinition = {
  _id: 'test:schema',
  properties: {
    DocDetails: {
      type: 'object',
      properties: {
        D_OrderNumber: { type: 'string', required: true, order: 1 },
        D_Date: { type: 'date', required: false, order: 2 },
        D_Hidden: { type: 'string', hidden: true },
      },
    },
    Seller: {
      type: 'contact',
      properties: {
        C_InternalID: { type: 'string', hidden: true },
        C_Organization: { type: 'string', order: 1 },
      },
    },
    OrderedItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          I_SKU: { type: 'string', required: true, order: 1 },
          I_Quantity: { type: 'number', required: true, order: 2 },
          I_HiddenCode: { type: 'string', hidden: true },
        },
      },
    },
  },
};

describe('buildFieldWhitelist', () => {
  it('includes non-hidden object fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    expect(wl.has('DocDetails.D_OrderNumber')).toBe(true);
    expect(wl.has('DocDetails.D_Date')).toBe(true);
    expect(wl.has('Seller.C_Organization')).toBe(true);
  });

  it('excludes hidden fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    expect(wl.has('DocDetails.D_Hidden')).toBe(false);
    expect(wl.has('Seller.C_InternalID')).toBe(false);
    expect(wl.has('OrderedItems.I_HiddenCode')).toBe(false);
  });

  it('includes non-hidden array item fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    expect(wl.has('OrderedItems.I_SKU')).toBe(true);
    expect(wl.has('OrderedItems.I_Quantity')).toBe(true);
  });
});

describe('buildSchemaFilter', () => {
  it('builds simple field filter', () => {
    const wl = buildFieldWhitelist(testSchema);
    const filter = buildSchemaFilter({ 'DocDetails.D_OrderNumber': 'PO123' }, wl, testSchema);
    expect(filter['DocDetails.D_OrderNumber']).toBe('PO123');
  });

  it('coerces number fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    const filter = buildSchemaFilter({ 'OrderedItems.I_Quantity': '42' }, wl, testSchema);
    expect(filter['OrderedItems.I_Quantity']).toBe(42);
  });

  it('uses $elemMatch for multiple array fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    const filter = buildSchemaFilter(
      { 'OrderedItems.I_SKU': 'SKU001', 'OrderedItems.I_Quantity': '5' },
      wl,
      testSchema,
    );
    expect(filter['OrderedItems']).toEqual({ $elemMatch: { 'I_SKU': 'SKU001', 'I_Quantity': 5 } });
  });

  it('throws 400 for unknown fields', () => {
    const wl = buildFieldWhitelist(testSchema);
    expect(() => buildSchemaFilter({ 'DocDetails.Unknown': 'val' }, wl, testSchema)).toThrow(
      "Unknown schema field: 'DocDetails.Unknown'",
    );
  });

  it('blocks system fields (_*)', () => {
    const wl = buildFieldWhitelist(testSchema);
    expect(() => buildSchemaFilter({ '_local.state': 'Contract' }, wl, testSchema)).toThrow(
      "Field '_local.state' is not filterable",
    );
  });
});
