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
      'When a covering rule starts refusing a sign-in that does not meet it; the earliest of the rules that cover the user.',
  })
  deadline!: Date | null;

  @Field(() => Boolean, {
    nullable: false,
    description:
      "Whether this session's sign-in meets a second-factor rule: it completed a second factor, and the account held at least two ways to pass the second step when they were counted at sign-in. A sign-in whose ways were not counted (a bearer token, or a session from before they were recorded) needs only the second factor.",
  })
  satisfied!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True when a covering rule applies and this session signed in with a second factor, but the count of ways to pass the second step recorded at sign-in is below two. An authenticator app, each security key used as a second step, and recovery codes count one each; a passkey, including a security key registered for passwordless sign-in, does not count. A sign-in whose ways were not counted (a bearer token, or a session from before they were recorded) returns false. Signing in again after adding a way updates it.',
  })
  secondWayNeeded!: boolean;
}
