# Tech Europe Berlin Hackathon 2026

This repository contains our submission for the Tech Europe Summer Lock-In Hackathon in Berlin on July 18, 2026.

The project will be developed during a single-day hackathon. The exact challenge will be announced at the event.

This README is the initial source of truth for the team and for AI coding agents working in this repository.

---

## 1. Project Status

Current status: **Pre-hackathon preparation**

The final challenge, judging criteria, provided datasets, submission requirements, and permitted technologies are not yet known.

Do not assume missing challenge details.

Once the challenge is announced, update the following files first:

```text
docs/challenge.md
docs/product-spec.md
docs/architecture.md
docs/demo-script.md
```

The project scope must remain small enough to build, test, deploy, and demonstrate within one day.

---

## 2. Hackathon Context

The event is focused on building and shipping a working AI product.

Known partners include:

* Tech Europe
* Cortea
* OpenAI
* Cognee
* Tavily
* Almedia

Cortea is expected to provide the main challenge. The problem may involve audit workflows, document analysis, evidence collection, risk identification, financial information, compliance checks, or human review.

This is only an initial assumption. The official challenge description takes priority over everything written here.

---

## 3. Mission

Build the smallest product that:

1. directly solves the official challenge,
2. provides an obvious benefit to a clearly defined user,
3. completes one end-to-end workflow,
4. uses AI for a meaningful task,
5. produces traceable and reviewable results,
6. can be demonstrated reliably in under two minutes.

The goal is not to build a production-ready platform.

The goal is to build a convincing, useful, technically credible prototype that works during the live demo.

---

## 4. Core Product Principles

### Solve one concrete problem

Avoid generic chatbots, broad AI assistants, or platforms with unclear value.

The product should have:

* one primary user,
* one painful workflow,
* one clear input,
* one clear output,
* one measurable benefit.

### Build a vertical slice first

The first implementation must complete the entire user flow, even if some components are initially mocked.

A vertical slice should include:

```text
User input
→ Processing
→ AI reasoning or extraction
→ Structured result
→ Evidence or explanation
→ Human action
```

### Prefer reliability over complexity

A simple workflow that works is more valuable than a complex architecture that cannot be demonstrated.

Avoid adding technologies only because they are available.

Every dependency, API, model, agent, and database must have a clear purpose.

### Make AI outputs reviewable

Where relevant, AI-generated conclusions should include:

* source references,
* extracted evidence,
* confidence or uncertainty,
* reasoning summaries,
* missing information,
* a human approval or correction step.

The system should not pretend to know information it cannot verify.

---

## 5. Expected Product Direction

A likely product direction is an evidence-to-decision workflow.

Example:

```text
A user uploads documents or structured data.

The system identifies the relevant information.

The system checks a specific requirement or risk.

The system highlights supporting and conflicting evidence.

The system produces a structured recommendation.

A human reviews, approves, rejects, or corrects the result.
```

Possible use cases include:

* comparing invoices with contracts,
* identifying missing audit evidence,
* verifying financial values across documents,
* checking compliance requirements,
* finding contradictions,
* prioritizing audit risks,
* generating reviewable audit workpapers,
* tracking unresolved requests.

Do not implement any of these before the official challenge is known unless they are useful as reusable infrastructure.

---

## 6. Hackathon Priorities

### P0 — Required

These items must be completed:

* official challenge documented,
* target user and problem defined,
* one working end-to-end workflow,
* stable demo,
* real or realistic example data,
* clear AI-generated output,
* visible evidence or explanation,
* basic error handling,
* deployment or reliable local execution,
* submission completed before the deadline,
* demo script,
* backup screenshots or screen recording,
* updated README.

### P1 — Strongly preferred

These items improve the submission:

* human-in-the-loop review,
* uncertainty handling,
* source citations,
* structured outputs,
* clear visual differentiation,
* one meaningful partner integration,
* basic evaluation cases,
* exportable results,
* mentor feedback incorporated.

### P2 — Only if time remains

These items must not delay the core demo:

* authentication,
* multiple user roles,
* multiple agents,
* complex dashboards,
* extensive animations,
* production infrastructure,
* broad workflow coverage,
* advanced permissions,
* comprehensive test suites,
* multiple deployment environments.

---

## 7. Internal Timeline

The internal deadline is earlier than the official demo.

### By 10:40

* challenge documented,
* judging criteria understood,
* team roles assigned,
* open questions identified.

### By 11:10

* one product idea selected,
* user and workflow defined,
* demo story defined,
* technical approach selected.

### By 12:20

* first vertical slice works,
* one input produces one visible result,
* major technical risks identified.

### By 14:30

* real AI integration works,
* frontend and backend are connected,
* first deployment attempt completed,
* at least one realistic test case works.

### By 16:15

* full system integrated,
* happy path stable,
* one failure or uncertainty case supported.

### At 17:00

**Feature freeze.**

