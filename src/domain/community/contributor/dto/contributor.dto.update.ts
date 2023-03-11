import { InputType } from '@nestjs/graphql';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';

@InputType()
export class UpdateContributorInput extends UpdateNameableInput {}
