import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { PrismaService } from '../../prisma.service';

@Global()
@Module({
  providers: [AIService, PrismaService],
  exports: [AIService],
})
export class AIServiceModule {}
