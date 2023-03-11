import { InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateContributorInput extends CreateNameableInput {}
