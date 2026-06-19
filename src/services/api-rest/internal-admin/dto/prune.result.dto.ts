/**
 * Result of the in-app-notification prune operation.
 *
 * Shape parity with {@link PruneInAppNotificationAdminResult} (the GraphQL
 * payload returned by `adminInAppNotificationsPrune`). Exposed over the
 * internal REST transport — see spec 006-internal-admin-jobs-api (FR-009).
 */
export class PruneResultDto {
  removedCountOutsideRetentionPeriod!: number;
  removedCountExceedingUserLimit!: number;
}
