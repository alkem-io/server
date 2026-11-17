import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('MeSecondFactorRequirement')
export class MeSecondFactorRequirement {
  @Field(() => Boolean, {
    nullable: false,
    description:
      "False for any caller whose credential is not a person's sign-in (API key, delegation token, non-interactive token, service account), whatever its roles. A cookie session and a Hydra bearer read their real coverage.",
  })
  covered!: boolean;

  @Field(() => Date, {
    nullable: true,
    description:
      'When a covering rule starts refusing a sign-in without a second factor; the earliest of the rules that cover the user.',
  })
  deadline!: Date | null;

  @Field(() => Boolean, {
    nullable: false,
    description: "Whether this session's sign-in completed a second factor.",
  })
  satisfied!: boolean;
}
