import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IOrganizationVerification } from './organization.verification.interface';
import { organizationVerificationLifecycleConfig } from './organization.verification.lifecycle.config';

@Resolver(() => IOrganizationVerification)
export class OrganizationVerificationLifecycleResolverFields {
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  async state(@Parent() organizationVerification: IOrganizationVerification) {
    return await this.lifecycleService.getState(
      organizationVerification.lifecycle,
      organizationVerificationLifecycleConfig
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() organizationVerification: IOrganizationVerification) {
    return this.lifecycleService.getNextEvents(
      organizationVerification.lifecycle,
      organizationVerificationLifecycleConfig
    );
  }

  @ResolveField('stateIsFinal', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  async isFinalized(
    @Parent() organizationVerification: IOrganizationVerification
  ) {
    return await this.lifecycleService.isFinalState(
      organizationVerification.lifecycle,
      organizationVerificationLifecycleConfig
    );
  }
}
