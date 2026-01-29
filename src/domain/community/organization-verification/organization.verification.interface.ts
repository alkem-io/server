import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationVerification')
export abstract class IOrganizationVerification extends IAuthorizable {
  organizationID!: string;

  @Field(() => OrganizationVerificationEnum, {
    description: 'Organization verification type',
  })
  status!: OrganizationVerificationEnum;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;
}
