import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
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
}
