use rusqlite::OptionalExtension;
use serde_json::Value;
use sha2::Digest;
use time::format_description::well_known::Rfc3339;

pub(super) fn now_rfc3339() -> String {
  time::OffsetDateTime::now_utc().format(&Rfc3339).unwrap()
}

pub(super) fn sha256_hex(input: &str) -> String {
  let mut hasher = sha2::Sha256::new();
  hasher.update(input.as_bytes());
  hex::encode(hasher.finalize())
}

pub(super) fn build_group_encrypt_job_id(sorted_job_ids: &[String]) -> String {
  let mut hasher = sha2::Sha256::new();
  for id in sorted_job_ids {
    hasher.update(id.as_bytes());
    hasher.update(b"\n");
  }
  format!("group:{}", hex::encode(hasher.finalize()))
}

pub(super) fn sha256_hex_job_details(details: &[(String, String)]) -> String {
  let mut hasher = sha2::Sha256::new();
  for (id, raw) in details {
    hasher.update(id.as_bytes());
    hasher.update(b"\n");
    hasher.update(raw.as_bytes());
    hasher.update(b"\n");
  }
  hex::encode(hasher.finalize())
}

fn json_get_str<'a>(value: &'a Value, path: &[&str]) -> Option<&'a str> {
  let mut cursor = value;
  for key in path {
    cursor = cursor.get(*key)?;
  }
  cursor.as_str()
}

fn json_get_str_array(value: &Value, path: &[&str]) -> Vec<String> {
  let mut cursor = value;
  for key in path {
    match cursor.get(*key) {
      Some(next) => cursor = next,
      None => return Vec::new(),
    }
  }

  match cursor.as_array() {
    None => Vec::new(),
    Some(items) => items
      .iter()
      .filter_map(|item| item.as_str())
      .map(str::trim)
      .filter(|item| !item.is_empty())
      .map(|item| item.to_string())
      .collect(),
  }
}

fn strip_html_tags(input: &str) -> String {
  let mut out = String::with_capacity(input.len());
  let mut in_tag = false;
  for ch in input.chars() {
    match ch {
      '<' => in_tag = true,
      '>' => {
        in_tag = false;
        out.push(' ');
      }
      _ => {
        if !in_tag {
          out.push(ch);
        }
      }
    }
  }
  out
}

fn collapse_whitespace(input: &str) -> String {
  let mut out = String::with_capacity(input.len());
  let mut prev_space = false;
  for ch in input.chars() {
    if ch.is_whitespace() {
      if !prev_space {
        out.push(' ');
        prev_space = true;
      }
      continue;
    }
    prev_space = false;
    out.push(ch);
  }
  out.trim().to_string()
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
  if max_chars == 0 {
    return String::new();
  }

  let mut out = String::with_capacity(input.len().min(max_chars + 1));
  for (index, ch) in input.chars().enumerate() {
    if index >= max_chars {
      out.push('…');
      break;
    }
    out.push(ch);
  }
  out
}

fn html_to_text_truncated(input: &str, max_chars: usize) -> String {
  let stripped = strip_html_tags(input);
  let collapsed = collapse_whitespace(&stripped);
  truncate_chars(&collapsed, max_chars)
}

