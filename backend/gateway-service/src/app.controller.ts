import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): any {
    return {
      status: 'online',
      service: 'Clinova API Gateway',
      version: '1.0.0',
      docs: '/api/docs'
    };
  }
}
