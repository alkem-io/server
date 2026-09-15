import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { SigningAttemptStatus } from './signing.attempt.status';

@ObjectType('MemoSignature')
export abstract class IMemoSignature extends IBaseAlkemio {
  @Field(() => SigningAttemptStatus, {
    description: 'The terminal outcome of this Memo signing attempt.',
  })
  status!: SigningAttemptStatus;
}
