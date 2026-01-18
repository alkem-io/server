import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IAccount } from '@domain/space/account/account.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { InnovationHubType } from './innovation.hub.type.enum';

@ObjectType('InnovationHub')
export abstract class IInnovationHub extends INameable {
  @Field(() => String, {
    description: 'The subdomain associated with this Innovation Hub.',
  })
  subdomain!: string;

  @Field(() => InnovationHubType, {
    description: 'Type of Innovation Hub',
  })
  type!: InnovationHubType;

  @Field(() => SpaceVisibility, {
    nullable: true,
    description:
      'If defined, what type of visibility to filter the Spaces on. You can have only one type of filter active at any given time.',
  })
  spaceVisibilityFilter?: SpaceVisibility;

  // exposed through the field resolver
  spaceListFilter?: string[];

  account!: IAccount;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the InnovationHub in searches.',
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if this InnovationHub is listed in the platform store.',
  })
  listedInStore!: boolean;
}
