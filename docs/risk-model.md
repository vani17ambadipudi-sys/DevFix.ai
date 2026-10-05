# DevFix AI — Explainable Risk Model Specification

## 1. Risk Levels & Thresholds

DevFix AI rejects black-box AI scores in favor of an **explainable risk scoring model** based on empirical engineering measurements:

| Risk Category | Numerical Range | Criteria & Primary Drivers | Confidence |
|:---|:---:|:---|:---:|
| **High** | $\ge 75$ | $\ge 7$ test failures, $\ge 5$ code churn events, repeated emergency fixes, critical security advisories, or P95 latency $>700\text{ms}$. | High |
| **Medium** | $35 - 74$ | $3 - 6$ test failures, $3 - 4$ recent commits, moderate cyclomatic complexity, or non-critical security findings. | High / Medium |
| **Low** | $1 - 34$ | Normal stability parameters, $\le 2$ test runs with 0 failures, low churn. | Medium |
| **Unknown** | $0$ | Insufficient telemetry data recorded for module. Never guessed. | Low |

---

## 2. Signal Weights & Categories

* **Test Failure Frequency:** Up to 45 points based on failure density over 30 days.
* **Code Churn:** Up to 25 points for frequent modifications within the same module.
* **Maintenance History:** Up to 20 points for repeated emergency patches.
* **Security Advisories:** Up to 25 points based on CVE severity.
* **Performance Drift:** Up to 15 points for P95 latency exceeding 600ms SLO threshold.

---

## 3. Real Example Evaluation

```json
{
  "area": "src/payments",
  "riskLevel": "high",
  "confidence": "high",
  "primaryDrivers": [
    "8 recorded test failures",
    "5 recent code modifications",
    "3 repeated maintenance events",
    "1 security advisory finding",
    "P95 latency elevated to 780ms"
  ],
  "reason": "Identified based on: 8 recorded test failures, 5 recent code modifications, 3 repeated maintenance events, 1 security advisory finding, P95 latency elevated to 780ms.",
  "interpretation": "The src/payments area has accumulated multiple maintenance and stability signals. Proactive review and regression expansion are strongly recommended."
}
```
