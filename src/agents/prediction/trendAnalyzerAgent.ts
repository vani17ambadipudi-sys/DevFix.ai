import { TrendEngine, TrendAnalysisResult } from '../../prediction/trendEngine';

export class TrendAnalyzerAgent {
  public static analyze(repoId?: string): TrendAnalysisResult {
    return TrendEngine.analyze(repoId);
  }
}
