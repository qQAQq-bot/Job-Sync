use std::path::{Path, PathBuf};

use pdfium_auto::bind_pdfium_silent;

fn first_resume_file_path(resume_files: &str) -> Option<PathBuf> {
  for part in resume_files.split(|ch| ch == '\n' || ch == '\r' || ch == ';') {
    let trimmed = part.trim();
    if !trimmed.is_empty() {
      return Some(PathBuf::from(trimmed));
    }
  }
  None
}

fn is_pdf_path(path: &Path) -> bool {
  path
    .extension()
    .and_then(|s| s.to_str())
    .map(|s| s.eq_ignore_ascii_case("pdf"))
    .unwrap_or(false)
}

fn extract_pdf_with_pdfium(path: &Path) -> Result<String, String> {
  let pdfium = bind_pdfium_silent().map_err(|e| format!("PDFium 不可用：{e}"))?;
  let document = pdfium
    .load_pdf_from_file(&path, None)
    .map_err(|e| format!("打开 PDF 失败：{e}"))?;

  let mut out = String::new();
  for (index, page) in document.pages().iter().enumerate() {
    let page_text = page
      .text()
      .map_err(|e| format!("提取 PDF 文本失败（第 {} 页）：{e}", index + 1))?
      .all();
    let chunk = page_text.trim();
    if chunk.is_empty() {
      continue;
    }
    if !out.is_empty() {
      out.push('\n');
    }
    out.push_str(chunk);
  }

  let trimmed = out.trim().to_string();
  if trimmed.is_empty() {
    return Err(format!(
      "PDF 未提取到可用文本（可能是扫描件/图片简历）：{}",
      path.display()
    ));
  }
  Ok(trimmed)
}

fn extract_pdf_with_pdf_extract(path: &Path) -> Result<String, String> {
  let text = match std::panic::catch_unwind(|| pdf_extract::extract_text(path)) {
    Ok(Ok(text)) => text,
    Ok(Err(e)) => return Err(format!("解析 PDF 失败：{e}")),
    Err(panic) => {
      let message = if let Some(s) = panic.downcast_ref::<&str>() {
        s.to_string()
      } else if let Some(s) = panic.downcast_ref::<String>() {
        s.clone()
      } else {
        "未知 panic".to_string()
      };
      return Err(format!("解析 PDF 失败（解析库异常）：{message}"));
    }
  };

  let trimmed = text.trim().to_string();
  if trimmed.is_empty() {
    return Err(format!(
      "PDF 未提取到可用文本（可能是扫描件/图片简历）：{}",
      path.display()
    ));
  }
  Ok(trimmed)
}

fn extract_pdf_resume_text(path: &Path) -> Result<String, String> {
  if !path.exists() {
    return Err(format!("PDF 文件不存在：{}", path.display()));
  }
  if !path.is_file() {
    return Err(format!("不是文件：{}", path.display()));
  }
  if !is_pdf_path(path) {
    return Err(format!("仅支持 PDF 文件：{}", path.display()));
  }

  let pdfium_err = match extract_pdf_with_pdfium(path) {
    Ok(text) => return Ok(text),
    Err(e) => e,
  };

  let pdf_extract_err = match extract_pdf_with_pdf_extract(path) {
    Ok(text) => return Ok(text),
    Err(e) => e,
  };

  Err(format!(
    "{pdfium_err}\n{pdf_extract_err}\n提示：该 PDF 可能是扫描件/图片或字体编码不规范；可尝试重新导出“可复制文本”的 PDF，或改用粘贴文本模式。",
  ))
}

pub fn resolve_resume_text(resume_text: &str, resume_files: Option<&str>) -> Result<String, String> {
  let trimmed_text = resume_text.trim();
  if !trimmed_text.is_empty() {
    return Ok(trimmed_text.to_string());
  }

  let files = resume_files.unwrap_or("").trim();
  let first_path = first_resume_file_path(files)
    .ok_or_else(|| "请选择 PDF 简历文件，或切换到“粘贴文本”。".to_string())?;
  extract_pdf_resume_text(&first_path)
}
