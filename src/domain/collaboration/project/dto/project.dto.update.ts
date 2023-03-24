import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { InputType } from '@nestjs/graphql';

@InputType()
export class UpdateProjectInput extends UpdateNameableInput {}
