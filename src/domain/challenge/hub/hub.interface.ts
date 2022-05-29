import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';

@ObjectType('Hub')
export abstract class IHub extends IBaseChallenge {
  challenges?: IChallenge[];

  templatesSet?: ITemplatesSet;
}
