import { Paginate } from '@core/pagination/paginated.type';
import { ObjectType } from '@nestjs/graphql';
import { ICalloutFormResponse } from '../callout.form.response.interface';

@ObjectType('PaginatedCalloutFormResponses')
export class PaginatedCalloutFormResponses extends Paginate(
  ICalloutFormResponse,
  'responses'
) {}
