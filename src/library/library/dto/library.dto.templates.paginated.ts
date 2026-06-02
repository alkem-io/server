import { Paginate } from '@core/pagination/paginated.type';
import { Type } from '@nestjs/common';
import { ObjectType } from '@nestjs/graphql';
import { ITemplateResult } from './library.dto.template.result';

// ITemplateResult is an abstract @ObjectType; it is a valid constructor at
// runtime, so cast it to the concrete Type the Paginate factory expects.
@ObjectType()
export class PaginatedLibraryTemplateResults extends Paginate(
  ITemplateResult as unknown as Type<ITemplateResult>,
  'templateResults'
) {}
