---
'@sweidos/eidos': minor
---

Add opt-in reliability telemetry: `ReliabilityStats` (`queued`/`succeeded`/`failed`/`retried`/`conflicted`/`cancelled`) tracked on every `neverLose` queue/replay outcome, exposed via `eidosReliabilityStats` / `useEidosReliabilityStats()`, and reported periodically via `EidosConfig.onReliabilityReport` + `reliabilityReportInterval`. `<EidosDevtools />` gained a "Reliability" tab.
