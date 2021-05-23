import { InputType } from '@nestjs/graphql';
import { LifecycleEventInput } from '@domain/common/lifecycle';

@InputType()
export class ProjectEventInput extends LifecycleEventInput {}
