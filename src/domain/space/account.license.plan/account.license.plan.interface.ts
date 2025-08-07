import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('AccountLicensePlan')
export abstract class IAccountLicensePlan {
  @Field(() => Number, {
    nullable: false,
    description: 'The number of Free Spaces allowed.',
  })
  spaceFree!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The number of Plus Spaces allowed.',
  })
  spacePlus!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The number of Premium Spaces allowed.',
  })
  spacePremium!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The number of Virtual Contributors allowed.',
  })
  virtualContributor!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The number of Innovation Packs allowed.',
  })
  innovationPacks!: number;

  @Field(() => Number, {
    nullable: false,
    description: 'The number of Starting Pages allowed.',
  })
  startingPages!: number;
}
