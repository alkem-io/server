import { InputType } from '@nestjs/graphql';
import { LifecycleEventInput } from '@domain/common/lifecycle/dto/lifecycle.dto.event';

@InputType()
export class ProjectEventInput extends LifecycleEventInput {}
