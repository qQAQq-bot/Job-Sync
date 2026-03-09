import { z } from "zod";

export const AiResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  keywordSuggestions: z.array(z.string()),
  resumeRewrite: z
    .object({
      summaryRewrite: z.string().optional(),
      experienceBulletsRewrite: z.array(z.string()).optional(),
    })
    .optional(),
  riskNotes: z.array(z.string()),
});

export const AiGroupResultSchema = z.object({
  summary: z.string(),
  jobRanking: z
    .array(
      z.object({
        encrypt_job_id: z.string().min(1),
        position_name: z.string().optional(),
        brand_name: z.string().optional(),
        matchScore: z.number().min(0).max(100),
        conclusion: z.string(),
        reasons: z.array(z.string()),
        risks: z.array(z.string()),
      }),
    )
    .min(1),
  commonRequirements: z.object({
    mustHave: z.array(z.string()),
    niceToHave: z.array(z.string()),
    responsibilities: z.array(z.string()),
    keywords: z.array(z.string()),
  }),
  resumeStrategy: z.object({
    positioning: z.string(),
    mustHighlight: z.array(z.string()),
    bullets: z.array(z.string()),
  }),
  projectBoosters: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      deliverables: z.array(z.string()),
      resumeBullets: z.array(z.string()),
    }),
  ),
  learningPlan: z.object({
    p0: z.array(z.object({ topic: z.string(), why: z.string(), expectedOutput: z.array(z.string()) })),
    p1: z.array(z.object({ topic: z.string(), why: z.string(), expectedOutput: z.array(z.string()) })),
    p2: z.array(z.object({ topic: z.string(), why: z.string(), expectedOutput: z.array(z.string()) })),
  }),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
  riskNotes: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

