import { Paginate } from '@core/pagination/paginated.type';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Type } from '@nestjs/common';
import { ObjectType } from '@nestjs/graphql';

// IInnovationPack is an abstract @ObjectType; it is a valid constructor at
// runtime, so cast it to the concrete Type the Paginate factory expects.
@ObjectType()
export class PaginatedInnovationPacks extends Paginate(
  IInnovationPack as unknown as Type<IInnovationPack>,
  'innovationPacks'
) {}
