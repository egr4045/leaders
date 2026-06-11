import { Controller, Get } from '@nestjs/common';
import { ENGINE_VERSION } from '@leaders/engine';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', engine: ENGINE_VERSION, ts: Date.now() };
  }
}
