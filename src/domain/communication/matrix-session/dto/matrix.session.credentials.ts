import { Field, ObjectType } from '@nestjs/graphql';

/**
 * One minted Matrix chat session (workspace#091, FR-008). All three fields
 * are non-null: the triple is only useful whole, so the hop that carries it
 * is what enforces completeness — there is no server-side incomplete-triple
 * check (FR-026).
 */
@ObjectType('MatrixSessionCredentials', {
  description:
    "Credentials for one Matrix chat session belonging to the current user's own actor.",
})
export class MatrixSessionCredentials {
  @Field(() => String, {
    nullable: false,
    description: "The actor's Matrix user id (MXID), e.g. `@uuid:matrix.host`.",
  })
  userId!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The Matrix device id Synapse generated for this session. A fresh device per mint.',
  })
  deviceId!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'A LIVE Matrix access token for this session, returned once per mint. It is not stored by the platform and cannot be re-read.',
  })
  accessToken!: string;
}
