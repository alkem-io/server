import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { InnovationSpaceType } from './innovation.space.type.enum';
import { IBranding } from './branding/branding.interface';
import { ISelectionCriteria } from './selection/criteria/selection.criteria.interface';

@ObjectType('InnovationHub')
export abstract class IInnovationHub extends INameable {
  @Field(() => ISelectionCriteria, {
    description: 'The criteria based on which the data is filtered',
  })
  selectionCriteria!: ISelectionCriteria;

  @Field(() => InnovationSpaceType, {
    description: 'Type of innovation space',
  })
  type!: InnovationSpaceType;

  @Field(() => IBranding, {
    description: 'The branding for this Innovation space',
    nullable: true,
  })
  branding?: IBranding;
}
