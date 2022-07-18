import { UpdateNameableInput } from '@domain/common';
import { InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {}
