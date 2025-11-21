/**
 * CSV Transformation Utilities for MySQL to PostgreSQL Migration
 * 
 * This module provides helper functions to transform data exported from MySQL
 * into formats suitable for PostgreSQL import via CSV.
 */

/**
 * Convert MySQL boolean representation (0/1) to PostgreSQL boolean (t/f)
 * 
 * @param value - MySQL boolean value (0, 1, "0", "1", or null)
 * @returns PostgreSQL boolean string ("t", "f", or null)
 */
export function transformBoolean(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '\\N') {
    return null;
  }
  
  const normalized = String(value).trim();
  
  if (normalized === '1' || normalized.toLowerCase() === 'true') {
    return 't';
  }
  
  if (normalized === '0' || normalized.toLowerCase() === 'false') {
    return 'f';
  }
  
  throw new Error(`Invalid boolean value: ${value}`);
}

/**
 * Convert MySQL DATETIME/TIMESTAMP to PostgreSQL TIMESTAMPTZ
 * 
 * @param value - MySQL datetime string or Date object
 * @returns ISO 8601 timestamp string with timezone
 */
export function transformTimestamp(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '\\N') {
    return null;
  }
  
  try {
    const date = value instanceof Date ? value : new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    
    return date.toISOString();
  } catch (error) {
    throw new Error(`Failed to transform timestamp '${value}': ${error}`);
  }
}

/**
 * Escape JSON for CSV format (double-quote escaping)
 * 
 * @param value - JSON object or string
 * @returns Escaped JSON string suitable for CSV
 */
export function transformJson(value: object | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '\\N') {
    return null;
  }
  
  try {
    const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Validate JSON
    JSON.parse(jsonString);
    
    // Escape double quotes for CSV
    return jsonString.replace(/"/g, '""');
  } catch (error) {
    throw new Error(`Invalid JSON value: ${error}`);
  }
}

/**
 * Transform NULL representation for PostgreSQL COPY command
 * 
 * @param value - Any value that might be null
 * @returns PostgreSQL NULL representation or the value
 */
export function transformNull(value: any): string {
  if (value === null || value === undefined) {
    return '\\N';
  }
  return String(value);
}

/**
 * Validate and normalize UUID format
 * 
 * @param value - UUID string in various formats
 * @returns Normalized UUID in 8-4-4-4-12 format
 */
export function transformUuid(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '\\N') {
    return null;
  }
  
  const cleaned = value.toLowerCase().trim();
  
  // UUID format: 8-4-4-4-12 hexadecimal
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  
  if (!uuidRegex.test(cleaned)) {
    throw new Error(`Invalid UUID format: ${value}`);
  }
  
  return cleaned;
}

/**
 * Escape string values for CSV format
 * 
 * @param value - String value to escape
 * @returns Escaped string safe for CSV
 */
export function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '\\N') {
    return '\\N';
  }
  
  const str = String(value);
  
  // If string contains delimiter, newline, or quotes, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Transform a complete CSV row for PostgreSQL import
 * 
 * @param row - Object representing a database row
 * @param schema - Column schema with type information
 * @returns CSV-formatted string row
 */
export function transformRow(
  row: Record<string, any>,
  schema: Array<{ name: string; type: string }>
): string {
  const values = schema.map(column => {
    const value = row[column.name];
    
    // Handle NULL
    if (value === null || value === undefined) {
      return '\\N';
    }
    
    // Transform based on type
    switch (column.type.toLowerCase()) {
      case 'boolean':
        return transformBoolean(value);
      
      case 'timestamp':
      case 'timestamptz':
      case 'datetime':
        return transformTimestamp(value);
      
      case 'json':
      case 'jsonb':
        return transformJson(value);
      
      case 'uuid':
        return transformUuid(value);
      
      default:
        return escapeCSV(value);
    }
  });
  
  return values.join(',');
}

/**
 * Batch transform multiple rows
 * 
 * @param rows - Array of database rows
 * @param schema - Column schema with type information
 * @returns Array of CSV-formatted string rows
 */
export function transformBatch(
  rows: Array<Record<string, any>>,
  schema: Array<{ name: string; type: string }>
): string[] {
  return rows.map(row => transformRow(row, schema));
}

/**
 * Generate CREATE TABLE column definitions for PostgreSQL
 * 
 * @param mysqlType - MySQL column type
 * @returns PostgreSQL column type
 */
export function mapColumnType(mysqlType: string): string {
  const type = mysqlType.toLowerCase();
  
  // Boolean types
  if (type.includes('tinyint(1)') || type === 'boolean' || type === 'bool') {
    return 'BOOLEAN';
  }
  
  // Integer types
  if (type.includes('bigint')) return 'BIGINT';
  if (type.includes('int')) return 'INTEGER';
  if (type.includes('smallint')) return 'SMALLINT';
  if (type.includes('tinyint')) return 'SMALLINT';
  
  // Floating point types
  if (type.includes('decimal') || type.includes('numeric')) {
    return mysqlType.toUpperCase(); // Preserve precision
  }
  if (type.includes('double')) return 'DOUBLE PRECISION';
  if (type.includes('float')) return 'REAL';
  
  // Date/Time types
  if (type === 'datetime' || type === 'timestamp') return 'TIMESTAMPTZ';
  if (type === 'date') return 'DATE';
  if (type === 'time') return 'TIME';
  
  // String types
  if (type.includes('varchar')) {
    // Extract length if present
    const match = type.match(/varchar\((\d+)\)/);
    return match ? `VARCHAR(${match[1]})` : 'VARCHAR(255)';
  }
  if (type === 'text' || type === 'mediumtext' || type === 'longtext') return 'TEXT';
  if (type.includes('char')) return 'CHAR';
  
  // Binary types
  if (type.includes('blob')) return 'BYTEA';
  if (type.includes('binary')) return 'BYTEA';
  
  // JSON types
  if (type === 'json') return 'JSONB';
  
  // Default to TEXT for unknown types
  return 'TEXT';
}

/**
 * Error class for transformation failures
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any,
    public readonly row?: number
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}
