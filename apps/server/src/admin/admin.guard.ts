import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const secret = process.env.ADMIN_SECRET;
    if (!secret) throw new UnauthorizedException('ADMIN_SECRET не задан');
    const auth = req.headers['authorization'] ?? '';
    if (auth !== `Bearer ${secret}`) throw new UnauthorizedException('Неверный пароль');
    return true;
  }
}
