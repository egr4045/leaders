import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';
import { ContentService } from '../content.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminGuard, ContentService],
})
export class AdminModule {}
