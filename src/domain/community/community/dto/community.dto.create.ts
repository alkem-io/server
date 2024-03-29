import { SpaceType } from '@common/enums/space.type';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';

export class CreateCommunityInput {
  guidelines!: CreateCommunityGuidelinesInput;

  name!: string;
  spaceID!: string;
  type!: SpaceType;
  policy!: ICommunityPolicyDefinition;
  applicationForm!: CreateFormInput;
}