After this point, do not add new features.

Only work on:

* blocking bugs,
* deployment,
* demo data,
* UI clarity,
* error states,
* documentation,
* submission,
* pitch preparation.

### By 18:00

* final demo build ready,
* README updated,
* submission information prepared,
* demo script completed,
* backup recording created.

### From 19:00

* no risky code changes,
* rehearse the demo,
* prepare for jury questions.

---

## 8. Proposed Repository Structure

The structure may be adjusted once the stack is selected.

```text
.
├── README.md
├── .env.example
├── .gitignore
├── frontend/
│   ├── README.md
│   └── src/
├── backend/
│   ├── README.md
│   └── src/
├── data/
│   ├── demo-good/
│   ├── demo-issue/
│   └── demo-unclear/
├── evals/
│   ├── cases/
│   └── README.md
├── docs/
│   ├── challenge.md
│   ├── product-spec.md
│   ├── architecture.md
│   ├── decisions.md
│   └── demo-script.md
├── scripts/
└── tests/
```

For a monolithic framework such as Next.js, the repository may instead use:

```text
.
├── app/
├── components/
├── lib/
├── data/
├── evals/
├── docs/
├── public/
└── tests/
```

Prefer the simplest structure supported by the selected stack.

---

## 9. Required Documentation

### `docs/challenge.md`

Must contain:

```text
Official challenge:
Target user:
Required output:
Judging criteria:
Available data:
Available APIs:
Technical restrictions:
Submission requirements:
Open questions:
```

### `docs/product-spec.md`

Must contain:

```text
Problem:
User:
Current workflow:
Proposed workflow:
Primary use case:
Input:
Output:
Core value:
P0 features:
P1 features:
Out of scope:
Demo scenario:
```

### `docs/architecture.md`

Must contain:

* architecture overview,
* data flow,
* major components,
* model usage,
* external integrations,
* deployment approach,
* known limitations.

### `docs/decisions.md`

Record important decisions using this format:

```markdown
## Decision: Short title

**Time:**
**Context:**
**Decision:**
**Reason:**
**Alternatives rejected:**
**Revisit only if:**
```

This prevents the team from repeatedly reopening settled discussions.

### `docs/demo-script.md`

Must contain:

* opening statement,
* user problem,
* live-demo steps,
* technical explanation,
* measurable value,
* final statement,
* backup demo procedure,
* expected jury questions.

---

## 10. Technical Guidelines

### General

* Prefer a single application over unnecessary microservices.
* Prefer managed APIs over custom infrastructure.
* Prefer typed interfaces.
* Prefer structured model outputs.
* Keep setup steps minimal.
* Keep secrets out of the repository.
* Add all required variables to `.env.example`.
* Use realistic but non-sensitive demo data.
* Commit working states frequently.

### AI implementation

Model responses should use a defined schema where possible.

Example:

```json
{
  "status": "pass | fail | unclear",
  "summary": "Short conclusion",
  "evidence": [
    {
      "source": "document-name.pdf",
      "location": "page 3",
      "excerpt": "Relevant extracted content"
    }
  ],
  "missing_information": [],
  "confidence": 0.82,
  "recommended_action": "Request supporting evidence"
}
```

Do not depend on unrestricted free-text output for critical application logic.

Prompts should:

* define the user and task,
* define the permitted evidence,
* require uncertainty disclosure,
* prohibit unsupported conclusions,
* request structured results,
* distinguish extracted facts from inferred conclusions.

### Error handling

The demo must not fail silently.

Handle at least:

* missing input,
* unsupported file type,
* failed model request,
* malformed model response,
* no evidence found,
* incomplete information,
* unavailable external API.

Show a useful user-facing message and preserve enough detail for debugging.

### Logging

Log important processing stages without exposing secrets or sensitive data.

Useful events include:

* request received,
* document processed,
* model invoked,
* evidence found,
* structured result validated,
* external API failed,
* user approved or rejected a result.

---

## 11. Partner Technology Policy

Partner technologies should only be used when they improve the core workflow.

### OpenAI

Potential uses:

* document understanding,
* extraction,
* classification,
* structured reasoning,
* tool calling,
* report generation.

### Tavily

Potential uses:

* external verification,
* regulatory research,
* web search,
* source extraction,
* fact comparison.

Do not add Tavily if the workflow does not require external information.

### Cognee

Potential uses:

* persistent context,
* relationships between entities,
* graph-based retrieval,
* cross-document memory,
* repeated investigations.

Do not add Cognee if the workflow only processes one small input once.

### Integration rule

If an integration does not produce visible demo value within approximately 30 minutes, remove or postpone it.

---

## 12. Evaluation Strategy

Create at least three demo or evaluation cases.

### Case 1: Successful case

The system has enough information and produces the expected result.

### Case 2: Detected issue

The system identifies a contradiction, missing requirement, or risk.

### Case 3: Unclear case

