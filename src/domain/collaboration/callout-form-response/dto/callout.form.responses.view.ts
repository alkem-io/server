import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

export type CalloutFormResponsesScope = 'ALL' | 'OWN' | 'NONE';

/**
 * The viewer-scoped view of the responses of one Form. Reachable ONLY from the
 * lookup root; it is never a field type of Callout, CalloutFraming or
 * CalloutForm. `canReadAll`, `canModerate`, `mine` and `all` are exposed by
 * field resolvers from the scope resolved once per request.
 */
@ObjectType('CalloutFormResponses')
export class ICalloutFormResponses {
  @Field(() => UUID, { nullable: false })
  formID!: string;

  // Internal, resolved by the lookup field before the field resolvers run.
  scope!: CalloutFormResponsesScope;

  actorID!: string;

  first!: number;

  after?: string;

  canModerate!: boolean;
}
