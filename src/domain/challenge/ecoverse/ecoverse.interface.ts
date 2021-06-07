import { IChallenge } from '@domain/challenge/challenge';
import { IOrganisation } from '@domain/community/organisation';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';

@ObjectType('Ecoverse')
export abstract class IEcoverse extends IBaseChallenge {
  @Field(() => IOrganisation, {
    nullable: true,
    description: 'The organisation that hosts this Ecoverse instance',
  })
  host?: IOrganisation;

  challenges?: IChallenge[];
}
