import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WarmCacheDto {
  @ApiProperty({
    description: 'Entity type to warm cache for',
    enum: ['RFX_EVENTS', 'AUCTIONS', 'CONTRACTS', 'MASTER_DATA'],
  })
  @IsString()
  @IsIn(['RFX_EVENTS', 'AUCTIONS', 'CONTRACTS', 'MASTER_DATA'])
  entityType: string;
}