The system does not have enough evidence and correctly requests human review or additional information.

Each evaluation case should contain:

```text
Input:
Expected output:
Critical evidence:
Expected status:
Failure conditions:
```

The project does not need a large benchmark.

It needs enough evaluation to demonstrate that the workflow behaves intentionally.

---

## 13. Demo Requirements

The final demonstration should be understandable without reading the source code.

Recommended sequence:

1. Explain the user problem.
2. Show the input.
3. Start the analysis.
4. Show the result.
5. Open the supporting evidence.
6. Highlight a risk, contradiction, or missing item.
7. Perform the human review action.
8. Explain the technical architecture briefly.
9. State the product impact.

Prepare a demo that lasts no more than two minutes unless the organizers specify otherwise.

Do not include:

* a source-code walkthrough,
* lengthy setup,
* unnecessary navigation,
* unreliable live data,
* features unrelated to the challenge.

---

## 14. Definition of Done

The submission is considered ready when:

* the application starts using documented commands,
* required environment variables are listed,
* one end-to-end workflow works,
* realistic demo data is included,
* results are understandable,
* evidence or reasoning is visible,
* uncertainty is handled,
* the user can review the result,
* the application handles basic failures,
* the demo has been rehearsed,
* a backup demo exists,
* the submission form has been completed,
* the README describes the final product,
* known limitations are documented.

---

## 15. Instructions for Codex

When working in this repository:

1. Read this README completely.
2. Read all files in `docs/`.
3. Inspect the existing implementation before changing architecture.
4. Do not invent missing challenge requirements.
5. Ask for the official challenge only if it has not yet been documented.
6. Prefer small, working changes.
7. Preserve the current working demo.
8. Do not introduce a new framework without a critical reason.
9. Do not add dependencies that are not needed.
10. Keep `.env.example` updated.
11. Update documentation when behavior changes.
12. Run relevant tests, type checks, and builds after changes.
13. Clearly report:

    * what changed,
    * which files changed,
    * how to run it,
    * what was tested,
    * what remains incomplete.

### Codex task priority

When several tasks are available, work in this order:

1. unblock the end-to-end demo,
2. fix crashes or broken integrations,
3. complete P0 requirements,
4. improve reliability,
5. improve demo clarity,
6. add P1 differentiation,
7. improve documentation,
8. add optional features.

### Codex scope protection

Before implementing a new feature, verify:

```text
Does this directly improve the official judging criteria?

Will it be visible in the final demo?

Can it be completed and tested before feature freeze?

Does it introduce risk to the current working flow?
```

If the answers are unclear, do not implement the feature.

---

## 16. Initial Codex Assignment

Before the challenge announcement, Codex may prepare only reusable infrastructure.

Recommended initial tasks:

1. initialize the selected application framework,
2. create the proposed documentation files,
3. add `.env.example`,
4. add formatting and type-checking commands,
5. add a basic health-check route,
6. add a minimal landing page,
7. create placeholder interfaces for:

   * input,
   * processing state,
   * structured result,
   * evidence,
   * human review,
8. add sample non-sensitive data,
9. document setup and run commands.

Do not build the final product workflow until the official challenge has been added to `docs/challenge.md`.

---

## 17. Initial Placeholder Product Flow

The pre-challenge UI may contain only these generic states:

```text
1. Select or upload input
2. Start analysis
3. Display processing state
4. Display structured result
5. Display supporting evidence
6. Approve, reject, or request more information
```

All challenge-specific wording must remain easy to replace.

---

## 18. Local Development

Update this section once the stack has been initialized.

Expected structure:

```bash
# Install dependencies
TODO

# Configure environment
cp .env.example .env

# Start development server
TODO

# Run tests
TODO

# Run type checks
TODO

# Create production build
TODO
```

---

## 19. Environment Variables

Do not commit real credentials.

Potential variables may include:

```dotenv
OPENAI_API_KEY=
TAVILY_API_KEY=
COGNEE_API_KEY=
DATABASE_URL=
```

Only keep variables that are actually used.

---

## 20. Final Product Summary

Replace this section after the product has been selected.

```text
Product name:
One-line description:
Target user:
Problem:
Solution:
Core workflow:
AI contribution:
Partner technologies:
Key differentiator:
Repository:
Live demo:
```

---

## 21. Known Limitations

Update continuously during the hackathon.

Initial limitations:

* official challenge not yet announced,
* final technical stack not yet selected,
* final dataset not yet available,
* final submission format not yet confirmed.

---

## 22. Team Working Agreement

* The working demo is more important than unfinished ambition.
* The official challenge is more important than initial assumptions.
* Product decisions must be made quickly.
* One person owns the final scope.
* Every major feature must support the demo.
* Broken optional features should be removed.
* Feature freeze is at 17:00.
* No risky changes after 19:00.
* The final product must be understandable in under two minutes.

---

## License

Add the appropriate license before submission if required by the organizers.
