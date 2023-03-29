import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IOrganization } from '@src/domain';
import { ISelectionCriteria } from './selection.criteria.interface';
import { InnovationSpaceType } from './innovation.space.type.enum';
import { IBranding } from './branding.interface';

@ObjectType('InnovationSpace')
export class IInnovationSpace extends INameable {
  @Field(() => ISelectionCriteria, {
    description: 'The criteria based on which the data is filtered',
  })
  selectionCriteria!: ISelectionCriteria;

  @Field(() => InnovationSpaceType, {
    description: 'Type of innovation space',
  })
  type!: InnovationSpaceType;

  @Field(() => String, {
    description: 'A brief description about this Innovation space',
    nullable: true,
  })
  description?: string;

  @Field(() => IBranding, {
    description: 'The branding for this Innovation space',
  })
  branding!: IBranding;

  @Field(() => IOrganization, {
    description:
      'An Organization, if any, associated with this Innovation space',
    nullable: true,
  })
  organization?: IOrganization;
}
