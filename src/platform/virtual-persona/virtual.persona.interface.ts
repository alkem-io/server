import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';
import { VirtualPersonaAccessMode } from '@common/enums/virtual.persona.access.mode';

@ObjectType('VirtualPersona')
export class IVirtualPersona extends INameable {
  @Field(() => VirtualContributorEngine, {
    nullable: false,
    description:
      'The Virtual Persona Engine being used by this virtual persona.',
  })
  engine!: VirtualContributorEngine;

  @Field(() => VirtualPersonaAccessMode, {
    nullable: false,
    description: 'The required data access by the Virtual Persona',
  })
  dataAccessMode!: VirtualPersonaAccessMode;
}
