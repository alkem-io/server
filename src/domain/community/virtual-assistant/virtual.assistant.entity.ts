import { ActorType } from '@common/enums/actor.type';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ChildEntity, Column } from 'typeorm';
import { IAssistantCapabilityToggle } from './dto/assistant.capability.toggle.interface';
import { IVirtualAssistant } from './virtual.assistant.interface';

/**
 * The singleton `virtual-assistant` platform actor — the identity the web AI
 * assistant is attributed to (FR-016). A CTI child of {@link Actor}, mirroring
 * {@link VirtualContributor} but WITHOUT knowledgeBase / aiPersona /
 * community-membership / store: it is a pure internal Actor (no Kratos identity)
 * carrying its own nameID / profile / authorization / credentials (all on the
 * base actor table), plus an admin-managed per-capability grant governing
 * system-invoked authority (FR-019).
 */
@ChildEntity({
  discriminatorValue: ActorType.VIRTUAL_ASSISTANT,
  tableName: 'virtual_assistant',
})
export class VirtualAssistant extends Actor implements IVirtualAssistant {
  // Inherited from Actor (on actor table):
  //   id, type, nameID, profile, authorization, credentials, createdDate, updatedDate, version

  /**
   * Admin per-capability grant governing SYSTEM-INVOKED authority (Flow B).
   * Default = read-only. User-initiated work uses the user's own grant
   * (UserSettings.assistant), NOT this. See contracts/assistant-authority.md §3.
   */
  @Column('jsonb', { nullable: false, default: [] })
  capabilityGrant!: IAssistantCapabilityToggle[];
}
