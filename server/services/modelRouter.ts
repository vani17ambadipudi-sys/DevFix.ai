import { config } from '../config/env';
import { metrics } from '../observability/metrics';
import { logger } from '../observability/logger';
import { runTransformerBridgeCommand } from '../../src/services/transformerBridge';

export type ModelTarget = 'gemini' | 'localTransformer' | 'staticAnalysis';

export interface RouteDecision {
  target: ModelTarget;
  reason: string;
  isFallback: boolean;
}

export class ModelRouter {
  /**
   * Intelligently selects the execution model based on API key availability,
   * user preference, code size, and service health.
   */
  public static selectModel(
    code: string,
    language: string,
    preferredModel?: string,
    requestId: string = 'route_req'
  ): RouteDecision {
    const isPython = language.toLowerCase() === 'python';
    const codeLength = code.length;

    // Explicit user override
    if (preferredModel === 'localTransformer') {
      logger.info('model_route_decision', requestId, { decision: 'localTransformer', reason: 'User selected local Transformer' });
      metrics.recordAiRequest('localTransformer', 0);
      return {
        target: 'localTransformer',
        reason: 'Selected by user configuration (Stage 5 Custom PyTorch Transformer)',
        isFallback: false,
      };
    }

    if (preferredModel === 'staticAnalysis') {
      logger.info('model_route_decision', requestId, { decision: 'staticAnalysis', reason: 'User selected static analysis' });
      metrics.recordAiRequest('staticFallback', 0);
      return {
        target: 'staticAnalysis',
        reason: 'Selected by user configuration (Rule-based Static Analyzer)',
        isFallback: false,
      };
    }

    // Default to Gemini if key is configured
    if (config.hasGeminiKey) {
      logger.info('model_route_decision', requestId, { decision: 'gemini', reason: 'Gemini API available' });
      metrics.recordAiRequest('gemini', 0);
      return {
        target: 'gemini',
        reason: 'Gemini Multi-Agent System (Primary Production Engine)',
        isFallback: false,
      };
    }

    // If Gemini key is not configured, route to Local Transformer for Python or Static Analysis
    if (isPython && codeLength < 500) {
      logger.info('model_route_decision', requestId, { decision: 'localTransformer', reason: 'Gemini unconfigured, routing Python to Local Transformer' });
      metrics.recordAiRequest('localTransformer', 0);
      return {
        target: 'localTransformer',
        reason: 'Gemini API unconfigured; automatically routed to local PyTorch Transformer Lab',
        isFallback: true,
      };
    }

    logger.info('model_route_decision', requestId, { decision: 'staticAnalysis', reason: 'Fallback to deterministic static analysis' });
    metrics.recordAiRequest('staticFallback', 0);
    return {
      target: 'staticAnalysis',
      reason: 'Gemini API unconfigured; safely falling back to deterministic static code analyzer',
      isFallback: true,
    };
  }
}
