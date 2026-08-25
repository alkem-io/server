import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MigrationSummary } from './collaboration-migration.service';

@ObjectType('CollaborationMigrationIssue')
export class CollaborationMigrationIssue {
  @Field()
  id!: string;

  @Field()
  reason!: string;
}

@ObjectType('CollaborationMigrationResult')
export class CollaborationMigrationResult {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  migrated!: number;

  @Field(() => Int)
  flagged!: number;

  @Field(() => Int)
  failed!: number;

  @Field(() => [CollaborationMigrationIssue])
  flaggedDocuments!: CollaborationMigrationIssue[];

  @Field(() => [CollaborationMigrationIssue])
  failedDocuments!: CollaborationMigrationIssue[];

  static from(summary: MigrationSummary): CollaborationMigrationResult {
    return {
      total: summary.total,
      migrated: summary.migrated,
      flagged: summary.flagged,
      failed: summary.failed,
      flaggedDocuments: summary.flaggedDocuments,
      failedDocuments: summary.failedDocuments,
    };
  }
}
