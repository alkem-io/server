import { ObjectType } from '@nestjs/graphql';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { Paginate } from './paginated.type';

@ObjectType()
export class PaginatedContributions extends Paginate(
  ICalloutContribution,
  'contributions'
) {}
