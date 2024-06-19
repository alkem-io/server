import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { InputType } from '@nestjs/graphql';

@InputType()
export class UpdateAiPersonaInput extends UpdateBaseAlkemioInput {}
