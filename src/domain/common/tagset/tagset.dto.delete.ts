import { DeleteBaseCherrytwistInput } from '@domain/common/entity/base-entity';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteTagsetInput extends DeleteBaseCherrytwistInput {}
