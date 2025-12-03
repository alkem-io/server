import { ColumnType, Driver } from 'typeorm';

export type DriverWithUUIDFixed = Driver & {
  oldNormalizeType: Driver['normalizeType'];
};

/***
 * Adds a new function *oldNormalizeType* to the existing TypeORM Driver interface
 * which is the exact clone of *normalizeType* to preserve it's value.
 * *normalizeType* is overwritten to return the correct column type
 * for UUID generated columns based on the database driver.
 * For PostgreSQL:
 *   - 'uuid' type stays as 'uuid'
 *   - 'char' with length 36 becomes 'uuid' (UUID storage)
 * For MySQL:
 *   - 'uuid' becomes 'char' (with length 36)
 *   - 'char' stays as 'char'
 */
const fixUUIDColumnType = (driver: Driver): DriverWithUUIDFixed => {
  const driverWithUUIDFixed = driver as DriverWithUUIDFixed;
  const isPostgres = driver.options.type === 'postgres';

  driverWithUUIDFixed.oldNormalizeType = driver.normalizeType;
  driverWithUUIDFixed.normalizeType = (column: {
    type: ColumnType;
    length?: number | string;
    precision?: number | null;
    scale?: number;
  }): string => {
    // Handle explicit UUID type
    if (column.type === 'uuid') {
      return isPostgres ? 'uuid' : 'char';
    }

    // Handle char(36) columns used for UUID storage - convert to native uuid for PostgreSQL
    if (
      column.type === 'char' &&
      (column.length === 36 || column.length === '36')
    ) {
      if (isPostgres) {
        // Remove length for uuid type and return uuid
        delete column.length;
        return 'uuid';
      }
    }

    return driverWithUUIDFixed.oldNormalizeType(column);
  };

  return driverWithUUIDFixed;
};
export default fixUUIDColumnType;
