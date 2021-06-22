import { DeleteBaseCherrytwistInput } from '@domain/common/entity/base-entity/base.cherrytwist.dto.delete';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteChallengeInput extends DeleteBaseCherrytwistInput {}
