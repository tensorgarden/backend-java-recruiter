import {
  demoCandidates,
  demoJobReqs,
  demoRecruiters,
  demoAssessments,
  demoActivities,
  demoPipelineStages,
  demoAnalytics,
} from "@/lib/demo-data";
import type { Candidate, Assessment, Recruiter } from "@/lib/types";

// --- Reusable components ---

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue" | "purple" | "indigo";
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-white text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

function ProgressBar({ value, color = "indigo" }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${colors[color] || colors.indigo}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    hired: "bg-emerald-400",
    offer: "bg-indigo-400",
    team_interview: "bg-purple-400",
    system_design: "bg-fuchsia-400",
    coding_assessment: "bg-blue-400",
    screening: "bg-amber-400",
    sourced: "bg-slate-400",
    declined: "bg-red-400",
    withdrawn: "bg-red-400",
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${map[status] || "bg-slate-400"}`}
    />
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    sourced: "Sourced",
    screening: "Screening",
    coding_assessment: "Coding",
    system_design: "Sys Design",
    team_interview: "Team Int.",
    offer: "Offer",
    hired: "Hired",
    declined: "Declined",
    withdrawn: "Withdrawn",
  };
  return labels[status] || status;
}

function statusTone(status: string) {
  if (status === "hired" || status === "offer") return "green";
  if (status === "declined" || status === "withdrawn") return "red";
  if (status === "team_interview" || status === "system_design") return "purple";
  if (status === "coding_assessment") return "blue";
  if (status === "screening") return "amber";
  return "slate";
}

function integrityTone(
  risk: Candidate["integrity"]["fraudRisk"],
): "green" | "amber" | "red" {
  if (risk === "low") return "green";
  if (risk === "medium") return "amber";
  return "red";
}

const aiPolicyLabels: Record<Assessment["aiAssistancePolicy"], string> = {
  not_allowed: "AI not allowed",
  allowed_with_disclosure: "AI allowed with disclosure",
  company_sandbox: "Approved AI sandbox",
  unknown: "AI use pending review",
};

function formatCurrency(n: number): string {
  return `$${(n / 1000).toFixed(0)}K`;
}

function findJobReq(id: string) {
  return demoJobReqs.find((r) => r.id === id);
}

function findRecruiter(id: string): Recruiter | undefined {
  return demoRecruiters.find((r) => r.id === id);
}

// --- Stat cards ---

function StatCard({
  label,
  value,
  tone = "slate",
  subtitle,
}: {
  label: string;
  value: string;
  tone?: string;
  subtitle?: string;
}) {
  const borders: Record<string, string> = {
    slate: "border-l-slate-300",
    green: "border-l-emerald-300",
    amber: "border-l-amber-300",
    red: "border-l-red-300",
    blue: "border-l-blue-300",
    indigo: "border-l-indigo-300",
  };
  return (
    <div
      className={`rounded-2xl bg-white/90 p-5 shadow-sm border-l-4 ${borders[tone] || borders.slate}`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
      )}
    </div>
  );
}

// --- Candidate table ---

function CandidateRow({ candidate }: { candidate: Candidate }) {
  const req = findJobReq(candidate.jobReqId);
  const recruiter = findRecruiter(candidate.recruiterId);
  const scoreColor =
    candidate.aiMatchScore >= 90
      ? "text-emerald-600"
      : candidate.aiMatchScore >= 75
        ? "text-amber-600"
        : "text-red-600";
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <StatusDot status={candidate.status} />
          <span className="font-semibold text-slate-900">{candidate.fullName}</span>
        </div>
        <div className="text-xs text-slate-500 ml-6">
          {candidate.currentRole} at {candidate.currentCompany} · {candidate.location}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge tone={statusTone(candidate.status)}>
          {statusLabel(candidate.status)}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className={`font-bold ${scoreColor}`}>{candidate.aiMatchScore}</span>
        <span className="text-slate-400">/100</span>
      </td>
      <td className="py-3 px-4">
        <Badge tone={integrityTone(candidate.integrity.fraudRisk)}>
          {candidate.integrity.fraudRisk} risk
        </Badge>
        <div className="mt-1 text-xs text-slate-400">
          {candidate.integrity.identityStatus === "verified"
            ? "ID verified"
            : "ID follow-up"}
        </div>
        {candidate.integrity.nextReviewAt && (
          <div className="mt-1 text-xs font-medium text-amber-700">
            Review by {candidate.integrity.reviewOwner || "assigned recruiter"} ·{" "}
            {new Date(candidate.integrity.nextReviewAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {candidate.skills.slice(0, 3).map((s) => (
            <Badge key={s} tone="slate">
              {s}
            </Badge>
          ))}
          {candidate.skills.length > 3 && (
            <span className="text-xs text-slate-400">+{candidate.skills.length - 3}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 font-semibold text-slate-800">
        {formatCurrency(candidate.expectedSalary)}
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">{req?.title.split("(")[0].trim() || candidate.jobReqId}</td>
      <td className="py-3 px-4 text-sm text-slate-500">
        {recruiter?.fullName || candidate.recruiterId}
      </td>
    </tr>
  );
}

function CandidateTable() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Candidate Pipeline</h2>
        <span className="text-xs text-slate-500">
          {demoCandidates.length} candidates
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 px-4">Candidate</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">AI Score</th>
              <th className="py-2 px-4">Integrity</th>
              <th className="py-2 px-4">Skills</th>
              <th className="py-2 px-4">Expected</th>
              <th className="py-2 px-4">Req</th>
              <th className="py-2 px-4">Recruiter</th>
            </tr>
          </thead>
          <tbody>
            {[...demoCandidates]
              .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
              .map((c) => (
                <CandidateRow key={c.id} candidate={c} />
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Pipeline funnel ---

function PipelineStageBar({ stage }: { stage: typeof demoPipelineStages[number] }) {
  const maxCount = Math.max(...demoPipelineStages.map((s) => s.candidateCount));
  const pct = (stage.candidateCount / maxCount) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-slate-800">{stage.name}</span>
        <span className="text-slate-500">
          {stage.candidateCount} candidates · {stage.passRate}% pass
        </span>
      </div>
      <ProgressBar value={pct} color={stage.order <= 2 ? "indigo" : stage.order <= 4 ? "blue" : stage.candidateCount > 0 ? "emerald" : "slate" satisfies string} />
    </div>
  );
}

function PipelineView() {
  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Recruitment Funnel</h2>
      <div className="space-y-5">
        {demoPipelineStages.map((s) => (
          <PipelineStageBar key={s.name} stage={s} />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
        Total candidates:{" "}
        <span className="font-bold text-slate-800">
          {demoAnalytics.totalCandidates}
        </span>{" "}
        · Offer rate:{" "}
        <span className="font-bold text-emerald-600">
          {demoAnalytics.offerAcceptanceRate}%
        </span>
      </div>
    </Card>
  );
}

// --- Assessment analytics ---

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const candidate = demoCandidates.find((c) => c.id === assessment.candidateId);
  const resultColors: Record<string, string> = {
    pass: "border-l-emerald-400",
    marginal: "border-l-amber-400",
    fail: "border-l-red-400",
    pending: "border-l-slate-300",
  };
  const typeLabels: Record<string, string> = {
    coding: "Coding",
    system_design: "System Design",
    behavioral: "Behavioral",
    take_home: "Take-Home",
  };
  return (
    <div
      className={`rounded-xl border bg-white/80 p-4 border-l-4 ${resultColors[assessment.result] || resultColors.pending}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="font-semibold text-sm text-slate-900">
            {candidate?.fullName || assessment.candidateId}
          </span>
          <span className="text-xs text-slate-500 ml-2">
            {typeLabels[assessment.type] || assessment.type}
          </span>
        </div>
        <Badge
          tone={
            assessment.result === "pass"
              ? "green"
              : assessment.result === "marginal"
                ? "amber"
                : assessment.result === "fail"
                  ? "red"
                  : "slate"
          }
        >
          {assessment.result === "pending"
            ? "Pending"
            : `${assessment.score}/${assessment.maxScore}`}
        </Badge>
      </div>
      <p className="text-xs text-slate-500">{assessment.notes}</p>
      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">
          {assessment.humanReviewedAt ? "Human calibration" : "Calibration queue"}
          :
        </span>{" "}
        {assessment.calibrationNotes}
      </div>
      <div className="mt-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700">
        <span className="font-semibold">AI fluency signal:</span>{" "}
        {aiPolicyLabels[assessment.aiAssistancePolicy]} · {assessment.aiFluencyReview}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        Graded by {assessment.grader} ·{" "}
        {new Date(assessment.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </div>
    </div>
  );
}

function AssessmentSection() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Assessment Results</h2>
        <Badge tone="blue">{demoAssessments.length} assessments</Badge>
      </div>
      <div className="space-y-3">
        {demoAssessments.map((a) => (
          <AssessmentCard key={a.id} assessment={a} />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
        Pass rate:{" "}
        <span className="font-bold text-emerald-600">
          {demoAnalytics.assessmentPassRate}%
        </span>
      </div>
    </Card>
  );
}

// --- Activity feed ---

function ActivityFeed() {
  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {demoActivities.map((a) => {
          const candidate = demoCandidates.find((c) => c.id === a.candidateId);
          const dotColor =
            a.outcome === "positive"
              ? "bg-emerald-400"
              : a.outcome === "negative"
                ? "bg-red-400"
                : "bg-slate-300";
          return (
            <div key={a.id} className="flex gap-3 items-start">
              <span
                className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`}
              />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-sm text-slate-900">
                    {candidate?.fullName || a.candidateId}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(a.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{a.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --- Recruiter performance ---

function RecruiterCard({ recruiter }: { recruiter: Recruiter }) {
  return (
    <div className="rounded-2xl bg-white/90 p-5 shadow-sm border border-slate-100">
      <div className="font-bold text-slate-900">{recruiter.fullName}</div>
      <div className="text-xs text-slate-500 mb-3">{recruiter.role}</div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-slate-800">
            {recruiter.activeReqs}
          </div>
          <div className="text-xs text-slate-400">active reqs</div>
        </div>
        <div>
          <div className="text-lg font-bold text-slate-800">
            {recruiter.candidatesInPipeline}
          </div>
          <div className="text-xs text-slate-400">candidates</div>
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-600">
            {recruiter.hiresThisQuarter}
          </div>
          <div className="text-xs text-slate-400">hires Q2</div>
        </div>
        <div>
          <div className="text-lg font-bold text-slate-800">
            {recruiter.timeToFillAvg}d
          </div>
          <div className="text-xs text-slate-400">avg fill</div>
        </div>
      </div>
    </div>
  );
}

function TeamPerformance() {
  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900 mb-4">
        Recruiter Performance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {demoRecruiters.map((rep) => (
          <RecruiterCard key={rep.id} recruiter={rep} />
        ))}
      </div>
    </Card>
  );
}

// --- Job req summary ---

function JobReqCard({ req }: { req: typeof demoJobReqs[number] }) {
  const priorityBorder =
    req.priority === "high"
      ? "border-l-red-400"
      : req.priority === "medium"
        ? "border-l-amber-400"
        : "border-l-slate-300";
  const daysOpen = Math.floor(
    (Date.now() - new Date(req.openedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  return (
    <div
      className={`rounded-xl border bg-white/80 p-4 border-l-4 ${priorityBorder}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-slate-900">{req.title}</span>
        <Badge tone={req.priority === "high" ? "red" : req.priority === "medium" ? "amber" : "slate"}>
          {req.priority}
        </Badge>
      </div>
      <div className="text-xs text-slate-500 space-y-0.5">
        <div>
          {req.department} · {req.location}
        </div>
        <div>
          {req.hiredCount}/{req.candidatesNeeded} hired · {daysOpen} days open
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {req.requiredSkills.map((s) => (
            <Badge key={s} tone="slate">
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobReqSection() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Open Requisitions</h2>
        <Badge tone="blue">{demoJobReqs.length} open</Badge>
      </div>
      <div className="space-y-3">
        {demoJobReqs.map((r) => (
          <JobReqCard key={r.id} req={r} />
        ))}
      </div>
    </Card>
  );
}

// --- Main page ---

export default function Home() {
  const activeCandidates = demoCandidates.filter(
    (c) =>
      c.status !== "hired" && c.status !== "declined" && c.status !== "withdrawn",
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 px-6 py-8 font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Backend Java/Kotlin Recruiter
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          AI-powered candidate matching · skills assessment · pipeline analytics ·
          demo dashboard
        </p>
      </header>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Active Reqs"
          value={String(demoAnalytics.activeReqs)}
          tone="blue"
        />
        <StatCard
          label="Candidates"
          value={String(activeCandidates)}
          subtitle={`${demoAnalytics.totalCandidates} total`}
          tone="indigo"
        />
        <StatCard
          label="Avg Time-to-Fill"
          value={`${demoAnalytics.avgTimeToFill}d`}
          tone="amber"
        />
        <StatCard
          label="Offer Acceptance"
          value={`${demoAnalytics.offerAcceptanceRate}%`}
          tone="green"
        />
        <StatCard
          label="Assessment Pass"
          value={`${demoAnalytics.assessmentPassRate}%`}
          tone="blue"
        />
        <StatCard
          label="Avg Match Score"
          value={String(demoAnalytics.avgMatchScore)}
          tone="slate"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CandidateTable />
          <AssessmentSection />
          <TeamPerformance />
        </div>
        <div className="space-y-6">
          <JobReqSection />
          <PipelineView />
          <ActivityFeed />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        Backend Java/Kotlin Recruiter · Portfolio demonstration · All data is
        fictional · No production keys or network calls
      </footer>
    </div>
  );
}
