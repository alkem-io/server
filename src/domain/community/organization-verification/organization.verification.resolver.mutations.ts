import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorContext } from '@core/actor-context';
import { OrganizationVerificationEventInput } from './dto/organization.verification.dto.event';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationService } from './organization.verification.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LifecycleEventInput } from '@domain/common/lifecycle/dto/lifecycle.dto.event';
import { OrganizationVerificationLifecycleService } from './organization.verification.service.lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IOrganizationVerification)
export class OrganizationVerificationResolverMutations {
  constructor(
    private organizationVerificationService: OrganizationVerificationService,
    private organizationVerificationLifecycleService: OrganizationVerificationLifecycleService,
    private authorizationService: AuthorizationService,
    private lifecycleService: LifecycleService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IOrganizationVerification, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnOrganizationVerification(
    @Args('eventData')
    organizationVerificationEventData: OrganizationVerificationEventInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IOrganizationVerification> {
    let organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerificationEventData.organizationVerificationID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      organizationVerification.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on organization verification: ${organizationVerification.id}`
    );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${organizationVerificationEventData.eventName} triggered on organization: ${organizationVerification.id} using lifecycle ${organizationVerification.lifecycle.id}`,
      LogContext.COMMUNITY
    );

    const event: LifecycleEventInput = {
      lifecycle: organizationVerification.lifecycle,
      machine:
        this.organizationVerificationLifecycleService.getOrganizationVerificationMachine(),
      eventName: organizationVerificationEventData.eventName,
      actorContext,
      authorization: organizationVerification.authorization,
    };

    await this.lifecycleService.event(event);

    organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerification.id
      );

    // Ensure the cached state is synced with the lifecycle state
    organizationVerification.status =
      this.organizationVerificationLifecycleService.getOrganizationVerificationState(
        organizationVerification.lifecycle
      );

    return await this.organizationVerificationService.save(
      organizationVerification
    );
  }
}
