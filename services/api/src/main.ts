import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';

// Load root .env in local development if running standalone without CLI env injection
function loadLocalEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.substring(0, eqIdx).trim();
              let val = trimmed.substring(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.substring(1, val.length - 1);
              }
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
        break;
      } catch {
        // ignore
      }
    }
  }
}
loadLocalEnv();

async function bootstrap() {
  const logger = new Logger('SAFAR_API');

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: corsOrigin,
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
  logger.log('🛡️ RBAC & Tenant Isolation Active');
  logger.log('=======================================================');
}

bootstrap();