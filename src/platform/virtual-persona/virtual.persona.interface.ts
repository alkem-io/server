import { Field, ObjectType } from '@nestjs/graphql';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';
import { VirtualPersonaAccessMode } from '@common/enums/virtual.persona.access.mode';
import { INameable } from '@domain/common/entity/nameable-entity';

@ObjectType('VirtualPersona')
export class IVirtualPersona extends INameable {
  @Field(() => VirtualContributorEngine, {
    nullable: false,
    description:
      'The Virtual Persona Engine being used by this virtual persona.',
  })
  engine!: VirtualContributorEngine;

  @Field(() => String, {
    nullable: false,
    description: 'The prompt used by this Virtual Persona',
  })
  prompt!: string;

  @Field(() => VirtualPersonaAccessMode, {
    nullable: false,
    description: 'The required data access by the Virtual Persona',
  })
  dataAccessMode!: VirtualPersonaAccessMode;
}
