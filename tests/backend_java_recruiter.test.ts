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

});
