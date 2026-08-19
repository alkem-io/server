import { IActor, IActorFull } from '@domain/actor/actor/actor.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { NameID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAssistantCapabilityToggle } from './dto/assistant.capability.toggle.interface';

/**
 * GraphQL type for the singleton `virtual-assistant` platform actor. Mirrors
 * {@link IVirtualContributor} but WITHOUT knowledgeBase / aiPersona /
 * community-membership / store — it is a pure internal Actor with an
 * admin-managed per-capability grant (FR-019). See
 * contracts/assistant-authority.md §3.
 */
@ObjectType('VirtualAssistant', {
  implements: () => [IActorFull],
})
export class IVirtualAssistant extends IActor implements IActorFull {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  declare nameID: string;

  // Override to make profile required (mirrors contributors).
  declare profile: IProfile;

  // VirtualAssistant extends Actor - credentials are on Actor.credentials

  @Field(() => [IAssistantCapabilityToggle], {
    nullable: false,
    description:
      'The admin per-capability grant governing system-invoked authority for this Virtual Assistant (default read-only).',
  })
  capabilityGrant!: IAssistantCapabilityToggle[];
}
