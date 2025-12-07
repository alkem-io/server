import { Field, ID, ObjectType } from '@nestjs/graphql';
import { createHash } from 'node:crypto';

/**
 * Generate a deterministic UUID-like ID from threadID and virtualContributorActorID.
 * Uses SHA-256 hash formatted as UUID v4 structure for consistency.
 * @deprecated This function is for backward compatibility only. The id field will be removed in a future version.
 */
export function generateVcInteractionId(
  threadID: string,
  virtualContributorActorID: string
): string {
  const hash = createHash('sha256')
    .update(`${threadID}:${virtualContributorActorID}`)
    .digest('hex');
  // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

@ObjectType('VcInteraction')
export abstract class IVcInteraction {
  @Field(() => ID, {
    description: 'The ID of the VC Interaction',
    deprecationReason:
      'This field is for backward compatibility only and will be removed in a future version.',
  })
  id!: string;

  @Field(() => String, {
    description: 'The thread ID (Matrix message ID) where VC is engaged',
  })
  threadID!: string;

  @Field(() => String, {
    description: 'The actor ID (agent.id) of the Virtual Contributor',
  })
  virtualContributorID!: string;
}
