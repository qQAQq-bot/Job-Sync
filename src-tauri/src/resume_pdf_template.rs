use crate::{
  resume_pdf_support::{
    escape_html, extract_skill_items, file_stem, first_non_empty_line, looks_like_name, non_empty_trimmed,
    parse_entries, ResumeEntry,
  },
  resume_workspace::{ResumeBasicProfile, ResumeWorkspaceDraft},
};

pub fn build_resume_template_html(draft: &ResumeWorkspaceDraft, default_title: &str) -> String {
  let doc_title = escape_html(&resolve_title(draft, default_title));
  let profile_html = render_profile_section(&draft.basic_profile);
  let summary_html = render_summary(draft.summary.confirmed.as_deref());
  let skills_html = render_skills(draft.skills.confirmed.as_deref());
  let experience_html = render_entries("工作经历", draft.experience.confirmed.as_deref());
  let projects_html = render_entries("项目经历", draft.projects.confirmed.as_deref());

  format!(
    r#"<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>{doc_title}</title>
<style>
  :root {{ --navy:#274766; --navy-soft:#6d89a4; --line:#8fa7bc; --text:#1f2937; --muted:#5f7284; --bg:#ffffff; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--text); font-family:"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif; }}
  .page {{ padding:6mm 16mm 8mm; }}
  .top-bar, .bottom-bar {{ height:14px; background:var(--navy); }}
  .bottom-bar {{ margin-top:12px; }}
  .header-space {{ height: 0; }}
  .section {{ margin-top:10px; }}
  .page > .section:first-of-type {{ margin-top: 4px; }}
  .section-head {{ display:flex; align-items:center; gap:10px; }}
  .section-prefix {{ font-size:12px; font-weight:700; color:var(--navy-soft); letter-spacing:0.04em; }}
  .section-title {{ font-size:14px; font-weight:800; color:var(--navy); letter-spacing:0.02em; white-space:nowrap; }}
  .section-line {{ height:1px; flex:1; background:var(--line); transform:translateY(1px); }}
  .section-body {{ margin-top:7px; padding-left:28px; }}
  .summary-text {{ margin:0; font-size:12.5px; line-height:1.85; color:var(--text); white-space:pre-wrap; }}
  .profile-grid {{ display:grid; grid-template-columns: 1fr 104px; gap:12px; align-items:start; }}
  .photo-box {{ width:104px; height:132px; border:1px solid var(--line); background:#fff; }}
  .profile-fields {{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); column-gap:18px; row-gap:6px; }}
  .profile-item {{ display:grid; grid-template-columns: max-content 1fr; column-gap:2px; font-size:12.2px; line-height:1.7; }}
  .profile-label {{ color:var(--text); font-weight:700; white-space:nowrap; padding-right:1px; }}
  .profile-value {{ color:var(--text); min-height:1.7em; }}
  .skills-grid {{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); column-gap:30px; row-gap:6px; align-items:start; }}
  .skill-item {{ display:grid; grid-template-columns: 10px minmax(0,1fr); align-items:start; column-gap:8px; min-width:0; font-size:12.2px; line-height:1.72; color:var(--text); break-inside: avoid; }}
  .skill-dot {{ color:var(--navy-soft); font-weight:700; line-height:1.5; }}
  .skill-text {{ min-width:0; display:block; }}
  .entry {{ margin-top:9px; }}
  .entry:first-child {{ margin-top:0; }}
  .entry-title {{ font-size:12.8px; font-weight:800; color:var(--text); }}
  .entry-meta {{ margin-top:1px; font-size:11.2px; color:var(--muted); }}
  .entry-bullets {{ margin:4px 0 0; padding-left:18px; list-style-position:outside; }}
  .entry-bullets li {{ margin:3px 0; font-size:12.2px; line-height:1.8; color:var(--text); padding-left:2px; }}
</style>
</head>
<body>
  <div class="top-bar"></div>
  <main class="page">
    <div class="header-space"></div>
    {profile_html}
    {summary_html}
    {skills_html}
    {experience_html}
    {projects_html}
  </main>
  <div class="bottom-bar"></div>
</body>
</html>"#
  )
}

fn render_profile_section(profile: &ResumeBasicProfile) -> String {
  let left = render_profile_item("姓 名：", &profile.name);
  let right = render_profile_item("性 别：", &profile.gender);
  let birth = render_profile_item("年龄/生日：", &profile.birth_or_age);
  let edu = render_profile_item("学 历：", &profile.education);
  let phone = render_profile_item("电 话：", &profile.phone);
  let email = render_profile_item("邮 箱：", &profile.email);
  let body = format!(
    "<div class=\"profile-grid\"><div class=\"profile-fields\">{left}{right}{birth}{edu}{phone}{email}</div><div class=\"photo-box\"></div></div>"
  );
  render_section("个人信息", body)
}

fn render_profile_item(label: &str, value: &str) -> String {
  let safe = if value.trim().is_empty() { "&nbsp;".to_string() } else { escape_html(value) };
  format!("<div class=\"profile-item\"><div class=\"profile-label\">{}</div><div class=\"profile-value\">{}</div></div>", escape_html(label), safe)
}

fn resolve_title(draft: &ResumeWorkspaceDraft, default_title: &str) -> String {
  let from_profile = if draft.basic_profile.name.trim().is_empty() { None } else { Some(draft.basic_profile.name.trim().to_string()) };
  let from_resume = first_non_empty_line(&draft.original_resume_text).filter(|it| looks_like_name(it));
  let from_file = draft.original_resume_file.as_deref().and_then(file_stem).filter(|it: &String| !it.trim().is_empty());
  from_profile.or(from_resume).or(from_file).unwrap_or_else(|| default_title.to_string())
}


fn render_summary(content: Option<&str>) -> String {
  let Some(text) = content.and_then(non_empty_trimmed) else { return String::new(); };
  render_section("个人简介", format!("<p class=\"summary-text\">{}</p>", escape_html(text)))
}

fn render_skills(content: Option<&str>) -> String {
  let Some(text) = content.and_then(non_empty_trimmed) else { return String::new(); };
  let items = extract_skill_items(text);
  if items.is_empty() { return String::new(); }
  let list = items.into_iter().map(|it| format!("<div class=\"skill-item\"><span class=\"skill-dot\">›</span><span class=\"skill-text\">{}</span></div>", escape_html(&it))).collect::<Vec<_>>().join("");
  render_section("技能清单", format!("<div class=\"skills-grid\">{list}</div>"))
}

fn render_entries(title: &str, content: Option<&str>) -> String {
  let Some(text) = content.and_then(non_empty_trimmed) else { return String::new(); };
  let entries = parse_entries(text);
  if entries.is_empty() { return String::new(); }
  let body = entries.into_iter().map(render_entry).collect::<Vec<_>>().join("");
  render_section(title, body)
}

fn render_section(title: &str, body: String) -> String {
  format!("<section class=\"section\"><div class=\"section-head\"><span class=\"section-prefix\">&lt;&lt;&lt;</span><span class=\"section-title\">{}</span><div class=\"section-line\"></div></div><div class=\"section-body\">{}</div></section>", escape_html(title), body)
}

fn render_entry(entry: ResumeEntry) -> String {
  let meta = entry.meta.as_deref().map(|it| format!("<div class=\"entry-meta\">{}</div>", escape_html(it))).unwrap_or_default();
  let bullets = if entry.bullets.is_empty() {
    String::new()
  } else {
    let items = entry.bullets.iter().map(|it| format!("<li>{}</li>", escape_html(it))).collect::<Vec<_>>().join("");
    format!("<ul class=\"entry-bullets\">{items}</ul>")
  };
  format!("<article class=\"entry\"><div class=\"entry-title\">{}</div>{meta}{bullets}</article>", escape_html(&entry.title))
}
