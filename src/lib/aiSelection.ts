import { ref } from "vue";

export type AiJobLite = {
  encrypt_job_id: string;
  position_name: string | null;
  boss_name: string | null;
  brand_name: string | null;
  city_name: string | null;
  salary_desc: string | null;
  experience_name: string | null;
  degree_name: string | null;
};

export const aiSelectedJobs = ref<AiJobLite[]>([]);

export function hasAiSelectedJob(jobId: string): boolean {
  return aiSelectedJobs.value.some((j) => j.encrypt_job_id === jobId);
}

function mergeAiJob(existing: AiJobLite, incoming: AiJobLite): AiJobLite {
  return {
    encrypt_job_id: existing.encrypt_job_id,
    position_name: incoming.position_name ?? existing.position_name,
    boss_name: incoming.boss_name ?? existing.boss_name,
    brand_name: incoming.brand_name ?? existing.brand_name,
    city_name: incoming.city_name ?? existing.city_name,
    salary_desc: incoming.salary_desc ?? existing.salary_desc,
    experience_name: incoming.experience_name ?? existing.experience_name,
    degree_name: incoming.degree_name ?? existing.degree_name,
  };
}

export function upsertAiSelectedJob(job: AiJobLite): void {
  const idx = aiSelectedJobs.value.findIndex((j) => j.encrypt_job_id === job.encrypt_job_id);
  if (idx === -1) {
    aiSelectedJobs.value.push(job);
    return;
  }
  aiSelectedJobs.value[idx] = mergeAiJob(aiSelectedJobs.value[idx], job);
}

export function removeAiSelectedJob(jobId: string): void {
  aiSelectedJobs.value = aiSelectedJobs.value.filter((j) => j.encrypt_job_id !== jobId);
}

export function clearAiSelectedJobs(): void {
  aiSelectedJobs.value = [];
}
