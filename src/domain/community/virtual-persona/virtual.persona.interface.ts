import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { INameable } from '@domain/common/entity/nameable-entity';
import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@ObjectType('VirtualPersona')
export class IVirtualPersona extends INameable {
  @Field(() => VirtualPersonaEngine, {
    nullable: true,
    description:
      'The Virtual Persona Engine being used by this virtual persona.',
  })
  engine!: VirtualPersonaEngine;

  @Field(() => JSON, {
    nullable: false,
    description: 'The prompt used by this Virtual Persona',
  })
  prompt!: string;

  storageAggregator?: IStorageAggregator;
}
