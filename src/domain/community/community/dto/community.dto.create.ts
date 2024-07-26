import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';

export class CreateCommunityInput {
  guidelines!: CreateCommunityGuidelinesInput;

  name!: string;
  policy!: ICommunityPolicyDefinition;
  applicationForm!: CreateFormInput;
}
