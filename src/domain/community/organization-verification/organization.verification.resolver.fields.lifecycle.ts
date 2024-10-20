import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationLifecycleOptionsProvider } from './organization.verification.lifecycle.options.provider';
import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';

@Resolver(() => IOrganizationVerification)
export class OrganizationVerificationLifecycleResolverFields
  implements ILifecycleFields
{
  constructor(
    private lifecycleService: LifecycleService,
    private organizationVerificationLifecycleOptionsProvider: OrganizationVerificationLifecycleOptionsProvider
  ) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() organizationVerification: IOrganizationVerification): string {
    return this.lifecycleService.getState(
      organizationVerification.lifecycle,
      this.organizationVerificationLifecycleOptionsProvider.getMachine()
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(
    @Parent() organizationVerification: IOrganizationVerification
  ): string[] {
    return this.lifecycleService.getNextEvents(
      organizationVerification.lifecycle,
      this.organizationVerificationLifecycleOptionsProvider.getMachine()
    );
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(
    @Parent() organizationVerification: IOrganizationVerification
  ): boolean {
    return this.lifecycleService.isFinalState(
      organizationVerification.lifecycle,
      this.organizationVerificationLifecycleOptionsProvider.getMachine()
    );
  }
}
