#[derive(Debug, Clone)]
pub struct ResumeEntry {
  pub title: String,
  pub meta: Option<String>,
  pub bullets: Vec<String>,
}

pub fn parse_entries(text: &str) -> Vec<ResumeEntry> {
  split_blocks(text).into_iter().filter_map(|block| parse_entry(&block)).collect()
}

pub fn extract_skill_items(text: &str) -> Vec<String> {
  let mut out: Vec<String> = Vec::new();
  for line in text.lines() {
    let trimmed = line.trim();
    if trimmed.is_empty() || is_label_line(trimmed) {
      continue;
    }
    let item = bullet_text(trimmed).unwrap_or_else(|| trimmed.to_string());
    let skill = item.trim();
    if skill.is_empty() || is_label_line(skill) {
      continue;
    }
    if out.iter().any(|it| it == skill) {
      continue;
    }
    out.push(skill.to_string());
  }
  out
}

pub fn first_non_empty_line(text: &str) -> Option<String> {
  text.lines().find_map(non_empty_trimmed).map(ToString::to_string)
}

pub fn non_empty_trimmed(input: &str) -> Option<&str> {
  let trimmed = input.trim();
  if trimmed.is_empty() { None } else { Some(trimmed) }
}

pub fn looks_like_name(value: &str) -> bool {
  let len = value.chars().count();
  len >= 2 && len <= 20 && !value.contains('@') && !value.contains('：') && !value.contains(':')
}

pub fn file_stem(path: &str) -> Option<String> {
  std::path::Path::new(path).file_stem().and_then(|it| it.to_str()).map(|it| it.trim().to_string())
}

pub fn escape_html(input: &str) -> String {
  input
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&#39;")
}

fn parse_entry(block: &[String]) -> Option<ResumeEntry> {
  let first = block.first()?.trim();
  if first.is_empty() {
    return None;
  }
  let mut meta = None;
  let mut bullets = Vec::new();
  for (index, line) in block.iter().enumerate().skip(1) {
    let trimmed = line.trim();
    if trimmed.is_empty() || is_label_line(trimmed) {
      continue;
    }
    if index == 1 && !is_bullet_line(trimmed) {
      meta = Some(trimmed.to_string());
      continue;
    }
    if let Some(item) = bullet_text(trimmed) {
      bullets.push(item);
    } else {
      bullets.push(trimmed.to_string());
    }
  }
  Some(ResumeEntry { title: first.to_string(), meta, bullets })
}

fn split_blocks(text: &str) -> Vec<Vec<String>> {
  let mut blocks = Vec::new();
  let mut current = Vec::new();
  for line in text.lines() {
    if line.trim().is_empty() {
      if !current.is_empty() {
        blocks.push(current);
        current = Vec::new();
      }
      continue;
    }
    current.push(line.trim().to_string());
  }
  if !current.is_empty() { blocks.push(current); }
  blocks
}

fn is_bullet_line(line: &str) -> bool {
  line.starts_with("- ") || line.starts_with("•") || line.starts_with("* ") || line.starts_with("▸") || line.starts_with("▶")
}

fn bullet_text(line: &str) -> Option<String> {
  for prefix in ["- ", "* ", "•", "▸", "▶"] {
    if let Some(rest) = line.strip_prefix(prefix) {
      return non_empty_trimmed(rest).map(ToString::to_string);
    }
  }
  None
}

fn is_label_line(line: &str) -> bool {
  let trimmed = line.trim();
  if trimmed.is_empty() {
    return false;
  }
  let keywords = ["职责与成果", "项目描述", "使用技术", "技术栈", "职责描述", "主要职责", "工作内容", "负责内容"];
  if keywords.iter().any(|it| trimmed == *it || trimmed == format!("{it}：") || trimmed == format!("{it}:")) {
    return true;
  }
  (trimmed.ends_with('：') || trimmed.ends_with(':')) && trimmed.chars().count() <= 12
}
