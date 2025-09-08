import { ObjectType } from '@nestjs/graphql';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Paginate } from './paginated.type';

@ObjectType()
export class PaginatedContributions extends Paginate(
  CalloutContribution,
  'contribution'
) {}
