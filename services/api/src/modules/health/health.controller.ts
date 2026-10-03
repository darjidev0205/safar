import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get(['', 'health', 'api/v1/health'])
  getHealth() {
    return {
      status: 'ok',
      service: 'SAFAR_API',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
