import { InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common';

@InputType()
export class CreateCalloutInput extends CreateNameableInput {}
