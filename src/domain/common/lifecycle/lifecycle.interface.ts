import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';

@ObjectType('Lifecycle')
export abstract class ILifecycle extends IBaseCherrytwist {
  machineState?: string;

  @Field(() => JSON, {
    description:
      'The machine definition, describing the states, transitions etc for this Lifeycle.',
  })
  machineDef!: string;
}
