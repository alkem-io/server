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

  @Field(() => Int, {
    description:
      'Legacy Whiteboard contribution defaults without a complete owning Callout path.',
  })
  unattached!: number;

  /**
   * Rows requiring operator review. This can overlap with `migrated` when an
   * otherwise-usable Whiteboard was salvaged after irrecoverable visuals were removed.
   */
  @Field(() => Int)
  flagged!: number;

  @Field(() => Int)
  failed!: number;

  /** Source-decode failures and explicit migrated-with-visual-loss warnings. */
  @Field(() => [CollaborationMigrationIssue])
  flaggedDocuments!: CollaborationMigrationIssue[];

  @Field(() => [CollaborationMigrationIssue])
  failedDocuments!: CollaborationMigrationIssue[];

  static from(summary: MigrationSummary): CollaborationMigrationResult {
    return {
      total: summary.total,
      migrated: summary.migrated,
      unattached: summary.unattached,
      flagged: summary.flagged,
      failed: summary.failed,
      flaggedDocuments: summary.flaggedDocuments,
      failedDocuments: summary.failedDocuments,
    };
  }
}
