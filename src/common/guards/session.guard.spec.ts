import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SessionGuard } from './session.guard';

const EXPECTED_TOKEN = 'super-secret-session-token';

const contextWithHeaders = (headers: Record<string, string | string[]>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('SessionGuard', () => {
  const buildGuard = (token: string | undefined, isPublic = false): SessionGuard => {
    const configService = { get: jest.fn().mockReturnValue(token) } as unknown as ConfigService;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    return new SessionGuard(configService, reflector);
  };

  it('allows a request carrying the expected token', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(guard.canActivate(contextWithHeaders({ 'x-session': EXPECTED_TOKEN }))).toBe(true);
  });

  it('rejects a request without the header', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow('Missing X-SESSION header.');
  });

  it('rejects a wrong token', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(() => guard.canActivate(contextWithHeaders({ 'x-session': 'nope' }))).toThrow(
      'Invalid X-SESSION header.',
    );
  });

  it('rejects a token that only shares a prefix with the expected one', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-session': EXPECTED_TOKEN.slice(0, -1) })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an empty header value', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(() => guard.canActivate(contextWithHeaders({ 'x-session': '' }))).toThrow(
      'Missing X-SESSION header.',
    );
  });

  it('uses the first value when the header is repeated', () => {
    const guard = buildGuard(EXPECTED_TOKEN);

    expect(guard.canActivate(contextWithHeaders({ 'x-session': [EXPECTED_TOKEN, 'other'] }))).toBe(
      true,
    );
  });

  it('fails closed when the server has no token configured', () => {
    const guard = buildGuard(undefined);

    expect(() => guard.canActivate(contextWithHeaders({ 'x-session': 'anything' }))).toThrow(
      'Session authentication is not configured.',
    );
  });

  it('lets @Public() routes through without a header', () => {
    const guard = buildGuard(EXPECTED_TOKEN, true);

    expect(guard.canActivate(contextWithHeaders({}))).toBe(true);
  });
});
