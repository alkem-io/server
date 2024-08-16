import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateContributorInput extends CreateNameableInput {}
