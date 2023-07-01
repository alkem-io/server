import { Field, ObjectType } from '@nestjs/graphql';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';

@ObjectType('InnovationFlow')
export abstract class IInnovationFlow extends IAuthorizable {
  lifecycle!: ILifecycle;

  profile!: IProfile;

  // Needed to be able to validate that the provided innovation flow template is from the containing space
  spaceID!: string;

  tagsetTemplateSet?: ITagsetTemplateSet;

  @Field(() => InnovationFlowType, {
    description: 'The InnovationFlow type, e.g. Challenge, Opportunity',
  })
  type!: InnovationFlowType;
}
