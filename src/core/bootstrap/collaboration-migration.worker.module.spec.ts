import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { CollaborationMigrationWorkerModule } from './collaboration-migration.worker.module';

/**
 * Bounded regression (no DB / RMQ / Redis / HTTP boot): reflect the one-shot
 * worker module's `@Module` imports and pin the isolated-worker guard dependency.
 *
 * The full `NestFactory.createApplicationContext` bootstrap opens the TypeORM pool,
 * so it is NOT run here; instead we assert the STRUCTURAL invariant that caused the
 * real-stack bootstrap failure so it cannot silently regress: `StorageBucketModule`
 * (imported for `StorageBucketService`'s legacy-media up-home) bundles GraphQL
 * resolvers whose fields carry `@UseGuards(GraphqlGuard)`, so Nest instantiates
 * `GraphqlGuard` even in this listener-less context — and `GraphqlGuard` injects
 * `ActorContextService`. Without importing `GraphqlGuardModule` (the `@Global` owner
 * that re-exports `AuthorizationModule` + `ActorContextModule`), the one-shot context
 * fails with: "Nest can't resolve dependencies of the GraphqlGuard (..., ? at index
 * [2]) ... ActorContextService ... in the StorageBucketModule context".
 */
describe('CollaborationMigrationWorkerModule', () => {
  const imports = (Reflect.getMetadata(
    'imports',
    CollaborationMigrationWorkerModule
  ) ?? []) as unknown[];

  it('imports StorageBucketModule (the up-home dependency that bundles @UseGuards(GraphqlGuard) resolvers)', () => {
    expect(imports).toContain(StorageBucketModule);
  });

  it('imports GraphqlGuardModule so GraphqlGuard + ActorContextService resolve in the listener-less worker (regression: the worker MUST bootstrap)', () => {
    expect(imports).toContain(GraphqlGuardModule);
  });
});
