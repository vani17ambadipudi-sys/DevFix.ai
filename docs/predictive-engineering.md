# DevFix AI — Predictive Software Engineering Architecture (Phase 10)

## 1. System Vision

DevFix AI transforms from **Reactive Software Maintenance** into **Predictive Software Engineering**:

```text
Phase 8: Repository-Level Engineering
        ↓
Phase 9: Continuous Maintenance & Quality
        ↓
Phase 10: Predictive Engineering
        ↓
Identify Emerging Risk Areas
        ↓
Explain Underlying Evidence
        ↓
Recommend Preventive Maintenance
        ↓
Developer In The Loop Decision
```

---

## 2. Core Invariants

1. **Evidence-First Principle:**
   * Observed Facts, Measured Signals, Historical Patterns, and AI Interpretations are strictly distinguished.
   * Predictions are framed as risk indicators and maintenance signals—never as guaranteed future failures.
   * If insufficient data exists, risk is categorized as `Unknown`.

2. **5-Layer Evidence Hierarchy:**
   * **Observation:** What is noticeable in the repository?
   * **Measured Evidence:** Exact recorded numbers, sample sizes, and timestamps.
   * **AI Interpretation:** Explainable analytical hypothesis of why this pattern matters.
   * **Uncertainty & Limitations:** Explicit acknowledgment of data limits.
   * **Actionable Recommendation:** Specific preventive maintenance task.

3. **Developer Approval Gateway:**
   * Preventive recommendations do not automatically rewrite production code.
   * The developer can `[Accept]`, `[Mark as Investigating]`, `[Dismiss]`, or convert into an explicit maintenance task.

---

## 3. Specialized Predictive Agent Layer

* **Prediction Manager Agent (`src/agents/prediction/predictionManagerAgent.ts`):** Orchestrates signal collection across all modules, coordinates specialized agents, and compiles the final report.
* **Trend Analyzer Agent (`src/agents/prediction/trendAnalyzerAgent.ts`):** Evaluates failure frequencies across 4-week temporal windows to detect directional trajectories.
* **Quality Risk Agent (`src/agents/prediction/qualityRiskAgent.ts`):** Analyzes test failure rates, code churn, and cyclomatic complexity.
* **Security Risk Agent (`src/agents/prediction/securityRiskAgent.ts`):** Audits real security advisories, signature validation timing risks, and CORS exposures.
* **Dependency Risk Agent (`src/agents/prediction/dependencyRiskAgent.ts`):** Tracks outdated packages, version drifts, and known vulnerability counts.
* **Preventive Planner Agent (`src/agents/prediction/preventivePlannerAgent.ts`):** Formulates prioritized preventive maintenance tasks.
