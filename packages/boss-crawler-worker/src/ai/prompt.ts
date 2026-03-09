export function buildAiPrompts(
  resumeText: string,
  jobDetail: unknown,
  contextText?: string,
  resumeFiles?: string,
): { system: string; user: string } {
  const system = [
    "你是一名严谨的招聘经理与简历教练。",
    "你必须输出严格 JSON（不要 Markdown，不要代码块，不要额外文本）。",
    "字符串值中不要出现未转义的英文双引号（\"）；如需引用请使用中文引号“”或用 \\\" 转义。",
    "你不能编造事实；只能基于简历原文与岗位信息给建议。",
  ].join("\n");

  const schemaHint = {
    matchScore: 0,
    strengths: ["..."],
    gaps: ["..."],
    keywordSuggestions: ["..."],
    resumeRewrite: {
      summaryRewrite: "...",
      experienceBulletsRewrite: ["..."],
    },
    riskNotes: ["..."],
  };

  const user = [
    "任务：基于【简历】与【岗位】做匹配分析与可执行改进建议。",
    "",
    "补充说明：你必须同时参考【当前情况说明】与【简历文件说明】；但不可把文件路径当作事实来源，只有简历原文里出现的内容才算事实。",
    "",
    "输出要求：只输出一个 JSON 对象，字段必须包含：",
    "matchScore（0-100 数字）、strengths（字符串数组）、gaps（字符串数组）、keywordSuggestions（字符串数组）、resumeRewrite（对象）、riskNotes（字符串数组）。",
    "",
    `输出示例结构（值可变）：${JSON.stringify(schemaHint)}`,
    "",
    "【当前情况说明】",
    (contextText ?? "").trim() || "（无）",
    "",
    "【简历文件说明】",
    (resumeFiles ?? "").trim() || "（无）",
    "",
    "【简历】",
    resumeText,
    "",
    "【岗位（原始 JSON）】",
    JSON.stringify(jobDetail),
  ].join("\n");

  return { system, user };
}

export function buildAiGroupPrompts(
  contextText: string,
  jobs: unknown,
): { system: string; user: string } {
  const system = [
    "你是一名严谨的职业规划顾问与简历教练。",
    "你必须输出严格 JSON（不要 Markdown，不要代码块，不要额外文本）。",
    "字符串值中不要出现未转义的英文双引号（\"）；如需引用请使用中文引号“”或用 \\\" 转义。",
    "你不能编造事实；只能基于当前情况说明与岗位摘要给建议。",
    "如果信息不足，你必须在 assumptions / questions 中明确指出，并用条件句给出分支建议。",
    "你必须对多个岗位做横向对比，并给出职位适配度排序。",
    "重要：你已经收到了完成任务所需的全部输入（当前情况说明 + 岗位列表摘要），禁止输出 meta/status/message/required_inputs 这类“等待输入”的占位结构。",
    "如果你还想问问题，只能把问题写进 questions 数组，但仍必须输出完整报告结构。",
  ].join("\n");

  const schemaHint = {
    summary: "...",
    jobRanking: [
      {
        encrypt_job_id: "...",
        position_name: "...",
        brand_name: "...",
        matchScore: 0,
        conclusion: "...",
        reasons: ["..."],
        risks: ["..."],
      },
    ],
    commonRequirements: {
      mustHave: ["..."],
      niceToHave: ["..."],
      responsibilities: ["..."],
      keywords: ["..."],
    },
    resumeStrategy: {
      positioning: "...",
      mustHighlight: ["..."],
      bullets: ["..."],
    },
    projectBoosters: [
      {
        title: "...",
        why: "...",
        deliverables: ["..."],
        resumeBullets: ["..."],
      },
    ],
    learningPlan: {
      p0: [{ topic: "...", why: "...", expectedOutput: ["..."] }],
      p1: [{ topic: "...", why: "...", expectedOutput: ["..."] }],
      p2: [{ topic: "...", why: "...", expectedOutput: ["..."] }],
    },
    assumptions: ["..."],
    questions: ["..."],
    riskNotes: ["..."],
    nextSteps: ["..."],
  };

  const user = [
    "任务：仅根据【当前情况说明】与【岗位列表（摘要）】生成一份综合分析报告。",
    "",
    "输出要求：只输出一个 JSON 对象，字段必须包含：",
    "summary、jobRanking、commonRequirements、resumeStrategy、projectBoosters、learningPlan、assumptions、questions、riskNotes、nextSteps。",
    "",
    "jobRanking 要按 matchScore 从高到低排序；每个岗位必须给出：matchScore、结论、理由、风险。",
    "jobRanking 必须覆盖岗位列表中的全部岗位：数量必须等于输入岗位数组长度；每个 encrypt_job_id 必须与输入一致且不重复；不得遗漏任何岗位。",
    "",
    "禁止输出：meta、status、message、required_inputs 等字段；不要要求用户再次提供信息。",
    "",
    `输出示例结构（值可变）：${JSON.stringify(schemaHint)}`,
    "",
    "【当前情况说明】",
    contextText.trim() || "（无）",
    "",
    "【岗位列表（摘要 JSON）】",
    JSON.stringify(jobs),
  ].join("\n");

  return { system, user };
}
