import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { GameGateway } from './game.gateway';
import { ContentService } from './content.service';
import { RedisService } from './redis.service';
import { RoomsService } from './game/rooms.service';
import { MlService } from './ml/ml.service';
import { MlController } from './ml/ml.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] })],
  controllers: [HealthController, MlController],
  providers: [ContentService, RedisService, RoomsService, MlService, GameGateway],
})
export class AppModule {}
