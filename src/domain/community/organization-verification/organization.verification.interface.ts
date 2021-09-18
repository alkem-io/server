import { Field, ObjectType } from '@nestjs/graphql';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('OrganizationVerification')
export abstract class IOrganizationVerification extends IAuthorizable {
  organizationID!: string;

  @Field(() => OrganizationVerificationEnum, {
    description: 'Organization verification type',
  })
  status!: string;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle?: ILifecycle;
}
