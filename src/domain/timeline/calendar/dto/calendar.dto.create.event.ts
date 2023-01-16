import { CreateCalendarEventInput } from '@domain/timeline/event/dto/event.dto.create';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateCalendarEventOnCalendarInput extends CreateCalendarEventInput {}
