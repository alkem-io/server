import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationLifecycleService } from './organization.verification.service.lifecycle';

@InstrumentResolver()
@Resolver(() => IOrganizationVerification)
export class OrganizationVerificationLifecycleResolverFields
  implements ILifecycleFields<IOrganizationVerification>
{
  constructor(
    private lifecycleService: LifecycleService,
    private organizationVerificationLifecycleService: OrganizationVerificationLifecycleService
  ) {}

  @ResolveField('state', () => String, {
    nullable: false,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() organizationVerification: IOrganizationVerification): string {
    return this.organizationVerificationLifecycleService.getState(
      organizationVerification.lifecycle
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: false,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(
    @Parent() organizationVerification: IOrganizationVerification
  ): string[] {
    return this.organizationVerificationLifecycleService.getNextEvents(
      organizationVerification.lifecycle
    );
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(
    @Parent() organizationVerification: IOrganizationVerification
  ): boolean {
    return this.organizationVerificationLifecycleService.isFinalState(
      organizationVerification.lifecycle
    );
  }
}
