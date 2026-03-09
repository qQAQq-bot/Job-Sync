export type KindFilter = "all" | "group" | "resume";

export interface AiReportMeta {
  id: number;
  kind: "group" | "resume";
  encrypt_job_id: string;
  title: string;
  created_at: string;
  match_score: number | null;
  jobs_count: number | null;
}