pub(super) fn build_job_outline(encrypt_job_id: &str, zp_data: &Value) -> Value {
  let position_name = json_get_str(zp_data, &["jobInfo", "jobName"])
    .or_else(|| json_get_str(zp_data, &["jobName"]))
    .or_else(|| json_get_str(zp_data, &["jobInfo", "positionName"]))
    .or_else(|| json_get_str(zp_data, &["positionName"]))
    .map(|value| value.to_string());
  let brand_name = json_get_str(zp_data, &["brandComInfo", "brandName"])
    .or_else(|| json_get_str(zp_data, &["brandInfo", "brandName"]))
    .or_else(|| json_get_str(zp_data, &["brandName"]))
    .map(|value| value.to_string());
  let city_name = json_get_str(zp_data, &["jobInfo", "locationName"])
    .or_else(|| json_get_str(zp_data, &["jobInfo", "cityName"]))
    .or_else(|| json_get_str(zp_data, &["locationName"]))
    .or_else(|| json_get_str(zp_data, &["cityName"]))
    .map(|value| value.to_string());
  let salary_desc = json_get_str(zp_data, &["jobInfo", "salaryDesc"])
    .or_else(|| json_get_str(zp_data, &["salaryDesc"]))
    .map(|value| value.to_string());
  let experience_name = json_get_str(zp_data, &["jobInfo", "experienceName"])
    .or_else(|| json_get_str(zp_data, &["experienceName"]))
    .or_else(|| json_get_str(zp_data, &["jobExperience"]))
    .map(|value| value.to_string());
  let degree_name = json_get_str(zp_data, &["jobInfo", "degreeName"])
    .or_else(|| json_get_str(zp_data, &["degreeName"]))
    .or_else(|| json_get_str(zp_data, &["jobDegree"]))
    .map(|value| value.to_string());

  let mut skills = json_get_str_array(zp_data, &["jobInfo", "skills"]);
  if skills.is_empty() {
    skills = json_get_str_array(zp_data, &["jobInfo", "showSkills"]);
  }
  if skills.is_empty() {
    skills = json_get_str_array(zp_data, &["skills"]);
  }

  let mut job_labels = json_get_str_array(zp_data, &["jobInfo", "jobLabels"]);
  if job_labels.is_empty() {
    job_labels = json_get_str_array(zp_data, &["jobLabels"]);
  }

  let post_desc_raw = json_get_str(zp_data, &["jobInfo", "postDescription"])
    .or_else(|| json_get_str(zp_data, &["postDescription"]))
    .unwrap_or("");
  let post_description = if post_desc_raw.trim().is_empty() {
    None
  } else {
    Some(html_to_text_truncated(post_desc_raw, 2000))
  };

  serde_json::json!({
    "encrypt_job_id": encrypt_job_id,
    "position_name": position_name,
    "brand_name": brand_name,
    "city_name": city_name,
    "salary_desc": salary_desc,
    "experience_name": experience_name,
    "degree_name": degree_name,
    "skills": skills,
    "job_labels": job_labels,
    "post_description": post_description,
  })
}

pub(super) fn describe_job_brief(
  conn: &rusqlite::Connection,
  encrypt_job_id: &str,
) -> Option<String> {
  let row: Option<(Option<String>, Option<String>, Option<String>, Option<String>)> = conn
    .query_row(
      "SELECT position_name, brand_name, city_name, salary_desc FROM job WHERE encrypt_job_id = ?1",
      [encrypt_job_id],
      |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    )
    .optional()
    .ok()
    .flatten();

  let Some((position_name, brand_name, city_name, salary_desc)) = row else {
    return None;
  };

  let title = position_name
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(encrypt_job_id);

  let mut parts: Vec<&str> = Vec::new();
  if let Some(value) = brand_name.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
    parts.push(value);
  }
  if let Some(value) = city_name.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
    parts.push(value);
  }
  if let Some(value) = salary_desc.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
    parts.push(value);
  }

  if parts.is_empty() {
    return Some(title.to_string());
  }

  Some(format!("{title}（{}）", parts.join(" · ")))
}

pub(super) fn load_job_detail_raw(
  conn: &rusqlite::Connection,
  encrypt_job_id: &str,
) -> Result<String, String> {
  conn
    .query_row(
      "SELECT zp_data_json FROM job_detail_raw WHERE encrypt_job_id = ?1",
      [encrypt_job_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?
    .ok_or_else(|| {
      "未找到该职位的详情数据，请先采集该职位详情（在职位库展开该职位或运行自动采集）后再进行 AI 分析。".to_string()
    })
}
