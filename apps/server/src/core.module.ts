import { Global, Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { RedisService } from './redis.service';
import { RoomsService } from './game/rooms.service';
import { MlService } from './ml/ml.service';

/**
 * Общие синглтоны игры. @Global, чтобы один и тот же инстанс
 * ContentService/RoomsService видели и игровой модуль, и админка.
 * Иначе админ-hot-reload контента не доходил бы до работающих комнат
 * (раньше AdminModule поднимал свой второй ContentService).
 */
@Global()
@Module({
  providers: [ContentService, RedisService, RoomsService, MlService],
  exports: [ContentService, RedisService, RoomsService, MlService],
})
export class CoreModule {}
