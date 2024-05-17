import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@ObjectType('VirtualPersona')
export class IVirtualPersona extends INameable {
  @Field(() => VirtualContributorEngine, {
    nullable: true,
    description:
      'The Virtual Persona Engine being used by this virtual persona.',
  })
  engine!: VirtualContributorEngine;

  @Field(() => String, {
    nullable: false,
    description: 'The prompt used by this Virtual Persona',
  })
  prompt!: string;

  storageAggregator?: IStorageAggregator;
}
