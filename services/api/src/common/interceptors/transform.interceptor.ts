import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@safar/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest();
    const requestId = req.headers['x-request-id'] || uuidv4();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        requestId,
      })),
    );
  }
}
