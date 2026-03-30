import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'dev-secret-change-me') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is not set or is using the default value. ' +
        'Set a strong, unique secret (minimum 32 characters) before starting in production.',
      );
    }
    Logger.warn(
      'JWT_SECRET is not set or using default — acceptable for dev only. Set a strong secret for production.',
      'JwtStrategy',
    );
    return secret || 'dev-secret-change-me';
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    return payload;
  }
}
