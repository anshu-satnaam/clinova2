import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip } = request;

    return next.handle().pipe(
      tap(async () => {
        if (user) {
          const action = this.mapMethodToAction(method, url);
          if (action) {
            await this.prisma.auditLog.create({
              data: {
                userId: user.sub,
                action: action as AuditAction,
                resource: url.split('/')[1] || 'UNKNOWN',
                ipAddress: ip,
                userAgent: request.headers['user-agent'],
                metadata: { method, url },
              },
            }).catch(e => console.error('Audit logging failed', e));
          }
        }
      }),
    );
  }

  private mapMethodToAction(method: string, url: string): string | null {
    if (url.includes('auth/login')) return 'LOGIN';
    if (url.includes('ai/chat')) return 'AI_QUERY';
    if (url.includes('voice')) return 'VOICE_SESSION';
    
    switch (method) {
      case 'GET': return 'READ';
      case 'POST': return 'CREATE';
      case 'PUT':
      case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return null;
    }
  }
}
