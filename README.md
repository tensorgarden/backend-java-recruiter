# Backend Java/Kotlin Recruiter

AI-assisted technical recruiter dashboard for sourcing, assessing, and hiring backend Java and Kotlin engineers. Pipeline analytics, AI match scoring, skills assessment tracking, and recruiter performance metrics in a single scrollable view.

## Who this is for

**Non-technical stakeholders.** See pipeline health, time-to-fill trends, and recruiter throughput at a glance. The hero stat cards surface the numbers that matter: active requisitions, offer acceptance rates, and assessment pass rates.

**Engineering evaluators.** Inspect the component architecture, TypeScript type system, and data model design. All components are inline in a single page.tsx with no external UI library. The domain model captures real recruiting complexity: multi-stage pipelines, skills-to-requisition matching, and AI confidence scores.

**AI agents/screeners.** This README surfaces the architecture, stack, and quality gates. The repo demonstrates the pattern of a deeply-featured Next.js dashboard with 13 fictional candidates, 3 job requisitions, 8 assessments, 10 activity entries, and a full recruiter team.

## Project story

Technical recruiting for backend Java and Kotlin roles is broken in predictable ways. Recruiters source candidates who look right on paper but fail the first coding assessment because their Spring Boot experience is surface-level. Hiring managers receive candidates who match keywords but have never touched Kafka in production. Offers get extended to candidates who then accept counter-offers, restarting the pipeline from zero.

These failure modes are expensive. A single mis-hire for a senior backend role costs roughly $150K-$200K in salary, ramp time, and team productivity drag. For staff-level platform engineers, the number is higher. Technical recruiters need more than a spreadsheet; they need a system that tracks skill depth, surfaces assessment signals, and keeps the pipeline honest about where candidates actually stand.

This dashboard demonstrates that system. It shows what a purpose-built technical recruiter platform looks like for the Java/Kotlin backend niche. AI match scores correlate skills to open requisitions. Assessment results track coding and system design performance with grader notes. The activity feed keeps every recruiter aligned on who needs a follow-up, who has an offer pending, and who withdrew last week.

## What you're looking at

| Screenshot | What it shows |
|---|---|
| Hero stats | 6 KPI cards: active reqs, candidates, time-to-fill, offer acceptance, assessment pass rate, match score |
| Candidate table | Full pipeline with status badges, AI scores, skill tags, expected salary, assigned recruiter |
| Open requisitions | 3 job reqs with priority badges, required skills, hiring progress, days open |
| Recruitment funnel | 7-stage pipeline from sourced to hired with pass rates per stage |
| Assessment results | Coding, system design, and take-home results with scores, grader notes |
| Activity feed | 10 recent events: offers sent, interviews scheduled, assessments graded |
| Recruiter performance | 3 recruiters with active reqs, pipeline depth, hires, and time-to-fill |

## Features

- **AI match scoring**: Each candidate carries a 0-100 match score reflecting skill overlap with their target requisition. Scores above 85 are flagged green; scores below 70 warn the recruiter.
- **Multi-stage pipeline**: Seven stages from sourced through hired, each tracking candidate counts and conversion pass rates. The funnel visualization shows where candidates drop off.
- **Skills-to-requisition matching**: Every candidate has a typed skills array; every requisition lists required skills. The data integrity tests verify that high-scored candidates share at least one skill with their target req.
- **Assessment analytics**: Coding, system design, behavioral, and take-home assessments with pass/marginal/fail results, numeric scores, and grader commentary.
- **Activity timeline**: Real-time feed of recruiter actions: messages sent, interviews scheduled, offers extended, feedback received. Each entry carries a positive/neutral/negative outcome marker.
- **Recruiter performance**: Per-recruiter metrics including active requisitions, candidates in pipeline, Q2 hires, and average time-to-fill in days.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.7 (strict mode) |
| Styling | Tailwind CSS 3.4 |
| Testing | Vitest 4.x |
| Linting | ESLint 9 (max-warnings=0) |
| CI | GitHub Actions (lint, typecheck, test, build) |

## Architecture

```
src/
  app/
    layout.tsx        Metadata + root layout
    page.tsx           Single dashboard: stats, table, funnel, assessments, activity
    globals.css        Tailwind directives
  lib/
    types.ts           TypeScript interfaces (Candidate, JobReq, Assessment, etc.)
    demo-data.ts       13 candidates, 3 reqs, 8 assessments, 10 activities
tests/
  backend_java_recruiter.test.ts   14 data-integrity tests
scripts/
  capture-screenshots.mjs          Playwright screenshot capture
```

Data flows from `demo-data.ts` through typed interfaces into the dashboard page. No API calls, no database, no external dependencies at runtime. Every component reads from the same in-memory dataset.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 to see the dashboard.

## Quality gates

All four gates are enforced in CI and must pass locally before pushing:

```bash
npm run lint       # ESLint with --max-warnings=0
npm run typecheck  # tsc --noEmit
npm test           # vitest run (14 tests)
npm run build      # next build
```

## Demo data

All data is fictional and public-safe:

- **13 candidates**: Senior through principal-level Java/Kotlin engineers across San Francisco, Austin, Seattle, New York, and remote locations. Statuses span sourced through hired with realistic pipeline distribution.
- **3 job requisitions**: Senior Backend Engineer (Platform), Staff Platform Engineer (Infrastructure), Mid-Level Services Developer (Payments).
- **8 assessments**: Coding and system design evaluations with pass/marginal/pending results and grader notes.
- **10 activity entries**: Offers sent, interviews scheduled, feedback received, status changes.
- **3 recruiters**: Jenna Park (senior), Derek Okonkwo (mid), Sanya Gupta (sourcing lead).
- **7 pipeline stages**: Full recruitment funnel with candidate counts and conversion rates.

## Screenshot refresh

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3121 &
sleep 3
SCREENSHOT_URL=http://127.0.0.1:3121 node scripts/capture-screenshots.mjs
```

## Production roadmap

What a production deployment would add:

- Supabase integration for persistent candidate, req, and assessment storage
- Real AI scoring via embedding-based skill-to-requisition matching
- Email/Slack notifications for status changes and approaching deadlines
- Role-based access for recruiters, hiring managers, and interviewers
- Calendar integration for interview scheduling
- ATS (Applicant Tracking System) data import from Greenhouse, Lever, or Workday

## Safety

No real API keys. No network calls. All data is fictional and generated at build time. The `.env.example` file contains mock values only. No candidate is a real person. No company is a real employer.

---

Built as a portfolio demonstration. Ready for review.
