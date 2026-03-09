use super::{init_db, models};

#[test]
fn init_and_upsert_job_works() {
  let tmp = tempfile::tempdir().expect("tempdir");
  let app_data_dir = tmp.path().join("app-data");
  let conn = init_db(&app_data_dir).expect("init db");

  let encrypt_job_id = "encrypt_123";
  let zp_data_json = r#"
    {
      "jobInfo": {
        "positionName": "Rust 开发",
        "salaryDesc": "20-40K",
        "experienceName": "3-5 年",
        "degreeName": "本科",
        "cityName": "北京"
      },
      "brandInfo": {
        "brandName": "某某科技"
      }
    }
  "#;

  models::upsert_job_from_detail(&conn, encrypt_job_id, zp_data_json).expect("upsert job");

  let mut stmt = conn
    .prepare("SELECT position_name, brand_name FROM job WHERE encrypt_job_id = ?1")
    .expect("prepare");
  let (position_name, brand_name): (Option<String>, Option<String>) = stmt
    .query_row([encrypt_job_id], |row| Ok((row.get(0)?, row.get(1)?)))
    .expect("query row");

  assert_eq!(position_name.as_deref(), Some("Rust 开发"));
  assert_eq!(brand_name.as_deref(), Some("某某科技"));

  let mut stmt = conn
    .prepare("SELECT fetched_at FROM job_detail_raw WHERE encrypt_job_id = ?1")
    .expect("prepare raw");
  let fetched_at: String = stmt
    .query_row([encrypt_job_id], |row| row.get(0))
    .expect("query raw");
  assert!(!fetched_at.is_empty());
}

#[test]
fn job_fts_is_created_and_searchable() {
  let tmp = tempfile::tempdir().expect("tempdir");
  let app_data_dir = tmp.path().join("app-data");
  let conn = init_db(&app_data_dir).expect("init db");

  let encrypt_job_id = "encrypt_fts_1";
  let zp_data_json = r#"
    {
      "jobInfo": {
        "positionName": "Rust 开发工程师",
        "salaryDesc": "20-40K",
        "experienceName": "3-5 年",
        "degreeName": "本科",
        "cityName": "北京"
      },
      "brandInfo": {
        "brandName": "某某科技"
      }
    }
  "#;

  models::upsert_job_from_detail(&conn, encrypt_job_id, zp_data_json).expect("upsert job");

  let fts_row_count: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM job_fts WHERE encrypt_job_id = ?1",
      [encrypt_job_id],
      |row| row.get(0),
    )
    .expect("query job_fts");
  assert_eq!(fts_row_count, 1);

  let match_query = "\"Rust\"";
  let match_count: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM job_fts WHERE job_fts MATCH ?1",
      [match_query],
      |row| row.get(0),
    )
    .expect("fts match");
  assert_eq!(match_count, 1);
}
