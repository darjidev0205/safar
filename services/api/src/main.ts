import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('SAFAR_API');

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, '0.0.0.0');

  logger.log('=======================================================');
  logger.log(`🚗 SAFAR Backend Service running on port ${port}`);
  logger.log(`📡 WebSocket Gateway ready on port ${port}`);
  logger.log(`🛡️ RBAC & Tenant Isolation Active`);
  logger.log('=======================================================');
}

bootstrap();