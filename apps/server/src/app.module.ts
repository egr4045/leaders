import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { GameGateway } from './game.gateway';
import { MlController } from './ml/ml.controller';
import { CoreModule } from './core.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    CoreModule,
    AdminModule,
  ],
  controllers: [HealthController, MlController],
  providers: [GameGateway],
})
export class AppModule {}
