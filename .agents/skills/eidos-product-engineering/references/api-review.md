# API simplicity review

## Questions
1. Can a new developer understand the primary use case from one short example?
2. Is any required config only necessary because internals leak?
3. Are there competing APIs for the same job?
4. Can types prevent invalid states (e.g. neverLose without durable identity)?
5. Are lifecycle constraints (module-scope registration, SW path) discoverable?
6. Does Provider/init forward the full public config surface?
7. Are guarantees named honestly (at-least-once + keys ≠ exactly-once execution)?
8. Would removing this abstraction make the library easier or harder to use correctly?

## Deliverable
Before/after code for: install, happy path, offline, reload, failure, server requirements, cleanup, IDE inference. Reject designs that shrink the surface by weakening reliability.
