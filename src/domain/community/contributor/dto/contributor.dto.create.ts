import { InputType } from '@nestjs/graphql';
import { CreateNameableOptionalInput } from '@domain/common/entity/nameable-entity/dto/nameable.optiona.dto.create';

@InputType()
export class CreateContributorInput extends CreateNameableOptionalInput {}
