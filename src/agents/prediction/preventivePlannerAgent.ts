import { PreventiveRecommendation } from '../../types/predictionTypes';
import { PreventiveRecommendationService } from '../../recommendations/preventiveRecommendation';
import { ModuleSignals } from '../../prediction/signalAggregator';
import { EvaluatedRisk } from '../../prediction/riskEngine';

export class PreventivePlannerAgent {
  public static plan(
    signals: ModuleSignals,
    risk: EvaluatedRisk
  ): PreventiveRecommendation[] {
    return PreventiveRecommendationService.generateRecommendations(signals, risk);
  }
}
