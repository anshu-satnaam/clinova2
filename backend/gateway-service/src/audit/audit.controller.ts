import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Get HIPAA compliant audit logs' })
  findAll(
    @Query('user_id') user_id?: string,
    @Query('action') action?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.findAll({ user_id, action, limit: +limit, offset: +offset });
  }
}
