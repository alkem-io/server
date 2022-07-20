import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {}
