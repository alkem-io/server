import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { HubVisibility } from '@common/enums/hub.visibility';
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

  @Field(() => HubVisibility, {
    nullable: true,
    description:
      'If defined, what type of visibility to filter the Hubs on. You can have only one type of filter active at any given time.',
  })
  hubVisibilityFilter?: HubVisibility;

  // exposed through the field resolver
  hubListFilter?: string[];
}
