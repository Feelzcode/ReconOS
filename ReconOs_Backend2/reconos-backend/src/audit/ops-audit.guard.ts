import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Gates /audit-logs/operations for ReconOS support.
 * If RECONOS_OPS_AUDIT_KEY is unset, any authenticated org user can access (hackathon dev).
 * In production, set the key and send x-reconos-ops-key from the ops console.
 */
@Injectable()
export class OpsAuditGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.config.get<string>('RECONOS_OPS_AUDIT_KEY', '').trim();
    if (!key) return true;

    const req = context.switchToHttp().getRequest();
    const header = String(req.headers['x-reconos-ops-key'] ?? '').trim();
    if (header !== key) {
      throw new UnauthorizedException('ReconOS operations access required');
    }
    return true;
  }
}
