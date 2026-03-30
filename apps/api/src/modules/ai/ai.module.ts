import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AIFeatureService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  controllers: [AIController],
  providers: [AIFeatureService, PrismaService],
  exports: [AIFeatureService],
})
export class AIModule {}
