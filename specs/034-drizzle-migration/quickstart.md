# Quickstart: TypeORM to Drizzle ORM Migration

**Feature**: 034-drizzle-migration
**Date**: 2026-02-13

## Prerequisites

- Node.js 22 LTS (Volta pins 22.21.1)
- pnpm 10.17.1 via Corepack
- Docker + Compose (for PostgreSQL and supporting services)
- Running PostgreSQL 17.5 with existing Alkemio schema (via `pnpm run start:services`)

## Step 1: Install Dependencies

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

## Step 2: Generate Baseline Schema from Existing Database

```bash
# Ensure database is running with current schema
pnpm run start:services

# Run TypeORM migrations to ensure schema is up to date
pnpm run migration:run

# Introspect existing database into Drizzle schema files
npx drizzle-kit pull
```

This generates raw schema files in `./drizzle/`. These files are a starting point — they must be refactored into co-located `*.schema.ts` files per domain module.

## Step 3: Refactor Schema Files

Move generated schema definitions to co-located module files:

```bash
# Example: Space schema
# From: drizzle/schema.ts (monolithic generated file)
# To:   src/domain/space/space/space.schema.ts
#       src/domain/space/space/space.relations.ts
```

Apply the shared column pattern:
- Replace raw column definitions with `...baseColumns`, `...authorizableColumns`, `...nameableColumns`, or `...contributorColumns` spreads
- Define relations separately in `*.relations.ts` files
- Export everything from `src/config/drizzle/schema.ts` barrel

## Step 4: Set Up Drizzle Module

Create the NestJS global module:

```typescript
// src/config/drizzle/drizzle.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE } from './drizzle.constants';
import * as schema from './schema';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [{
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: async (configService) => {
      const dbOptions = configService.get('storage.database', { infer: true });
      const client = postgres({
        host: dbOptions.host,
        port: dbOptions.port,
        user: dbOptions.username,
        password: dbOptions.password,
        database: dbOptions.database,
        max: dbOptions.pool?.max ?? 50,
      });
      return drizzle(client, { schema });
    },
  }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

Add `DrizzleModule` to `AppModule.imports` in `src/app.module.ts`.

## Step 5: Verify Schema Parity

```bash
# Generate a migration — it should be EMPTY if schema matches
npx drizzle-kit generate

# If the migration contains changes, the schema definitions don't match
# the database. Fix schema files and regenerate until empty.
```

## Step 6: Migrate Services (Per-Module)

For each domain module:

1. **Inject Drizzle** instead of TypeORM repository/EntityManager:
   ```typescript
   constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}
   ```

2. **Replace repository calls** with Drizzle query builder:
   ```typescript
   // Before (TypeORM)
   await this.spaceRepository.findOne({ where: { id } });

   // After (Drizzle)
   await this.db.query.spaces.findFirst({ where: eq(spaces.id, id) });
   ```

3. **Remove `TypeOrmModule.forFeature()`** from the module imports.

4. **Update tests** to use `mockDrizzleProvider` instead of `repositoryMockFactory`.

## Step 7: Run Tests

```bash
# Run full test suite
pnpm test:ci

# Run specific test
pnpm test -- path/to/spec.ts
```

## Step 8: Benchmark

```bash
# Record TypeORM baseline (on master branch)
git checkout master
pnpm test:ci 2>&1 | tee benchmark-typeorm.txt

# Record Drizzle results (on this branch)
git checkout 034-drizzle-migration
pnpm test:ci 2>&1 | tee benchmark-drizzle.txt

# Compare results
# (Use test runner timing output for per-file and aggregate comparison)
```

## Drizzle Kit Configuration

```typescript
// drizzle.config.ts (project root)
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/**.schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USERNAME ?? 'synapse',
    password: process.env.DATABASE_PASSWORD ?? 'synapse',
    database: process.env.DATABASE_NAME ?? 'alkemio',
  },
});
```

## Common Migration Patterns Reference

### API Selection Guide

| Original Pattern | Drizzle API | Rationale |
|---|---|---|
| `repository.find()` / `repository.findOne()` with `relations:` | Relational: `db.query.*.findMany()` / `db.query.*.findFirst()` with `with:` | Type-safe relation loading, closest 1:1 replacement |
| `entityManager.findOne()` with nested `relations:` | Relational: `db.query.*.findFirst()` with nested `with:` | Same as above |
| `createQueryBuilder()` with joins, aggregations, pagination | SQL-like: `db.select().from().where().orderBy()` | Full control over query shape |
| `repository.save()` / `repository.insert()` | SQL-like: `db.insert().values().returning()` | No relational API equivalent for writes |
| `repository.update()` | SQL-like: `db.update().set().where()` | No relational API equivalent for writes |
| `repository.delete()` | SQL-like: `db.delete().where()` | No relational API equivalent for writes |

### Repository `.find()` → Drizzle Relational Query

```typescript
// TypeORM
const spaces = await this.spaceRepository.find({
  where: { visibility: SpaceVisibility.ACTIVE },
  relations: { collaboration: true },
});

// Drizzle
const spaces = await this.db.query.spaces.findMany({
  where: eq(spacesTable.visibility, SpaceVisibility.ACTIVE),
  with: { collaboration: true },
});
```

### Repository `.save()` → Drizzle Insert/Update

```typescript
// TypeORM (insert or update based on PK presence)
await this.spaceRepository.save(spaceData);

// Drizzle (explicit insert)
const [space] = await this.db.insert(spacesTable).values(data).returning();

// Drizzle (explicit update)
await this.db.update(spacesTable).set(data).where(eq(spacesTable.id, id));
```

### EntityManager Relation Query → Drizzle With

```typescript
// TypeORM
const account = await this.entityManager.findOne(Account, {
  where: { id: accountID },
  relations: { spaces: { license: { entitlements: true } } },
});

// Drizzle
const account = await this.db.query.accounts.findFirst({
  where: eq(accountsTable.id, accountID),
  with: { spaces: { with: { license: { with: { entitlements: true } } } } },
});
```

### QueryBuilder → Drizzle SQL-like API

```typescript
// TypeORM
const users = await this.userRepository
  .createQueryBuilder('user')
  .where('user.email LIKE :email', { email: `%${search}%` })
  .orderBy('user.createdDate', 'DESC')
  .skip(offset)
  .take(limit)
  .getMany();

// Drizzle
const users = await this.db.select()
  .from(usersTable)
  .where(like(usersTable.email, `%${search}%`))
  .orderBy(desc(usersTable.createdDate))
  .offset(offset)
  .limit(limit);
```

### Transaction

```typescript
// TypeORM
await this.entityManager.transaction(async (em) => {
  await em.save(Space, spaceData);
  await em.save(Collaboration, collabData);
});

// Drizzle
await this.db.transaction(async (tx) => {
  await tx.insert(spacesTable).values(spaceData);
  await tx.insert(collaborationsTable).values(collabData);
});
```
