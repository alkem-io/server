import { sql } from 'drizzle-orm';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';

/**
 * Adds image/heic and image/heif MIME types to storage buckets.
 *
 * Note: This migration was originally a TypeORM migration from develop.
 * It has been converted to a standalone function that can be invoked
 * with a Drizzle DB instance. For the Drizzle migration system,
 * the equivalent SQL should be placed in a .sql file under drizzle/.
 */
export async function addHeicHeifMimeTypes(db: DrizzleDb): Promise<void> {
  // Add image/heic and image/heif to all storage buckets that contain image MIME types
  // but don't already have them. Guard against both to prevent duplicates.
  await db.execute(sql`
    UPDATE storage_bucket
    SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heic,image/heif'
    WHERE "allowedMimeTypes" LIKE '%image/%'
      AND "allowedMimeTypes" NOT LIKE '%image/heic%'
      AND "allowedMimeTypes" NOT LIKE '%image/heif%'
  `);

  // Handle edge case: rows that already have image/heif but not image/heic
  await db.execute(sql`
    UPDATE storage_bucket
    SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heic'
    WHERE "allowedMimeTypes" LIKE '%image/%'
      AND "allowedMimeTypes" NOT LIKE '%image/heic%'
      AND "allowedMimeTypes" LIKE '%image/heif%'
  `);

  // Handle edge case: rows that already have image/heic but not image/heif
  await db.execute(sql`
    UPDATE storage_bucket
    SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heif'
    WHERE "allowedMimeTypes" LIKE '%image/%'
      AND "allowedMimeTypes" LIKE '%image/heic%'
      AND "allowedMimeTypes" NOT LIKE '%image/heif%'
  `);
}

export async function removeHeicHeifMimeTypes(db: DrizzleDb): Promise<void> {
  // Remove image/heic and image/heif from all storage buckets
  await db.execute(sql`
    UPDATE storage_bucket
    SET "allowedMimeTypes" = REPLACE(REPLACE("allowedMimeTypes", ',image/heif', ''), ',image/heic', '')
    WHERE "allowedMimeTypes" LIKE '%image/heic%'
      OR "allowedMimeTypes" LIKE '%image/heif%'
  `);
}
