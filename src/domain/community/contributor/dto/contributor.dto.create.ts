import { CreateNameableOptionalInput } from '@domain/common/entity/nameable-entity/dto/nameable.optional.dto.create';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateContributorInput extends CreateNameableOptionalInput {}
