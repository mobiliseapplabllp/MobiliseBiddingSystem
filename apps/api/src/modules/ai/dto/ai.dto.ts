import { IsString, IsOptional, IsNumber, IsPositive, IsArray, IsIn, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateRfxDescriptionDto {
  @ApiProperty({ example: 'Office Furniture Procurement' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'RFQ' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ example: 'Office Supplies' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 'Need standing desks and ergonomic chairs for 200 employees' })
  @IsOptional()
  @IsString()
  requirements?: string;
}

export class SuggestEvalCriteriaDto {
  @ApiProperty({ example: 'RFP' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ example: 'IT Services' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class GenerateLineItemsDto {
  @ApiProperty({ example: 'I need office furniture for 200 people including desks, chairs, and storage' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class AnalyzeBidDto {
  @ApiProperty({ description: 'Bid submission content/summary' })
  @IsString()
  bidData: string;

  @ApiProperty({ description: 'RFx requirements the bid should meet' })
  @IsString()
  requirements: string;

  @ApiPropertyOptional({ description: 'Evaluation criteria names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];
}

export class SupplierRiskDto {
  @ApiProperty()
  @IsString()
  supplierId: string;
}

export class AnalyzeContractDto {
  @ApiProperty({ description: 'Contract terms as text or JSON' })
  @IsString()
  contractTerms: string;

  @ApiProperty({ example: 'FIXED_PRICE' })
  @IsString()
  contractType: string;
}

export class AwardRecommendationDto {
  @ApiProperty()
  @IsString()
  evaluationId: string;
}

export class CopilotChatDto {
  @ApiProperty({ example: 'What auction type should I use for commodity purchasing?' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  context?: {
    page?: string;
    entityId?: string;
    entityType?: string;
  };
}

// ── Phase 2 DTOs ─────────────────────────────────────────────────────────────

export class CheckBidComplianceDto {
  @ApiProperty({ description: 'ID of the bid submission to check' })
  @IsString()
  bidId: string;

  @ApiProperty({ description: 'ID of the RFx event the bid was submitted to' })
  @IsString()
  rfxEventId: string;
}

export class PredictAuctionPriceDto {
  @ApiProperty({ example: 'Office Supplies', description: 'Procurement category' })
  @IsString()
  @MinLength(2)
  category: string;

  @ApiPropertyOptional({ example: 500000, description: 'Estimated total value' })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 5, description: 'Number of invited suppliers' })
  @IsOptional()
  @IsNumber()
  supplierCount?: number;
}

export class MatchSuppliersDto {
  @ApiProperty({ example: 'Need IT hardware supplier with ISO 27001 certification, able to deliver 500 laptops within 4 weeks' })
  @IsString()
  @MinLength(10)
  requirements: string;

  @ApiPropertyOptional({ example: 'IT Hardware' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '100000-500000' })
  @IsOptional()
  @IsString()
  budgetRange?: string;
}

export class DraftEmailDto {
  @ApiProperty({
    enum: ['INVITATION', 'AWARD_NOTIFICATION', 'REJECTION', 'DEADLINE_REMINDER', 'CONTRACT_RENEWAL'],
    example: 'INVITATION',
  })
  @IsString()
  @IsIn(['INVITATION', 'AWARD_NOTIFICATION', 'REJECTION', 'DEADLINE_REMINDER', 'CONTRACT_RENEWAL'])
  type: 'INVITATION' | 'AWARD_NOTIFICATION' | 'REJECTION' | 'DEADLINE_REMINDER' | 'CONTRACT_RENEWAL';

  @ApiProperty({
    description: 'Context key-value pairs for the email (e.g. eventTitle, supplierName, deadline)',
    example: { eventTitle: 'Office Furniture RFQ', supplierName: 'Acme Corp', deadline: '2026-04-15' },
  })
  @IsObject()
  context: Record<string, string>;
}

export class MediateConsensusDto {
  @ApiProperty({ description: 'ID of the evaluation to mediate' })
  @IsString()
  evaluationId: string;
}

export class AnalyzeRenewalDto {
  @ApiProperty({ description: 'ID of the contract to analyse for renewal' })
  @IsString()
  contractId: string;
}

export class DetectCollusionDto {
  @ApiProperty({ description: 'ID of the auction to analyse for collusion patterns' })
  @IsString()
  auctionId: string;
}

// ── Phase 3 DTOs ─────────────────────────────────────────────────────────────

export class NaturalLanguageQueryDto {
  @ApiProperty({ example: 'What is our total spend this quarter?', description: 'Natural language question about procurement data' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  query: string;
}

export class SummarizeDocumentDto {
  @ApiProperty({ description: 'Document content as text' })
  @IsString()
  @MinLength(20)
  content: string;

  @ApiProperty({
    example: 'CONTRACT',
    description: 'Type of document (CONTRACT, BID, SPECIFICATION, REPORT, CORRESPONDENCE, POLICY)',
  })
  @IsString()
  documentType: string;
}

export class AgentTaskDto {
  @ApiProperty({
    example: 'Create an RFQ for 500 laptops with 2-week deadline',
    description: 'Natural language instruction for the procurement agent',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  instruction: string;
}
