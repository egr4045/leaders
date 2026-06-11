import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { GameGateway } from './game.gateway';
import { ContentService } from './content.service';
import { RedisService } from './redis.service';
import { RoomsService } from './game/rooms.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [ContentService, RedisService, RoomsService, GameGateway],
})
export class AppModule {}
