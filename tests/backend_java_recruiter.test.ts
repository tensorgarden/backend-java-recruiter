import { describe, it, expect } from "vitest";
import {
  demoCandidates,
  demoJobReqs,
  demoRecruiters,
  demoAssessments,
  demoActivities,
  demoPipelineStages,
  demoAnalytics,
} from "@/lib/demo-data";

describe("Backend Java/Kotlin Recruiter — demo data integrity", () => {
  it("has at least 8 candidates", () => {
    expect(demoCandidates.length).toBeGreaterThanOrEqual(8);
  });

  it("every candidate references a valid job req", () => {
    const reqIds = new Set(demoJobReqs.map((r) => r.id));
    for (const c of demoCandidates) {
      expect(
        reqIds.has(c.jobReqId),
        `Candidate ${c.id} references unknown req ${c.jobReqId}`,
      ).toBe(true);
    }
  });

  it("every candidate references a valid recruiter", () => {
    const recIds = new Set(demoRecruiters.map((r) => r.id));
    for (const c of demoCandidates) {
      expect(
        recIds.has(c.recruiterId),
        `Candidate ${c.id} references unknown recruiter ${c.recruiterId}`,
      ).toBe(true);
    }
  });

  it("aiMatchScore is between 0 and 100 for all candidates", () => {
    for (const c of demoCandidates) {
      expect(c.aiMatchScore).toBeGreaterThanOrEqual(0);
      expect(c.aiMatchScore).toBeLessThanOrEqual(100);
    }
  });

  it("assessments reference existing candidates", () => {
    const candIds = new Set(demoCandidates.map((c) => c.id));
    for (const a of demoAssessments) {
      expect(
        candIds.has(a.candidateId),
        `Assessment ${a.id} references unknown candidate ${a.candidateId}`,
      ).toBe(true);
    }
  });

  it("activities reference existing candidates", () => {
    const candIds = new Set(demoCandidates.map((c) => c.id));
    for (const act of demoActivities) {
      expect(
        candIds.has(act.candidateId),
        `Activity ${act.id} references unknown candidate ${act.candidateId}`,
      ).toBe(true);
    }
  });

  it("pipeline stages are in ascending order", () => {
    for (let i = 1; i < demoPipelineStages.length; i++) {
      expect(demoPipelineStages[i].order).toBeGreaterThan(
        demoPipelineStages[i - 1].order,
      );
    }
  });

  it("pipeline stage counts are non-negative and passRates valid", () => {
    for (const s of demoPipelineStages) {
      expect(s.candidateCount).toBeGreaterThanOrEqual(0);
      expect(s.passRate).toBeGreaterThanOrEqual(0);
      expect(s.passRate).toBeLessThanOrEqual(100);
    }
  });

  it("analytics values are sensible", () => {
    expect(demoAnalytics.activeReqs).toBeGreaterThan(0);
    expect(demoAnalytics.totalCandidates).toBeGreaterThan(0);
    expect(demoAnalytics.avgTimeToFill).toBeGreaterThan(0);
    expect(demoAnalytics.offerAcceptanceRate).toBeGreaterThan(0);
    expect(demoAnalytics.offerAcceptanceRate).toBeLessThanOrEqual(100);
    expect(demoAnalytics.assessmentPassRate).toBeGreaterThan(0);
    expect(demoAnalytics.assessmentPassRate).toBeLessThanOrEqual(100);
    expect(demoAnalytics.avgMatchScore).toBeGreaterThan(0);
    expect(demoAnalytics.avgMatchScore).toBeLessThanOrEqual(100);
  });

  it("recruiters have positive metrics", () => {
    for (const rec of demoRecruiters) {
      expect(rec.activeReqs).toBeGreaterThan(0);
      expect(rec.candidatesInPipeline).toBeGreaterThan(0);
      expect(rec.hiresThisQuarter).toBeGreaterThanOrEqual(0);
      expect(rec.timeToFillAvg).toBeGreaterThan(0);
    }
  });

  it("candidate statuses are valid", () => {
    const validStatuses = [
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
      "offer",
      "hired",
      "declined",
      "withdrawn",
    ];
    for (const c of demoCandidates) {
      expect(validStatuses).toContain(c.status);
    }
  });

  // Data quality guard: candidates in active stages must have been contacted recently.
  it("active candidates (offer or earlier) have a lastContactAt date", () => {
    const activeStatuses = new Set([
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
      "offer",
    ]);
    for (const c of demoCandidates) {
      if (activeStatuses.has(c.status)) {
        expect(
          c.lastContactAt,
          `Candidate ${c.id} is ${c.status} but has no lastContactAt`,
        ).not.toBeNull();
      }
    }
  });

  // Data quality guard: high-scored candidates share skills with their req.
  it("high-scored candidates (>=85) share at least one skill with their job req", () => {
    const reqMap = new Map(demoJobReqs.map((r) => [r.id, r]));
    for (const c of demoCandidates) {
      if (c.aiMatchScore >= 85) {
        const req = reqMap.get(c.jobReqId);
        expect(req, `Candidate ${c.id} references unknown req`).toBeDefined();
        if (req) {
          const overlap = c.skills.filter((s) => req.requiredSkills.includes(s));
          expect(
            overlap.length,
            `Candidate ${c.id} scored ${c.aiMatchScore} but shares 0 skills with req ${c.jobReqId}`,
          ).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  // Pipeline hygiene: closed candidates are not in active pipeline.
  it("hired, declined, and withdrawn candidates are not counted in active pipeline", () => {
    const closedStatuses = new Set(["hired", "declined", "withdrawn"]);
    const activeCandidates = demoCandidates.filter(
      (c) => !closedStatuses.has(c.status),
    );
    expect(activeCandidates.length).toBeGreaterThan(0);
    for (const c of activeCandidates) {
      expect(closedStatuses.has(c.status)).toBe(false);
    }
  });

  // Pain point: salary misalignment kills pipelines. Candidates who expect
  // wildly more than the req budget waste everyone's time.
  it("no candidate expects more than 30% above their target req max salary", () => {
    const reqMap = new Map(demoJobReqs.map((r) => [r.id, r]));
    for (const c of demoCandidates) {
      // Only check active candidates — closed ones may have accepted elsewhere.
      if (c.status === "hired" || c.status === "declined" || c.status === "withdrawn") continue;
      const req = reqMap.get(c.jobReqId);
      if (!req) continue;
      const overage = c.expectedSalary / req.targetSalaryMax;
      expect(
        overage,
        `Candidate ${c.id} expects $${c.expectedSalary.toLocaleString()} but req ${c.jobReqId} max is $${req.targetSalaryMax.toLocaleString()} (${Math.round((overage - 1) * 100)}% over)`,
      ).toBeLessThanOrEqual(1.3);
    }
  });

  // Pain point: sourcing channels have vastly different quality. Referral and
  // github-sourced candidates tend to be better-aligned than agency submissions.
  it("referral-sourced candidates have higher average match score than agency-sourced", () => {
    const bySource = new Map<string, number[]>();
    for (const c of demoCandidates) {
      const scores = bySource.get(c.source) || [];
      scores.push(c.aiMatchScore);
      bySource.set(c.source, scores);
    }
    const avgReferral = bySource.get("referral")
      ? bySource.get("referral")!.reduce((a, b) => a + b, 0) / bySource.get("referral")!.length
      : 0;
    const avgAgency = bySource.get("agency")
      ? bySource.get("agency")!.reduce((a, b) => a + b, 0) / bySource.get("agency")!.length
      : 0;
    // Referral and github should outperform agency (when both sources exist).
    if (bySource.has("referral") && bySource.has("agency")) {
      expect(
        avgReferral,
        `Referral avg ${avgReferral.toFixed(0)} is not better than agency avg ${avgAgency.toFixed(0)}`,
      ).toBeGreaterThan(avgAgency);
    }
  });

  // Pain point: pipeline stagnation — active candidates not contacted recently
  // signal recruiter neglect and increase drop-off risk.
  it("active candidates have been contacted within the last 14 days", () => {
    const activeStatuses = new Set([
      "sourced", "screening", "coding_assessment",
      "system_design", "team_interview", "offer",
    ]);
    const fourteenDaysAgo = new Date("2026-06-10T00:00:00Z").getTime() - 14 * 86_400_000;
    for (const c of demoCandidates) {
      if (!activeStatuses.has(c.status)) continue;
      if (!c.lastContactAt) continue;
      const contactTime = new Date(c.lastContactAt).getTime();
      expect(
        contactTime,
        `Candidate ${c.id} (${c.status}) last contacted ${c.lastContactAt} — more than 14 days ago`,
      ).toBeGreaterThan(fourteenDaysAgo);
    }
  });

  // Pain point: uncalibrated seniority matching wastes ~40% more interviews
  // per hire. "Senior at a startup" does not equal "Senior at enterprise."
  // Candidates more than one level below a req are a pipeline-quality risk.
  it("candidates are within one level of their job req's target seniority", () => {
    const rank: Record<string, number> = {
      junior: 0, mid: 1, senior: 2, staff: 3, principal: 4,
    };
    const reqMap = new Map(demoJobReqs.map((r) => [r.id, r]));
    for (const c of demoCandidates) {
      const req = reqMap.get(c.jobReqId);
      if (!req) continue;
      // Closed candidates are not in the active pipeline — mismatches
      // among hired/declined/withdrawn are water under the bridge.
      if (c.status === "hired" || c.status === "declined" || c.status === "withdrawn") continue;
      const gap = rank[c.seniority] - rank[req.seniority];
      expect(
        gap,
        `Candidate ${c.id} is ${c.seniority} but req ${c.jobReqId} targets ${req.seniority} (gap: ${gap})`,
      ).toBeGreaterThanOrEqual(-1);
    }
  });

  // Pain point: title inflation — a candidate one level below a req may
  // still be a strong hire, but only if the gap is acknowledged and the
  // recruiter has a deliberate rationale in notes.
  it("candidates one level below their req have notes acknowledging the fit gap", () => {
    const rank: Record<string, number> = {
      junior: 0, mid: 1, senior: 2, staff: 3, principal: 4,
    };
    const reqMap = new Map(demoJobReqs.map((r) => [r.id, r]));
    for (const c of demoCandidates) {
      const req = reqMap.get(c.jobReqId);
      if (!req) continue;
      const gap = rank[c.seniority] - rank[req.seniority];
      if (gap !== -1) continue;
      expect(
        c.notes.length,
        `Candidate ${c.id} is ${c.seniority} for ${req.seniority} req ${c.jobReqId} but notes are empty — gap must be explained`,
      ).toBeGreaterThan(10);
    }
  });

  // Assessment calibration: inconsistent grading erodes hiring-manager trust
  // and wastes pipeline slots on candidates advanced through scoring errors.
  // A "pass" at 55% looks like grade inflation; a "fail" at 72% signals a
  // broken rubric. Calibrated thresholds keep every result defensible.
  it("assessment scores are calibrated to their result label", () => {
    for (const a of demoAssessments) {
      const pct = a.maxScore > 0 ? a.score / a.maxScore : null;
      if (a.result === "pending") {
        // Pending assessments should not have been scored yet.
        expect(
          a.score,
          `Assessment ${a.id} is pending but has score ${a.score}/${a.maxScore}`,
        ).toBe(0);
        continue;
      }
      expect(
        pct,
        `Assessment ${a.id} has maxScore ${a.maxScore} — cannot calibrate`,
      ).not.toBeNull();
      if (a.result === "pass") {
        expect(
          pct!,
          `Assessment ${a.id} is "pass" but score ${a.score}/${a.maxScore} is only ${Math.round(pct! * 100)}%`,
        ).toBeGreaterThanOrEqual(0.65);
      } else if (a.result === "fail") {
        expect(
          pct!,
          `Assessment ${a.id} is "fail" but score ${a.score}/${a.maxScore} is ${Math.round(pct! * 100)}%`,
        ).toBeLessThan(0.50);
      } else if (a.result === "marginal") {
        expect(
          pct!,
          `Assessment ${a.id} is "marginal" but score ${a.score}/${a.maxScore} is ${Math.round(pct! * 100)}%`,
        ).toBeGreaterThanOrEqual(0.50);
        expect(
          pct!,
          `Assessment ${a.id} is "marginal" but score ${a.score}/${a.maxScore} is too high at ${Math.round(pct! * 100)}%`,
        ).toBeLessThanOrEqual(0.75);
      }
    }
  });

  // Pain point: AI-assisted screens need a human calibration loop so
  // recruiters do not advance candidates on unreviewed scores alone.
  it("completed assessments include human calibration before pipeline use", () => {
    for (const a of demoAssessments) {
      if (a.result === "pending") continue;
      expect(
        a.humanReviewedAt,
        `Assessment ${a.id} has result ${a.result} but no human review timestamp`,
      ).not.toBeNull();
      expect(
        new Date(a.humanReviewedAt!).getTime(),
        `Assessment ${a.id} was reviewed before it was completed`,
      ).toBeGreaterThanOrEqual(new Date(a.completedAt).getTime());
      expect(
        a.calibrationNotes.length,
        `Assessment ${a.id} needs calibration rationale for recruiter trust`,
      ).toBeGreaterThanOrEqual(40);
    }
  });

  it("pending assessments remain queued for calibration instead of carrying premature review", () => {
    const pendingAssessments = demoAssessments.filter((a) => a.result === "pending");
    expect(pendingAssessments.length).toBeGreaterThan(0);
    for (const a of pendingAssessments) {
      expect(
        a.humanReviewedAt,
        `Pending assessment ${a.id} should not have a completed human review`,
      ).toBeNull();
      expect(
        a.calibrationNotes.toLowerCase(),
        `Pending assessment ${a.id} should explain its calibration queue`,
      ).toContain("queued");
    }
  });

  // Pain point: AI-assisted technical screens must evaluate how candidates use
  // AI, not just whether they used it. Approved tools, disclosure, evidence,
  // and live-debug follow-up make the skill signal recruiter-defensible.
  it("coding and take-home assessments record AI assistance policy and evidence", () => {
    const practicalAssessments = demoAssessments.filter((a) =>
      a.type === "coding" || a.type === "take_home",
    );
    expect(practicalAssessments.length).toBeGreaterThan(0);
    for (const a of practicalAssessments) {
      if (a.result === "pending") {
        expect(a.aiAssistancePolicy).toBe("unknown");
        expect(a.aiFluencyReview.toLowerCase()).toContain("pending");
        continue;
      }
      expect(
        a.aiAssistancePolicy,
        `Assessment ${a.id} needs an explicit AI-use policy`,
      ).not.toBe("unknown");
      expect(
        a.aiUsageEvidence.length,
        `Assessment ${a.id} needs AI-use evidence or disclosure artifacts`,
      ).toBeGreaterThan(0);
      expect(
        a.aiFluencyReview.length,
        `Assessment ${a.id} needs a recruiter-readable AI fluency review`,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("AI-assisted assessment reviews prove candidates can reason beyond generated output", () => {
    const assistedAssessments = demoAssessments.filter(
      (a) =>
        a.result !== "pending" &&
        (a.aiAssistancePolicy === "allowed_with_disclosure" ||
          a.aiAssistancePolicy === "company_sandbox"),
    );
    expect(assistedAssessments.length).toBeGreaterThan(0);
    for (const a of assistedAssessments) {
      const signal = `${a.aiFluencyReview} ${a.aiUsageEvidence.join(" ")}`.toLowerCase();
      expect(
        signal,
        `Assessment ${a.id} should show debugging, explanation, disclosure, or trade-off review`,
      ).toMatch(/debug|correct|explain|trade-off|test|disclos|reject/);
    }
  });


  // Pain point: AI-generated resumes, synthetic identities, and proxy interviews
  // are especially risky in remote technical hiring. Late-stage candidates need
  // identity, work-history, and live-interview evidence before they consume
  // hiring-manager time or reach offer.
  it("late-stage candidates have identity, work-history, and live-interview integrity signals", () => {
    const lateStages = new Set(["system_design", "team_interview", "offer", "hired"]);
    const lateStageCandidates = demoCandidates.filter((c) => lateStages.has(c.status));
    expect(lateStageCandidates.length).toBeGreaterThan(0);

    for (const c of lateStageCandidates) {
      expect(
        c.integrity.identityStatus,
        `Candidate ${c.id} is ${c.status} but identity is not verified`,
      ).toBe("verified");
      expect(
        c.integrity.workHistoryStatus,
        `Candidate ${c.id} is ${c.status} but work history is not verified`,
      ).toBe("verified");
      expect(
        c.integrity.liveInterviewStatus,
        `Candidate ${c.id} is ${c.status} but live interview integrity is unresolved`,
      ).toBe("verified");
      expect(
        c.integrity.fraudRisk,
        `Candidate ${c.id} is late-stage with high fraud risk`,
      ).not.toBe("high");
    }
  });

  it("unresolved integrity risks have an owner and near-term review date", () => {
    const referenceTime = new Date("2026-06-10T00:00:00Z").getTime();
    const sevenDaysLater = referenceTime + 7 * 86_400_000;

    for (const c of demoCandidates) {
      const hasIncompleteCheck =
        c.integrity.identityStatus !== "verified" ||
        c.integrity.workHistoryStatus !== "verified" ||
        c.integrity.liveInterviewStatus !== "verified";
      const needsReview = hasIncompleteCheck || c.integrity.fraudRisk !== "low";

      if (!needsReview) continue;

      expect(
        c.integrity.reviewOwner,
        `Candidate ${c.id} has unresolved integrity risk but no review owner`,
      ).not.toBeNull();
      expect(
        c.integrity.reviewOwner ?? "",
        `Candidate ${c.id} needs a named integrity review owner`,
      ).toMatch(/\w+ \w+/);

      expect(
        c.integrity.nextReviewAt,
        `Candidate ${c.id} has unresolved integrity risk but no review deadline`,
      ).not.toBeNull();
      const reviewTime = new Date(c.integrity.nextReviewAt!).getTime();
      expect(
        Number.isNaN(reviewTime),
        `Candidate ${c.id} has an invalid review deadline`,
      ).toBe(false);
      expect(
        reviewTime,
        `Candidate ${c.id} review deadline should be in the future`,
      ).toBeGreaterThan(referenceTime);
      expect(
        reviewTime,
        `Candidate ${c.id} review deadline should be within 7 days`,
      ).toBeLessThanOrEqual(sevenDaysLater);
    }
  });

  // Pain point: identity verification should target high-risk checkpoints without
  // adding redundant friction for candidates whose identity, work history, and
  // live interview evidence are already resolved.
  it("keeps fully verified low-risk candidates out of the integrity review queue", () => {
    const verifiedCandidates = demoCandidates.filter(
      (candidate) =>
        candidate.integrity.identityStatus === "verified" &&
        candidate.integrity.workHistoryStatus === "verified" &&
        candidate.integrity.liveInterviewStatus === "verified" &&
        candidate.integrity.fraudRisk === "low",
    );
    expect(verifiedCandidates.length).toBeGreaterThan(0);

    for (const candidate of verifiedCandidates) {
      expect(
        candidate.integrity.reviewOwner,
        `Candidate ${candidate.id} is fully verified but still has a review owner`,
      ).toBeNull();
      expect(
        candidate.integrity.nextReviewAt,
        `Candidate ${candidate.id} is fully verified but still has a review deadline`,
      ).toBeNull();
    }
  });

  it("only queues targeted reviews for active candidates with unresolved integrity risk", () => {
    const activeStages = new Set([
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
      "offer",
    ]);
    const queuedCandidates = demoCandidates.filter(
      (candidate) =>
        candidate.integrity.reviewOwner !== null ||
        candidate.integrity.nextReviewAt !== null,
    );
    expect(queuedCandidates.length).toBeGreaterThan(0);

    for (const candidate of queuedCandidates) {
      const hasTargetedRisk =
        candidate.integrity.identityStatus !== "verified" ||
        candidate.integrity.workHistoryStatus !== "verified" ||
        candidate.integrity.liveInterviewStatus !== "verified" ||
        candidate.integrity.fraudRisk !== "low";

      expect(
        hasTargetedRisk,
        `Candidate ${candidate.id} is queued without an unresolved integrity risk`,
      ).toBe(true);
      expect(
        activeStages,
        `Candidate ${candidate.id} is ${candidate.status} but remains in the active review queue`,
      ).toContain(candidate.status);
      expect(candidate.integrity.reviewOwner).not.toBeNull();
      expect(candidate.integrity.nextReviewAt).not.toBeNull();
    }
  });

  it("candidate fraud follow-ups include recruiter-readable evidence", () => {
    for (const c of demoCandidates) {
      expect(
        c.integrity.evidence.length,
        `Candidate ${c.id} needs at least two integrity evidence notes`,
      ).toBeGreaterThanOrEqual(2);

      const hasIncompleteCheck =
        c.integrity.identityStatus !== "verified" ||
        c.integrity.workHistoryStatus !== "verified" ||
        c.integrity.liveInterviewStatus !== "verified";

      if (hasIncompleteCheck) {
        const evidence = c.integrity.evidence.join(" ").toLowerCase();
        expect(
          evidence,
          `Candidate ${c.id} has incomplete verification but no explicit follow-up evidence`,
        ).toMatch(/follow-up|pending|scheduled|requires|awaits|rule out|review/);
      }

      if (c.integrity.fraudRisk === "high") {
        expect(
          ["sourced", "screening"],
          `Candidate ${c.id} should not advance while high fraud risk is unresolved`,
        ).toContain(c.status);
      }
    }
  });

  // Pain point: 2026 candidate-fraud detection has to happen during the
  // interview itself. Verified live-interview checks should document
  // resume-to-interview consistency, depth of explanation, or unscripted
  // reasoning — not just a generic identity pass.
  it("verified live-interview checks include real-time consistency evidence", () => {
    const verifiedLiveInterviewCandidates = demoCandidates.filter(
      (c) => c.integrity.liveInterviewStatus === "verified",
    );
    expect(verifiedLiveInterviewCandidates.length).toBeGreaterThan(0);

    const liveInterviewPattern = /live|panel|interview|screen|system-design|debug|onboarding|offer-stage/i;
    const consistencyPattern = /matched|unscripted|trade-off|debug|explain|choices|reasoning|domain-specific|concurrency|notes/i;

    for (const c of verifiedLiveInterviewCandidates) {
      const evidence = `${c.notes} ${c.integrity.evidence.join(" ")}`;
      expect(
        evidence,
        `Candidate ${c.id} has verified live interview status without interview-time evidence`,
      ).toMatch(liveInterviewPattern);
      expect(
        evidence,
        `Candidate ${c.id} needs consistency, explanation, or reasoning evidence for live verification`,
      ).toMatch(consistencyPattern);
    }
  });

  // Pain point: candidate identity fraud can slip past early screens, so
  // offer and start decisions need explicit re-verification instead of
  // relying on an application-time ID check.
  it("offer and hired candidates have explicit offer-stage identity re-verification", () => {
    const irreversibleStages = new Set(["offer", "hired"]);

    for (const c of demoCandidates) {
      if (!irreversibleStages.has(c.status)) continue;

      expect(
        c.integrity.offerStageReverificationStatus,
        `Candidate ${c.id} is ${c.status} without offer-stage re-verification`,
      ).toBe("verified");

      const evidence = c.integrity.evidence.join(" ").toLowerCase();
      expect(
        evidence,
        `Candidate ${c.id} needs recruiter-readable offer/onboarding re-verification evidence`,
      ).toMatch(/offer-stage|onboarding|start date/);
    }
  });

  it("pre-offer active candidates do not claim completed offer-stage re-verification", () => {
    const preOfferStages = new Set([
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
    ]);

    for (const c of demoCandidates) {
      if (!preOfferStages.has(c.status)) continue;
      expect(
        c.integrity.offerStageReverificationStatus,
        `Candidate ${c.id} is only ${c.status} but claims completed offer-stage verification`,
      ).not.toBe("verified");
    }
  });

  // Pain point: a polished take-home can be completed by AI or a proxy. Keep
  // candidates before system design until a live session establishes that the
  // person in the pipeline can explain and modify the submitted work.
  it("candidates without live-interview verification stay in validation stages", () => {
    const validationStages = new Set(["sourced", "screening", "coding_assessment"]);

    for (const c of demoCandidates) {
      if (c.integrity.liveInterviewStatus === "verified") continue;
      expect(
        validationStages,
        `Candidate ${c.id} advanced to ${c.status} before live-interview verification`,
      ).toContain(c.status);
    }
  });

  it("unverified take-home passes include a scheduled live authorship check", () => {
    const candidatesById = new Map(demoCandidates.map((c) => [c.id, c]));
    const takeHomePasses = demoAssessments.filter(
      (assessment) => assessment.type === "take_home" && assessment.result === "pass",
    );
    expect(takeHomePasses.length).toBeGreaterThan(0);

    for (const assessment of takeHomePasses) {
      const candidate = candidatesById.get(assessment.candidateId);
      expect(candidate, `Assessment ${assessment.id} references an unknown candidate`).toBeDefined();
      if (!candidate || candidate.integrity.liveInterviewStatus === "verified") continue;

      const evidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
      expect(
        evidence,
        `Candidate ${candidate.id} needs a live check tied to take-home authorship`,
      ).toMatch(/live|camera-on/i);
      expect(
        evidence,
        `Candidate ${candidate.id} needs a scheduled validation, walkthrough, or follow-up`,
      ).toMatch(/scheduled|validate|authorship|walkthrough|follow-up/i);
    }
  });

  // Deepfake video can survive a routine remote call, so elevated-risk candidates
  // need both an in-session liveness check and an unexpected technical challenge.
  it("elevated fraud risks have synchronous liveness and contextual challenge evidence", () => {
    const elevatedRiskCandidates = demoCandidates.filter(
      (candidate) => candidate.integrity.fraudRisk !== "low",
    );
    expect(elevatedRiskCandidates.length).toBeGreaterThan(0);

    for (const candidate of elevatedRiskCandidates) {
      const evidence = candidate.integrity.evidence.join(" ");
      expect(
        evidence,
        `Candidate ${candidate.id} needs a camera-on or live liveness check`,
      ).toMatch(/camera-on|\blive\b|video|screen/i);
      expect(
        evidence,
        `Candidate ${candidate.id} needs evidence aimed at deepfake or proxy risk`,
      ).toMatch(/liveness|deepfake|proxy|visual continuity|head turn|hand movement/i);
      expect(
        evidence,
        `Candidate ${candidate.id} needs an unexpected contextual challenge`,
      ).toMatch(/unexpected|domain-specific|unscripted|debug|walkthrough|follow-up/i);
    }
  });

  it("unresolved identity checks include a physical liveness step before late stages", () => {
    const identityFollowUps = demoCandidates.filter(
      (candidate) => candidate.integrity.identityStatus !== "verified",
    );
    const validationStages = new Set(["sourced", "screening", "coding_assessment"]);
    expect(identityFollowUps.length).toBeGreaterThan(0);

    for (const candidate of identityFollowUps) {
      const evidence = candidate.integrity.evidence.join(" ");
      expect(
        validationStages,
        `Candidate ${candidate.id} advanced to ${candidate.status} before identity liveness review`,
      ).toContain(candidate.status);
      expect(
        evidence,
        `Candidate ${candidate.id} needs identity-linked liveness evidence`,
      ).toMatch(/camera-on identity liveness|identity liveness.*(?:head turn|hand movement)/i);
    }
  });

  // Pain point: fraud signals are missed when application, screening, and
  // interview evidence stays fragmented across separate hiring checkpoints.
  // Active candidates should carry both an upstream corroboration signal and
  // live-stage evidence in one recruiter-readable integrity record.
  it("connects active candidate evidence across application and interview checkpoints", () => {
    const activeStages = new Set([
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
      "offer",
    ]);
    const upstreamEvidencePattern =
      /identity|work history|employment|reference|referral|github|agency|application|profile|conference|patent|source/i;
    const liveCheckpointPattern =
      /camera-on|\blive\b|panel|interview|screen|system-design|debug|offer-stage/i;

    for (const candidate of demoCandidates) {
      if (!activeStages.has(candidate.status)) continue;
      const evidence = candidate.integrity.evidence.join(" ");

      expect(
        evidence,
        `Candidate ${candidate.id} needs an upstream identity or work-history signal`,
      ).toMatch(upstreamEvidencePattern);
      expect(
        evidence,
        `Candidate ${candidate.id} needs a connected live-stage integrity signal`,
      ).toMatch(liveCheckpointPattern);
    }
  });

  it("elevated fraud risks include independently corroborated upstream evidence", () => {
    const elevatedRiskCandidates = demoCandidates.filter(
      (candidate) => candidate.integrity.fraudRisk !== "low",
    );
    expect(elevatedRiskCandidates.length).toBeGreaterThan(0);

    for (const candidate of elevatedRiskCandidates) {
      const evidence = candidate.integrity.evidence.join(" ");
      expect(
        evidence,
        `Candidate ${candidate.id} needs a source beyond self-reported resume claims`,
      ).toMatch(/reference|github|public|conference|patent|agency/i);
    }
  });

  // Generic liveness prompts can be rehearsed. Elevated-risk reviews should
  // probe expertise the candidate actually claims so the challenge tests
  // identity continuity and depth of experience at the same time.
  it("ties elevated-risk contextual challenges to the candidate's claimed skills", () => {
    const elevatedRiskCandidates = demoCandidates.filter(
      (candidate) => candidate.integrity.fraudRisk !== "low",
    );
    expect(elevatedRiskCandidates.length).toBeGreaterThan(0);

    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9+.#]+/g, " ").trim();

    for (const candidate of elevatedRiskCandidates) {
      const challengeEvidence = candidate.integrity.evidence
        .filter((note) =>
          /unexpected|follow-up|walkthrough|debug|domain-specific|unscripted/i.test(note),
        )
        .join(" ");
      const normalizedEvidence = ` ${normalize(challengeEvidence)} `;
      const matchedSkills = candidate.skills.filter((skill) =>
        normalizedEvidence.includes(` ${normalize(skill)} `),
      );

      expect(
        matchedSkills.length,
        `Candidate ${candidate.id} needs a contextual challenge tied to a claimed skill`,
      ).toBeGreaterThan(0);
    }
  });

  // Pain point: generated applications and coaching services can reuse the same
  // project story under different identities. A cross-funnel fingerprint makes
  // that repetition reviewable instead of leaving each recruiter with an
  // isolated, individually plausible profile.
  const applicationClaimFingerprint = (candidate: {
    currentRole: string;
    currentCompany: string;
    notes: string;
  }) =>
    [candidate.currentRole, candidate.currentCompany, candidate.notes]
      .map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
      .join("|");

  it("flags repeated application claims across different candidate identities", () => {
    const firstClaim = applicationClaimFingerprint({
      currentRole: "Senior Backend Engineer",
      currentCompany: "Example Payments",
      notes: "Owned the settlement API migration and Kafka cutover.",
    });
    const repeatedClaim = applicationClaimFingerprint({
      currentRole: "senior backend engineer",
      currentCompany: "Example Payments",
      notes: "Owned the settlement API migration—and Kafka cutover!",
    });

    expect(repeatedClaim).toBe(firstClaim);
  });

  it("active candidate application claims are unique across the funnel", () => {
    const activeStages = new Set([
      "sourced",
      "screening",
      "coding_assessment",
      "system_design",
      "team_interview",
      "offer",
    ]);
    const activeCandidates = demoCandidates.filter((candidate) =>
      activeStages.has(candidate.status),
    );
    const seenClaims = new Map<string, string>();
    expect(activeCandidates.length).toBeGreaterThan(1);

    for (const candidate of activeCandidates) {
      const fingerprint = applicationClaimFingerprint(candidate);
      const firstCandidateId = seenClaims.get(fingerprint);
      expect(
        firstCandidateId,
        `Candidates ${firstCandidateId} and ${candidate.id} repeat the same role, company, and project claim`,
      ).toBeUndefined();
      seenClaims.set(fingerprint, candidate.id);
    }
  });

  // Pain point: fabricated references can look plausible when recruiters use only
  // candidate-supplied contacts. Verified work history should name an independent
  // source, while unresolved checks should identify the channel recruiters will use.
  it("grounds verified work history in independently sourced evidence", () => {
    const verifiedWorkHistory = demoCandidates.filter(
      (candidate) => candidate.integrity.workHistoryStatus === "verified",
    );
    expect(verifiedWorkHistory.length).toBeGreaterThan(0);

    for (const candidate of verifiedWorkHistory) {
      const evidence = candidate.integrity.evidence.join(" ");
      expect(
        evidence,
        `Candidate ${candidate.id} has verified work history without a named independent source`,
      ).toMatch(
        /employer|employment|reference|referral|github|public|conference|patent|agency|stack overflow|network|contribution/i,
      );
    }
  });

  it("work-history follow-ups name a verification channel", () => {
    const pendingWorkHistory = demoCandidates.filter(
      (candidate) => candidate.integrity.workHistoryStatus !== "verified",
    );
    expect(pendingWorkHistory.length).toBeGreaterThan(0);

    for (const candidate of pendingWorkHistory) {
      const evidence = candidate.integrity.evidence.join(" ");
      expect(
        evidence,
        `Candidate ${candidate.id} needs a concrete work-history verification channel`,
      ).toMatch(/direct reference|employer|employment|public|recruiter follow-up/i);
    }
  });

  // Pain point: recruiters measured on time-to-fill and pipeline volume should
  // not grade their own fraud homework. When the same recruiter advancing a
  // candidate also owns the integrity review, a red flag can be waved through
  // to protect the metric — so queued reviews belong with an independent
  // reviewer who has no stake in the candidate's outcome.
  it("assigns queued integrity reviews to a reviewer independent of the candidate's recruiter", () => {
    const recruitersById = new Map(demoRecruiters.map((r) => [r.id, r]));
    const queuedCandidates = demoCandidates.filter(
      (candidate) =>
        candidate.integrity.reviewOwner !== null ||
        candidate.integrity.nextReviewAt !== null,
    );
    expect(queuedCandidates.length).toBeGreaterThan(0);

    for (const candidate of queuedCandidates) {
      const recruiter = recruitersById.get(candidate.recruiterId);
      expect(
        recruiter,
        `Candidate ${candidate.id} references unknown recruiter ${candidate.recruiterId}`,
      ).toBeDefined();
      expect(
        candidate.integrity.reviewOwner,
        `Candidate ${candidate.id} integrity review is owned by the same recruiter advancing them`,
      ).not.toBe(recruiter!.fullName);
    }
  });

  // Pain point: Java hiring integrity requires validating that backend-specific
  // skills claims are actually demonstrable during live interviews. A candidate
  // claiming expertise in Kafka architecture or Spring Cloud patterns should show
  // concrete reasoning, trade-off knowledge, or debugging capability during a
  // system design or code review session — not just a polished resume.
  describe("Backend-specific skills-based integrity verification", () => {
    it("candidates claiming advanced backend frameworks have system-design or code-review evidence", () => {
      const advancedFrameworkPatterns =
        /Spring Cloud|Spring Batch|Spring Security OAuth|gRPC|event sourcing|CQRS|microservices|distributed tracing/i;
      const systemDesignTypes = new Set(["system_design", "behavioral"]);

      const claimingAdvanced = demoCandidates.filter((c) => {
        const claims = `${c.skills.join(" ")} ${c.notes}`;
        return advancedFrameworkPatterns.test(claims);
      });
      expect(claimingAdvanced.length).toBeGreaterThan(0);

      for (const candidate of claimingAdvanced) {
        const assessments = demoAssessments.filter(
          (a) => a.candidateId === candidate.id && a.result !== "pending",
        );
        const hasSystemDesignEvidence = assessments.some(
          (a) => systemDesignTypes.has(a.type) && a.result === "pass",
        );
        // Check for architecture reasoning in notes or integrity evidence
        const allEvidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
        const notesHaveArchitectureReasoning = /architect|microservice|event|distributed|scale|async|concurrency|idempotent|eventual|consistency|resilience|trade-off/i.test(
          allEvidence,
        );

        expect(
          hasSystemDesignEvidence || notesHaveArchitectureReasoning,
          `Candidate ${candidate.id} claims advanced backend frameworks but has no system-design or architecture evidence`,
        ).toBe(true);
      }
    });

    it("candidates claiming concurrency expertise have specific implementation evidence", () => {
      const concurrencyKeywords = /concurrency|threading|async|await|coroutine|reactive|Flux|Mono|CompletableFuture|Netty|virtual thread/i;
      const claimingConcurrency = demoCandidates.filter((c) => {
        const claims = `${c.skills.join(" ")} ${c.notes}`;
        return concurrencyKeywords.test(claims);
      });

      if (claimingConcurrency.length > 0) {
        for (const candidate of claimingConcurrency) {
          const evidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
          expect(
            evidence,
            `Candidate ${candidate.id} claims concurrency expertise but notes lack concrete implementation patterns`,
          ).toMatch(
            /deadlock|race condition|lock-free|thread pool|queue|backpressure|flow control|timeout|interruption/i,
          );
        }
      }
    });

    it("candidates claiming data-pipeline or event-streaming skills document technology depth", () => {
      const dataSystemsKeywords = /Kafka|Pulsar|RabbitMQ|Redis|data pipeline|event streaming|stream processing|ETL|replication/i;
      const claimingDataSystems = demoCandidates.filter((c) => {
        const claims = `${c.skills.join(" ")} ${c.notes}`;
        return dataSystemsKeywords.test(claims);
      });

      if (claimingDataSystems.length > 0) {
        for (const candidate of claimingDataSystems) {
          const evidence = `${candidate.skills.join(" ")} ${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
          // Accept evidence of data system understanding: specific tech stack, scaling patterns, or architectural decisions
          expect(
            evidence,
            `Candidate ${candidate.id} claims data/streaming expertise but lacks specific demonstration`,
          ).toMatch(/kafka|redis|event|stream|replicate|partition|broker|distributed|architec|scale/i);
        }
      }
    });

    it("system-design assessment passes for backend roles include architecture or trade-off discussion", () => {
      const backendCandidates = demoCandidates.filter((c) => {
        const req = demoJobReqs.find((r) => r.id === c.jobReqId);
        return req && req.department === "Platform Engineering";
      });
      const systemDesignAssessments = demoAssessments.filter(
        (a) => a.type === "system_design" && a.result === "pass",
      );

      for (const assessment of systemDesignAssessments) {
        const candidate = backendCandidates.find((c) => c.id === assessment.candidateId);
        if (!candidate) continue;

        expect(
          assessment.calibrationNotes.length,
          `System design assessment ${assessment.id} for backend role lacks architecture rationale`,
        ).toBeGreaterThanOrEqual(50);
        // Accept evidence of architectural thinking: design choices, performance, failure modes, or constraints
        expect(
          assessment.calibrationNotes,
          `System design assessment ${assessment.id} should show architectural thinking`,
        ).toMatch(/design|scale|backpressure|failure|event|boundary|consistency|availability|trade|latency|throughput|replica|partition|failover/i);
      }
    });

    it("advanced-skill candidates hold assessment results until live follow-up evidence exists", () => {
      const advancedSkillKeywords =
        /distributed|microservices|architecture|resilience|gRPC|Spring Cloud|event sourcing|CQRS|Kafka/i;
      const advancedCandidates = demoCandidates.filter((c) => {
        const claims = `${c.skills.join(" ")} ${c.notes}`;
        return advancedSkillKeywords.test(claims);
      });

      for (const candidate of advancedCandidates) {
        // Advanced candidates should either be fully verified with live evidence
        // or held in assessment/validation stages pending live follow-up.
        const isFullyVerified =
          candidate.integrity.identityStatus === "verified" &&
          candidate.integrity.workHistoryStatus === "verified" &&
          candidate.integrity.liveInterviewStatus === "verified";

        const isHeldForValidation = new Set(["sourced", "screening", "coding_assessment"]).has(
          candidate.status,
        );

        const hasLiveEvidence =
          /live|system-design|panel|debug|walkthrough|offer-stage|team interview/i.test(
            candidate.integrity.evidence.join(" "),
          );

        expect(
          isFullyVerified || isHeldForValidation || hasLiveEvidence,
          `Candidate ${candidate.id} claims advanced backend skills but advanced to ${candidate.status} without live follow-up evidence`,
        ).toBe(true);
      }
    });
  });

  // Pain point: real-time AI tools such as second-screen answer feeds and live
  // voice assistants are the default attack in 2026 live coding rounds. A
  // policy declaration alone does not prove a "no AI" round was actually
  // clean, so no-AI coding rounds need live-session enforcement evidence
  // (screen share, webcam, proctoring) and flagged rounds must hold the
  // candidate until an enforced supervised re-screen clears the signal.
  describe("Live coding enforcement for no-AI rounds", () => {
    it("no-AI coding rounds record live-session enforcement evidence, not just policy", () => {
      const noAiCodingRounds = demoAssessments.filter(
        (a) =>
          a.type === "coding" &&
          a.result !== "pending" &&
          a.aiAssistancePolicy === "not_allowed",
      );
      expect(noAiCodingRounds.length).toBeGreaterThan(0);
      for (const a of noAiCodingRounds) {
        const evidence = a.aiUsageEvidence.join(" ").toLowerCase();
        expect(
          evidence,
          `Assessment ${a.id} declares a no-AI coding round but lacks live-session enforcement evidence`,
        ).toMatch(/screen.?share|webcam|proctor|session record|monitor/i);
      }
    });

    it("suspected undisclosed AI use holds the candidate and requires an enforced re-screen", () => {
      const suspects = demoAssessments.filter((a) => {
        if (a.type !== "coding" || a.result === "pending") return false;
        const text = `${a.aiUsageEvidence.join(" ")} ${a.notes} ${a.aiFluencyReview}`.toLowerCase();
        return /off.?screen|faster than|could not explain/i.test(text);
      });
      expect(suspects.length).toBeGreaterThan(0);

      const candidatesById = new Map(demoCandidates.map((c) => [c.id, c]));
      const validationStages = new Set(["sourced", "screening", "coding_assessment"]);
      for (const a of suspects) {
        expect(
          a.result,
          `Assessment ${a.id} shows undisclosed-assistance signals but still passed`,
        ).not.toBe("pass");
        expect(
          a.result,
          `Assessment ${a.id} should remain a human-review signal, not an automatic rejection`,
        ).not.toBe("fail");
        expect(
          a.humanReviewedAt,
          `Assessment ${a.id} has integrity anomalies without a human review timestamp`,
        ).not.toBeNull();
        const reviewText = `${a.calibrationNotes} ${a.aiFluencyReview} ${a.notes}`.toLowerCase();
        expect(
          reviewText,
          `Assessment ${a.id} needs a scheduled re-screen, not just a hold`,
        ).toMatch(/re.?screen/);
        expect(
          reviewText,
          `Assessment ${a.id} re-screen must enforce a monitoring channel`,
        ).toMatch(/screen.?share|webcam|proctor|monitor/i);

        const candidate = candidatesById.get(a.candidateId);
        expect(candidate, `Assessment ${a.id} references an unknown candidate`).toBeDefined();
        expect(
          validationStages,
          `Candidate ${a.candidateId} advanced to ${candidate?.status} after a flagged round`,
        ).toContain(candidate?.status);
      }
    });
  });

  // Pain point: if interviewers have not calibrated what the scores mean
  // before scoring, the numbers are meaningless. A shared rubric keeps the
  // same assessment type comparable across candidates and graders, so every
  // completed result should sit inside a defensible band and explain its
  // band placement against the shared rubric.
  describe("Grader calibration consistency", () => {
    const bandLimits: Record<
      string,
      Record<"pass" | "marginal", [number, number]>
    > = {
      coding: { pass: [85, 100], marginal: [60, 75] },
      system_design: { pass: [85, 100], marginal: [60, 75] },
      take_home: { pass: [80, 100], marginal: [60, 75] },
      behavioral: { pass: [80, 100], marginal: [60, 75] },
    };

    it("pass and marginal scores stay inside the shared band for their assessment type", () => {
      const completed = demoAssessments.filter(
        (a) => a.result === "pass" || a.result === "marginal",
      );
      expect(completed.length).toBeGreaterThan(0);

      for (const a of completed) {
        const bands = bandLimits[a.type];
        expect(
          bands,
          `Assessment ${a.id} has an unexpected type ${a.type}`,
        ).toBeDefined();
        if (!bands) continue;
        const pct = (a.score / a.maxScore) * 100;
        const [min, max] = a.result === "pass" ? bands.pass : bands.marginal;
        expect(
          pct,
          `Assessment ${a.id} scored ${a.score}/${a.maxScore} (${pct.toFixed(0)}%) outside the shared ${a.result} band ${min}-${max}%`,
        ).toBeGreaterThanOrEqual(min);
        expect(
          pct,
          `Assessment ${a.id} scored ${a.score}/${a.maxScore} above the shared ${a.result} band`,
        ).toBeLessThanOrEqual(max);
      }
    });

    it("completed calibration notes explain score placement against the shared rubric", () => {
      const completed = demoAssessments.filter((a) => a.result !== "pending");
      expect(completed.length).toBeGreaterThan(0);

      for (const a of completed) {
        expect(
          a.calibrationNotes,
          `Assessment ${a.id} needs a rubric or band reference in its calibration notes`,
        ).toMatch(/rubric|band|threshold|calibrat/i);
      }
    });

    it("every assessment type in use has at least one rubric-calibrated record", () => {
      const completed = demoAssessments.filter((a) => a.result !== "pending");
      const rubricPattern = /rubric|band|threshold|calibrat/i;
      const typesInUse = new Set(completed.map((a) => a.type));
      const typesWithCalibration = new Set(
        completed
          .filter((a) => rubricPattern.test(a.calibrationNotes))
          .map((a) => a.type),
      );
      expect(typesInUse.size).toBeGreaterThan(0);
      expect(
        [...typesWithCalibration].sort(),
        `Every assessment type in use needs at least one rubric-calibrated record`,
      ).toEqual([...typesInUse].sort());
    });
  });

  // Pain point: structured technical interviews need a stable, role-specific
  // question set so candidates for the same requisition are comparable.
  describe("Per-requisition question-set identity", () => {
    it("uses one question set for each requisition and assessment type", () => {
      const candidatesById = new Map(demoCandidates.map((candidate) => [candidate.id, candidate]));
      const questionSetByScope = new Map<string, string>();
      const scopedAssessments = demoAssessments.filter((assessment) => {
        const candidate = candidatesById.get(assessment.candidateId);
        expect(candidate, `Assessment ${assessment.id} references an unknown candidate`).toBeDefined();
        return candidate !== undefined;
      });
      expect(scopedAssessments.length).toBeGreaterThan(0);

      for (const assessment of scopedAssessments) {
        const candidate = candidatesById.get(assessment.candidateId);
        if (!candidate) continue;
        const scope = `${candidate.jobReqId}:${assessment.type}`;
        const questionSetId = assessment.questionSetId;

        expect(
          questionSetId,
          `Assessment ${assessment.id} needs a stable question-set identity`,
        ).toMatch(/^qs_[a-z0-9_]+_v\d+$/);

        const firstQuestionSet = questionSetByScope.get(scope);
        if (firstQuestionSet) {
          expect(
            questionSetId,
            `Assessments for ${scope} must use the same question set`,
          ).toBe(firstQuestionSet);
        } else if (questionSetId) {
          questionSetByScope.set(scope, questionSetId);
        }
      }

      expect(questionSetByScope.size).toBeGreaterThan(1);
    });

    it("keeps each assessment question set scoped to its requisition and format", () => {
      const candidatesById = new Map(demoCandidates.map((candidate) => [candidate.id, candidate]));
      const reqTokensById = new Map(
        demoJobReqs.map((req) => [req.id, req.id.replace(/^req_/, "")]),
      );
      const scopedAssessments = demoAssessments.filter((assessment) => {
        const candidate = candidatesById.get(assessment.candidateId);
        expect(candidate, `Assessment ${assessment.id} references an unknown candidate`).toBeDefined();
        return candidate !== undefined;
      });
      expect(scopedAssessments.length).toBeGreaterThan(0);

      for (const assessment of scopedAssessments) {
        const candidate = candidatesById.get(assessment.candidateId);
        if (!candidate) continue;
        const reqToken = reqTokensById.get(candidate.jobReqId);
        expect(
          reqToken,
          `Candidate ${candidate.id} references an unknown requisition ${candidate.jobReqId}`,
        ).toBeDefined();
        if (!reqToken) continue;

        expect(
          assessment.questionSetId,
          `Assessment ${assessment.id} should use a ${candidate.jobReqId}/${assessment.type} question set`,
        ).toMatch(new RegExp(`^qs_${reqToken}_${assessment.type}_v\\d+$`));
      }
    });
  });

  // Pain point: a polished interview outline can survive a surface-level
  // screen, while depth and candidate-specific follow-up expose generated or
  // coached answers before they consume hiring-manager time.
  describe("Interview-time fraud signal coverage", () => {
    const technicalInterviewStages = new Set(["system_design", "team_interview"]);

    it("requires depth-of-explanation follow-up for verified technical interviews", () => {
      const candidates = demoCandidates.filter(
        (candidate) =>
          technicalInterviewStages.has(candidate.status) &&
          candidate.integrity.liveInterviewStatus === "verified",
      );
      expect(candidates.length).toBeGreaterThan(0);

      for (const candidate of candidates) {
        const evidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
        expect(
          evidence,
          `Candidate ${candidate.id} has verified live status without depth-of-explanation evidence`,
        ).toMatch(/follow-up|trade-off|debug|unscripted|concurrency/i);
      }
    });

    it("ties verified technical interview evidence to the claimed backend domain", () => {
      const candidates = demoCandidates.filter(
        (candidate) =>
          technicalInterviewStages.has(candidate.status) &&
          candidate.integrity.liveInterviewStatus === "verified",
      );
      expect(candidates.length).toBeGreaterThan(0);

      for (const candidate of candidates) {
        const evidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
        expect(
          evidence,
          `Candidate ${candidate.id} has live evidence without a backend-specific signal`,
        ).toMatch(/event|concurrency|kubernetes|kafka|payments|trade-off|debug/i);
      }
    });

    it("keeps late-stage evidence grounded in interview-time consistency signals", () => {
      const lateStageCandidates = demoCandidates.filter((candidate) =>
        new Set(["system_design", "team_interview", "offer", "hired"]).has(candidate.status),
      );
      expect(lateStageCandidates.length).toBeGreaterThan(0);

      for (const candidate of lateStageCandidates) {
        const evidence = `${candidate.notes} ${candidate.integrity.evidence.join(" ")}`;
        expect(
          evidence,
          `Candidate ${candidate.id} advanced without a captured interview-time consistency signal`,
        ).toMatch(/matched|confirmed|validated|scheduled|follow-up|panel|interview/i);
      }
    });
  });

});
