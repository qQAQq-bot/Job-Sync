export type ResumeModuleKind = "summary" | "projects" | "experience" | "skills";

export function buildResumeDiagnosisPrompts(
  resumeText: string,
  contextText?: string,
  resumeFiles?: string,
): { system: string; user: string } {
  const system = [
    "你是一名严谨的招聘经理、简历教练与求职顾问。",
    "你必须输出严格 JSON，不要 Markdown，不要代码块，不要额外解释。",
    "你不能编造事实；只能基于用户提供的原始简历、补充说明和文件说明给建议。",
  ].join("\n");

  const schema = {
    overall_summary: "",
    summary: { assessment: "", missing_info: [""], suggestions: [""] },
    projects: { assessment: "", missing_info: [""], suggestions: [""] },
    experience: { assessment: "", missing_info: [""], suggestions: [""] },
    skills: { assessment: "", missing_info: [""], suggestions: [""] },
    next_steps: [""],
  };

  const user = [
    "任务：先诊断这份原始简历，不要直接重写整份简历。",
    "请围绕四个模块输出结构化诊断：个人简介、项目经历、工作经历、技能清单。",
    "",
    "输出要求：只输出一个 JSON 对象，字段必须包含：overall_summary、summary、projects、experience、skills、next_steps。",
    `输出结构示例：${JSON.stringify(schema)}`,
    "每个模块都要包含 assessment、missingInfo、suggestions。",
    "missingInfo 用来指出用户后续还应补充哪些信息。",
    "",
    "【当前情况说明】",
    (contextText ?? "").trim() || "（无）",
    "",
    "【简历文件说明】",
    (resumeFiles ?? "").trim() || "（无）",
    "",
    "【原始简历】",
    resumeText,
  ].join("\n");

  return { system, user };
}

function moduleLabel(module: ResumeModuleKind): string {
  switch (module) {
    case "summary":
      return "个人简介";
    case "projects":
      return "项目经历";
    case "experience":
      return "工作经历";
    case "skills":
      return "技能清单";
  }
}

export function buildResumeModuleRewritePrompts(args: {
  module: ResumeModuleKind;
  resumeText: string;
  moduleInput: string;
  contextText?: string;
  confirmedModules?: Partial<Record<ResumeModuleKind, string | undefined>>;
}): { system: string; user: string } {
  const system = [
    "你是一名严谨的招聘经理、简历教练与求职顾问。",
    "你必须输出严格 JSON，不要 Markdown 代码块，不要多余解释。",
    "不能编造事实，只能基于原始简历、用户补充内容、已确认模块来改写。",
    "输出的是某一个模块的候选改写，不是整份简历。",
  ].join("\n");

  const schema = {
    module: args.module,
    candidate: "",
    notes: [""],
    checklist: [""],
  };

  const confirmed = Object.entries(args.confirmedModules ?? {})
    .filter(([, value]) => value && value.trim())
    .map(([key, value]) => `【${moduleLabel(key as ResumeModuleKind)}】\n${value}`)
    .join("\n\n");

  const user = [
    `任务：针对【${moduleLabel(args.module)}】生成一版候选改写稿。`,
    "要求：输出结果应更职业化、更适合招聘场景，但不能捏造原始简历里没有、且用户也没补充过的事实。",
    "如果信息仍然不足，可以给出 notes 和 checklist。",
    "",
    "输出要求：只输出一个 JSON 对象，字段必须包含：module、candidate、notes、checklist。",
    `输出结构示例：${JSON.stringify(schema)}`,
    "",
    "【当前情况说明】",
    (args.contextText ?? "").trim() || "（无）",
    "",
    "【已确认模块（可复用上下文）】",
    confirmed || "（无）",
    "",
    "【用户刚补充的内容】",
    args.moduleInput.trim(),
    "",
    "【原始简历】",
    args.resumeText,
  ].join("\n");

  return { system, user };
}
