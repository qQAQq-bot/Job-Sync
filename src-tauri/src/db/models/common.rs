use serde_json::Value;
use time::format_description::well_known::Rfc3339;

pub(super) fn now_rfc3339() -> String {
  time::OffsetDateTime::now_utc().format(&Rfc3339).unwrap()
}

pub(super) fn json_get_str<'a>(value: &'a Value, path: &[&str]) -> Option<&'a str> {
  let mut cursor = value;
  for key in path {
    cursor = cursor.get(*key)?;
  }
  cursor.as_str()
}
