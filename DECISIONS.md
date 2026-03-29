# Part 2: Feature Decision Rationale

## What insight from the data drove the decision

32% of beta users (16/50) tried the product once and never returned. Two signals stood out:

- **44% never uploaded a document** — they never reached the core value of cited, document-grounded answers
- **Citation quality was worse for churned users** — 1.74 avg sources cited vs 2.79 for returning users; 23.5% zero-citation rate vs 15.3%
- **56% left without any feedback** — no way to diagnose or recover from poor experiences
- Customer feedback reinforced this: lawyers called uncited answers "terrifying" for multi-million pound deals

## Why this over other options

We considered confidence indicators (addresses trust directly) and export-to-Word (requested by one firm). We chose two features that attack one-and-done churn from both ends:

**1. Guided onboarding with sample document**
- Removes the activation barrier — users experience cited answers on a real CRE document within minutes
- Sets expectations upfront: explicit warning that the tool works **only with uploaded documents**, not a general legal assistant
- Directly addresses the 44% who never uploaded

**2. Structured feedback with predefined reasons**
- Thumbs down triggers a dropdown: "answer not in document", "wrong citation", "too vague", "not what I asked", "other"
- Each submission logged with structured telemetry (message context, document details, citation count, reason)
- Replaces silent churn with actionable data for quality improvement

## What we'd do next with more time

- **Behaviour-triggered emails** — segment by upload status and citation quality, re-engage within 24-48 hours
- **Inline citation verification** — clickable references ("section 4.2") that jump to the document viewer page
- **Cohort tracking** — measure activation ("asked a question, received a cited answer") against D7/D30 retention
- **A/B test onboarding** — forcing vs suggesting the sample document to optimise activation rates
