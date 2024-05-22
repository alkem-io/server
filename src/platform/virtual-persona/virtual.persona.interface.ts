import { Field, ObjectType } from '@nestjs/graphql';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';
import { VirtualPersonaAccessMode } from '@common/enums/virtual.persona.access.mode';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('VirtualPersona')
export class IVirtualPersona extends IAuthorizable {
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
