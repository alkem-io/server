import { SearchVisibility } from '@common/enums/search.visibility';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { Field, ObjectType } from '@nestjs/graphql';

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
