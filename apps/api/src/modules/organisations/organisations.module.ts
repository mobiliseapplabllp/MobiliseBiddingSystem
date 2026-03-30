import { Module } from '@nestjs/common';
import { OrganisationsController } from './organisations.controller';
import { OrganisationsService } from './organisations.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [OrganisationsController],
  providers: [OrganisationsService, PrismaService],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
