import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma.service';

/**
 * AIService — Core wrapper around Claude API.
 * Used by all modules for AI-powered features.
 *
 * Features:
 * - Graceful fallback when ANTHROPIC_API_KEY not set (returns null, doesn't break)
 * - Token tracking and interaction logging
 * - Rate limiting awareness
 * - Structured JSON output support
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.enabled = true;
      this.logger.log(`AI Service initialized (model: ${this.model})`);
    } else {
      this.client = null;
      this.enabled = false;
      this.logger.warn('AI Service disabled — ANTHROPIC_API_KEY not set. AI features will return fallback responses.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate text from a prompt with optional system instructions.
   */
  async generateText(options: {
    system?: string;
    prompt: string;
    maxTokens?: number;
    orgId?: string;
    userId?: string;
    feature: string;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number } | null> {
    if (!this.client) return null;

    const startTime = Date.now();
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens ?? 2048,
        system: options.system,
        messages: [{ role: 'user', content: options.prompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      const result = {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };

      // Log interaction
      await this.logInteraction({
        orgId: options.orgId,
        userId: options.userId,
        feature: options.feature,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return result;
    } catch (error) {
      this.logger.error(`AI request failed (${options.feature}): ${error}`);
      await this.logInteraction({
        orgId: options.orgId,
        userId: options.userId,
        feature: options.feature,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Generate structured JSON from a prompt.
   */
  async generateJSON<T = Record<string, unknown>>(options: {
    system?: string;
    prompt: string;
    maxTokens?: number;
    orgId?: string;
    userId?: string;
    feature: string;
  }): Promise<T | null> {
    const result = await this.generateText({
      ...options,
      system: (options.system ?? '') + '\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation.',
    });

    if (!result) return null;

    try {
      // Strip markdown code fences if present
      let jsonText = result.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(jsonText) as T;
    } catch {
      this.logger.warn(`AI returned invalid JSON for ${options.feature}: ${result.text.substring(0, 100)}`);
      return null;
    }
  }

  /**
   * Analyze a document/text against specific instructions.
   */
  async analyzeDocument(options: {
    document: string;
    instructions: string;
    maxTokens?: number;
    orgId?: string;
    userId?: string;
    feature: string;
  }): Promise<{ analysis: string; inputTokens: number; outputTokens: number } | null> {
    const result = await this.generateText({
      system: 'You are an expert procurement analyst. Analyze the following document according to the instructions provided.',
      prompt: `DOCUMENT:\n${options.document}\n\nINSTRUCTIONS:\n${options.instructions}`,
      maxTokens: options.maxTokens ?? 3000,
      orgId: options.orgId,
      userId: options.userId,
      feature: options.feature,
    });

    return result ? { analysis: result.text, inputTokens: result.inputTokens, outputTokens: result.outputTokens } : null;
  }

  /**
   * Log AI interaction for analytics and billing.
   */
  private async logInteraction(data: {
    orgId?: string;
    userId?: string;
    feature: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.prisma.aIInteraction.create({
        data: {
          orgId: data.orgId ?? null,
          userId: data.userId ?? null,
          feature: data.feature,
          model: this.model,
          inputTokens: data.inputTokens ?? 0,
          outputTokens: data.outputTokens ?? 0,
          durationMs: data.durationMs,
          success: data.success,
          errorMessage: data.errorMessage ?? null,
        },
      });
    } catch {
      // Logging failures must never break main flow
    }
  }
}
