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
});
