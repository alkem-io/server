import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { UserPasswordChangeModule } from '@domain/community/user-password-change/user.password.change.module';
import { Module } from '@nestjs/common';
import { PasswordChangedConsumer } from './password-changed.consumer';

/**
 * Broker consumer module for Kratos-driven events (spec 005). Currently hosts
 * the `USER_PASSWORD_CHANGED` consumer, which adapts the broker event onto the
 * existing `UserPasswordChangeObserverService` and applies the idempotency
 * guard. The queue (`alkemio-kratos-events`) is bound via `connectMicroservice`
 * in `src/main.ts` — NOT via @golevelup (a competing consumer would steal
 * messages).
 *
 * `UserPasswordChangeModule` exports the observer + the audit service (used for
 * the idempotency check); `UserLookupModule` provides the identity → user
 * resolution the dedupe key needs.
 */
@Module({
  imports: [UserPasswordChangeModule, UserLookupModule],
  controllers: [PasswordChangedConsumer],
})
export class KratosEventsModule {}
