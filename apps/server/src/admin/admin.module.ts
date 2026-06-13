import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';

// ContentService и RoomsService приходят из @Global CoreModule (единый инстанс).
@Module({
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
