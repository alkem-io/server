import { ColumnType, Driver } from 'typeorm';

export type DriverWithUUIDFixed = Driver & {
  oldNormalizeType: Driver['normalizeType'];
};

/***
 * Adds a new function *oldNormalizeType* to the existing TypeORM Driver interface
 * which is the exact clone of *normalizeType* to preserve it's value.
 * *normalizeType* is overwritten to return *char* column type
 * for UUID generated columns instead of the *varchar* as in *typeorm@0.3.11*.
 */
const fixUUIDColumnType = (driver: Driver): DriverWithUUIDFixed => {
  const driverWithUUIDFixed = driver as DriverWithUUIDFixed;

  driverWithUUIDFixed.oldNormalizeType = driver.normalizeType;
  driverWithUUIDFixed.normalizeType = (column: {
    type: ColumnType;
    length?: number | string;
    precision?: number | null;
    scale?: number;
  }): string => {
    return column.type === 'uuid'
      ? 'char'
      : driverWithUUIDFixed.oldNormalizeType(column);
  };

  return driverWithUUIDFixed;
};
export default fixUUIDColumnType;
