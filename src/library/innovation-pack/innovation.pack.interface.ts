import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAccount } from '@domain/space/account/account.interface';

@ObjectType('InnovationPack')
export abstract class IInnovationPack extends INameable {
  templatesSet?: ITemplatesSet;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the InnovationPack in searches.',
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if this InnovationPack is listed in the platform store.',
  })
  listedInStore!: boolean;

  account?: IAccount;

  // Only used internally
  templatesCount!: number;
}
