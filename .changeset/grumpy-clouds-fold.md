---
'@sweidos/eidos': patch
---

Fix incorrectly low size-limit budget for the CJS bundle (was 8KB, actual minified single-file bundle needs ~18KB). No runtime change.
