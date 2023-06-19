import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { HubVisibility } from '@common/enums/hub.visibility';
import { InnovationHxbType } from './innovation.hub.type.enum';

@ObjectType('InnovationHxb')
export abstract class IInnovationHxb extends INameable {
  @Field(() => String, {
    description: 'The subdomain associated with this Innovation Hxb.',
  })
  subdomain!: string;

  @Field(() => InnovationHxbType, {
    description: 'Type of Innovation Hxb',
  })
  type!: InnovationHxbType;

  @Field(() => HubVisibility, {
    nullable: true,
    description:
      'If defined, what type of visibility to filter the Hubs on. You can have only one type of filter active at any given time.',
  })
  hubVisibilityFilter?: HubVisibility;

  // exposed through the field resolver
  hubListFilter?: string[];
}
