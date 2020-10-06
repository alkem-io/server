// user.decorator.ts
import { createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data, req) => req.user,
);