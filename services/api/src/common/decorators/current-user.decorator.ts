import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProfile } from '@safar/types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserProfile => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
