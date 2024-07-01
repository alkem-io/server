import { Column, Entity } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiPersonaInteractionMode } from '@common/enums/ai.persona.interaction.mode';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  // No direct link; this is a generic identifier
  @Column('varchar', { nullable: false, length: 128 })
  aiPersonaServiceID!: string;

  @Column('text', { nullable: true })
  description = '';

  @Column('varchar', {
    length: 255,
    default: AiPersonaDataAccessMode.SPACE_PROFILE_AND_CONTENTS,
  })
  dataAccessMode!: AiPersonaDataAccessMode;

  @Column('simple-array', {
    nullable: false,
    default: [AiPersonaInteractionMode.DISCUSSION_TAGGING],
  })
  interactionModes!: AiPersonaInteractionMode[];

  @Column('text', { nullable: true })
  bodyOfKnowledge = '';
}
