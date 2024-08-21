import { Column, Entity } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiPersonaInteractionMode } from '@common/enums/ai.persona.interaction.mode';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { MINI_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  // No direct link; this is a generic identifier
  @Column('varchar', { nullable: false, length: SMALL_TEXT_LENGTH })
  aiPersonaServiceID!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: MINI_TEXT_LENGTH, nullable: false })
  dataAccessMode!: AiPersonaDataAccessMode;

  @Column('simple-array', { nullable: false })
  interactionModes!: AiPersonaInteractionMode[];

  @Column('text', { nullable: true })
  bodyOfKnowledge?: string;
}
