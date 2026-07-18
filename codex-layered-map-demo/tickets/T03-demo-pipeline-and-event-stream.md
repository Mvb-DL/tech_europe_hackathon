# T03 — Demo Pipeline and Event Stream

**Status:** TODO  
**Human owner:** Leo  
**Depends on:** T00, T01

## Goal

Create deterministic demo engines that drive the UI through typed events.

## Scope

- implement `PipelineEvent`
- event reducer updates queue, layers, nodes, and activity stream
- demo file-mapping engine
- pause, resume, restart, and speed controls
- generic filename and extension heuristics only
- deterministic results for identical uploads
- clear `demo` status on simulated outputs

## Acceptance criteria

- engine emits events through the interface
- UI does not import demo rules
- engine can be swapped through dependency injection or a factory
- replay produces identical order and map output
- no known fraud answers are encoded

## Out of scope

- real document understanding
- LLM calls
- real entity extraction
