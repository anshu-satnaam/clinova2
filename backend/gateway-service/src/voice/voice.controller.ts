import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('voice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('rooms/create')
  @ApiOperation({ summary: 'Create a LiveKit room for telehealth' })
  createRoom(@Body() body: any, @Request() req) {
    return this.voiceService.proxy('rooms/create', body);
  }

  @Post('rooms/join')
  @ApiOperation({ summary: 'Join a LiveKit room' })
  joinRoom(@Body() body: any) {
    return this.voiceService.proxy('rooms/join', body);
  }

  @Delete('rooms/:roomName')
  @ApiOperation({ summary: 'End a LiveKit room session' })
  deleteRoom(@Param('roomName') roomName: string) {
    return this.voiceService.deleteRoom(roomName);
  }

  @Post('pipeline/process')
  @ApiOperation({ summary: 'Process voice transcript through full AI pipeline' })
  processPipeline(@Body() body: any) {
    return this.voiceService.proxy('pipeline/process', body);
  }
}
