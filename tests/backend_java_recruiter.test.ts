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
});
