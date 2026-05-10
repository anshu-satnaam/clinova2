import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Clinical AI chat via LangGraph + Mistral' })
  chat(@Body() body: any, @Request() req) {
    return this.aiService.proxyToAiService('chat', { ...body, userId: req.user.sub });
  }

  @Post('summarize')
  @Roles('DOCTOR', 'ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Summarize clinical notes or audit reports' })
  summarize(@Body() body: any) {
    return this.aiService.proxyToAiService('summarize', body);
  }

  @Post('diagnose')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'AI differential diagnosis generation' })
  diagnose(@Body() body: any) {
    return this.aiService.proxyToAiService('diagnose', body);
  }

  @Post('embed')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Embed document into ChromaDB vector store' })
  embed(@Body() body: any) {
    return this.aiService.proxyToAiService('embed', body);
  }

  @Post('search')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Semantic search over patient embeddings' })
  search(@Body() body: any) {
    return this.aiService.proxyToAiService('search', body);
  }

  @Post('workflow')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Run a specific LangGraph workflow by name' })
  runWorkflow(@Body() body: any) {
    return this.aiService.proxyToAiService('workflow', body);
  }

  @Post('sessions/:sessionId/approve')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Doctor approves AI output (ISO 42001)' })
  approveSession(@Param('sessionId') sessionId: string, @Request() req) {
    return this.aiService.approveAiSession(sessionId, req.user.sub);
  }
}
