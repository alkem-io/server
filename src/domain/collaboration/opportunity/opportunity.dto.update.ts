import { InputType } from '@nestjs/graphql';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity/base.cherrytwist.dto.update';

@InputType()
export class UpdateOpportunityInput extends UpdateBaseCherrytwistInput {}
