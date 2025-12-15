import {
  transformBoolean,
  transformTimestamp,
  transformJson,
  transformNull,
  transformUuid,
  escapeCSV,
  transformRow,
  mapColumnType,
  TransformationError,
} from '@src/library/postgres-convergence/csvTransform';

describe('csvTransform', () => {
  describe('transformBoolean', () => {
    it('should transform MySQL boolean 1 to Postgres "t"', () => {
      expect(transformBoolean(1)).toBe('t');
      expect(transformBoolean('1')).toBe('t');
      expect(transformBoolean('true')).toBe('t');
    });

    it('should transform MySQL boolean 0 to Postgres "f"', () => {
      expect(transformBoolean(0)).toBe('f');
      expect(transformBoolean('0')).toBe('f');
      expect(transformBoolean('false')).toBe('f');
    });

    it('should handle NULL values', () => {
      expect(transformBoolean(null)).toBeNull();
      expect(transformBoolean(undefined)).toBeNull();
      expect(transformBoolean('\\N')).toBeNull();
    });

    it('should throw error for invalid boolean values', () => {
      expect(() => transformBoolean('invalid')).toThrow(
        'Invalid boolean value'
      );
      expect(() => transformBoolean(2)).toThrow('Invalid boolean value');
    });
  });

  describe('transformTimestamp', () => {
    it('should transform Date object to ISO 8601 string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = transformTimestamp(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should transform string date to ISO 8601 string', () => {
      const result = transformTimestamp('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle NULL values', () => {
      expect(transformTimestamp(null)).toBeNull();
      expect(transformTimestamp(undefined)).toBeNull();
      expect(transformTimestamp('\\N')).toBeNull();
    });

    it('should throw error for invalid date strings', () => {
      expect(() => transformTimestamp('not-a-date')).toThrow(
        'Failed to transform timestamp'
      );
    });
  });

  describe('transformJson', () => {
    it('should transform object to escaped JSON string', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      const result = transformJson(obj);
      expect(result).toBe('{""key"":""value"",""nested"":{""data"":123}}');
    });

    it('should transform JSON string to escaped format', () => {
      const jsonStr = '{"key":"value"}';
      const result = transformJson(jsonStr);
      expect(result).toBe('{""key"":""value""}');
    });

    it('should handle NULL values', () => {
      expect(transformJson(null)).toBeNull();
      expect(transformJson(undefined)).toBeNull();
      expect(transformJson('\\N')).toBeNull();
    });

    it('should throw error for invalid JSON', () => {
      expect(() => transformJson('not-json')).toThrow('Invalid JSON value');
    });
  });

  describe('transformNull', () => {
    it('should transform null to Postgres NULL representation', () => {
      expect(transformNull(null)).toBe('\\N');
      expect(transformNull(undefined)).toBe('\\N');
    });

    it('should return string representation for non-null values', () => {
      expect(transformNull('value')).toBe('value');
      expect(transformNull(123)).toBe('123');
      expect(transformNull(true)).toBe('true');
    });
  });

  describe('transformUuid', () => {
    it('should validate and normalize valid UUID', () => {
      const uuid = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
      const result = transformUuid(uuid);
      expect(result).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should accept lowercase UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result = transformUuid(uuid);
      expect(result).toBe(uuid);
    });

    it('should handle NULL values', () => {
      expect(transformUuid(null)).toBeNull();
      expect(transformUuid(undefined)).toBeNull();
      expect(transformUuid('\\N')).toBeNull();
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => transformUuid('not-a-uuid')).toThrow('Invalid UUID format');
      expect(() => transformUuid('12345678-1234-1234-1234-123456789')).toThrow(
        'Invalid UUID format'
      );
    });
  });

  describe('escapeCSV', () => {
    it('should escape values with commas', () => {
      const result = escapeCSV('value,with,commas');
      expect(result).toBe('"value,with,commas"');
    });

    it('should escape values with quotes', () => {
      const result = escapeCSV('value "with" quotes');
      expect(result).toBe('"value ""with"" quotes"');
    });

    it('should escape values with newlines', () => {
      const result = escapeCSV('value\nwith\nnewlines');
      expect(result).toBe('"value\nwith\nnewlines"');
    });

    it('should not escape simple values', () => {
      const result = escapeCSV('simple-value');
      expect(result).toBe('simple-value');
    });

    it('should handle NULL values', () => {
      expect(escapeCSV(null)).toBe('\\N');
      expect(escapeCSV(undefined)).toBe('\\N');
      expect(escapeCSV('\\N')).toBe('\\N');
    });
  });

  describe('transformRow', () => {
    it('should transform complete row with various types', () => {
      const row = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test User',
        verified: 1,
        createdAt: '2024-01-15T10:30:00Z',
        settings: '{"theme":"dark"}',
      };

      const schema = [
        { name: 'id', type: 'uuid' },
        { name: 'name', type: 'varchar' },
        { name: 'verified', type: 'boolean' },
        { name: 'createdAt', type: 'timestamp' },
        { name: 'settings', type: 'json' },
      ];

      const result = transformRow(row, schema);
      const parts = result.split(',');

      expect(parts[0]).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // UUID
      expect(parts[1]).toBe('Test User'); // String
      expect(parts[2]).toBe('t'); // Boolean
      expect(parts[3]).toBe('2024-01-15T10:30:00.000Z'); // Timestamp
      expect(parts[4]).toBe('{""theme"":""dark""}'); // JSON
    });

    it('should handle NULL values in row', () => {
      const row = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: null,
        verified: null,
      };

      const schema = [
        { name: 'id', type: 'uuid' },
        { name: 'name', type: 'varchar' },
        { name: 'verified', type: 'boolean' },
      ];

      const result = transformRow(row, schema);
      expect(result).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890,\\N,\\N');
    });
  });

  describe('mapColumnType', () => {
    it('should map MySQL boolean types to Postgres BOOLEAN', () => {
      expect(mapColumnType('tinyint(1)')).toBe('BOOLEAN');
      expect(mapColumnType('TINYINT(1)')).toBe('BOOLEAN');
      expect(mapColumnType('boolean')).toBe('BOOLEAN');
      expect(mapColumnType('bool')).toBe('BOOLEAN');
    });

    it('should map MySQL integer types to Postgres integer types', () => {
      expect(mapColumnType('int')).toBe('INTEGER');
      expect(mapColumnType('INT(11)')).toBe('INTEGER');
      expect(mapColumnType('bigint')).toBe('BIGINT');
      expect(mapColumnType('tinyint(2)')).toBe('SMALLINT'); // tinyint (non-boolean) maps to smallint
    });

    it('should map MySQL datetime to Postgres TIMESTAMPTZ', () => {
      expect(mapColumnType('datetime')).toBe('TIMESTAMPTZ');
      expect(mapColumnType('timestamp')).toBe('TIMESTAMPTZ');
    });

    it('should map MySQL varchar with preserved length', () => {
      expect(mapColumnType('varchar(255)')).toBe('VARCHAR(255)');
      expect(mapColumnType('varchar(100)')).toBe('VARCHAR(100)');
      expect(mapColumnType('VARCHAR(50)')).toBe('VARCHAR(50)');
    });

    it('should map MySQL text types to Postgres TEXT', () => {
      expect(mapColumnType('text')).toBe('TEXT');
      expect(mapColumnType('mediumtext')).toBe('TEXT');
      expect(mapColumnType('longtext')).toBe('TEXT');
    });

    it('should map MySQL JSON to Postgres JSONB', () => {
      expect(mapColumnType('json')).toBe('JSONB');
    });

    it('should map MySQL floating point types', () => {
      expect(mapColumnType('double')).toBe('DOUBLE PRECISION');
      expect(mapColumnType('float')).toBe('REAL');
      expect(mapColumnType('decimal(10,2)')).toBe('DECIMAL(10,2)');
    });

    it('should map MySQL blob to Postgres BYTEA', () => {
      expect(mapColumnType('blob')).toBe('BYTEA');
      expect(mapColumnType('mediumblob')).toBe('BYTEA');
      expect(mapColumnType('binary')).toBe('BYTEA');
    });

    it('should default to TEXT for unknown types', () => {
      expect(mapColumnType('unknown_type')).toBe('TEXT');
    });
  });

  describe('TransformationError', () => {
    it('should create error with field and value information', () => {
      const error = new TransformationError(
        'Invalid value',
        'username',
        'bad-value',
        123
      );

      expect(error.name).toBe('TransformationError');
      expect(error.message).toBe('Invalid value');
      expect(error.field).toBe('username');
      expect(error.value).toBe('bad-value');
      expect(error.row).toBe(123);
    });
  });
});
