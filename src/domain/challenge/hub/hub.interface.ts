import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';

@ObjectType('Hub', {
  implements: () => [ISearchable],
})
export abstract class IHub extends IBaseChallenge {
  challenges?: IChallenge[];

  templatesSet?: ITemplatesSet;
}
