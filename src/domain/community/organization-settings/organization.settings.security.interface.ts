import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationSettingsSecurity')
export abstract class IOrganizationSettingsSecurity {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Holders of an organization role (owner, admin, associate) must use a second factor.',
  })
  secondFactorRequired!: boolean;

  /**
   * ISO timestamp of the latest off→on transition. Stored and read by the
   * evaluator only: as a public field it would publish the deadline.
   */
  secondFactorRequiredSince!: string | null;
}
