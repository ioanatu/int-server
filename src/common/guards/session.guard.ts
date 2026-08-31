import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY, SESSION_HEADER } from '../constants';

/**
 * Gates every request on a shared secret delivered in the `X-SESSION` header.
 *
 * The expected value comes from the `SESSION_TOKEN` environment variable (a Render
 * environment variable in a deployed environment) and is never checked into the repository.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const expectedToken = this.configService.get<string>('sessionToken');
    if (!expectedToken) {
      // Misconfiguration must never degrade into "everyone is allowed in".
      this.logger.error('SESSION_TOKEN is not configured; rejecting request.');
      throw new UnauthorizedException('Session authentication is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[SESSION_HEADER];
    const token = Array.isArray(provided) ? provided[0] : provided;

    if (!token) {
      throw new UnauthorizedException(`Missing ${SESSION_HEADER.toUpperCase()} header.`);
    }

    if (!SessionGuard.matches(token, expectedToken)) {
      throw new UnauthorizedException(`Invalid ${SESSION_HEADER.toUpperCase()} header.`);
    }

    return true;
  }

  /** Constant-time comparison so the guard does not leak the token through timing. */
  private static matches(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
