import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@ObjectType('CalloutSettings')
export abstract class ICalloutSettings extends IAuthorizable {
  visibility!: CalloutVisibility;
}
