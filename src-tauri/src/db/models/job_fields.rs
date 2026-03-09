use serde_json::Value;

use super::common::json_get_str;

#[derive(Debug, Default)]
pub(super) struct JobFields {
  pub position_name: Option<String>,
  pub boss_name: Option<String>,
  pub brand_name: Option<String>,
  pub city_name: Option<String>,
  pub salary_desc: Option<String>,
  pub experience_name: Option<String>,
  pub degree_name: Option<String>,
}

pub(super) fn extract_job_fields_from_list_item(item: &Value) -> JobFields {
  JobFields {
    position_name: json_get_str(item, &["jobName"])
      .or_else(|| json_get_str(item, &["jobInfo", "jobName"]))
      .or_else(|| json_get_str(item, &["positionName"]))
      .or_else(|| json_get_str(item, &["jobInfo", "positionName"]))
      .or_else(|| json_get_str(item, &["positionName"]))
      .map(|value| value.to_string()),
    boss_name: json_get_str(item, &["bossName"])
      .or_else(|| json_get_str(item, &["bossInfo", "name"]))
      .or_else(|| json_get_str(item, &["bossInfo", "bossName"]))
      .or_else(|| json_get_str(item, &["bossName"]))
      .map(|value| value.to_string()),
    brand_name: json_get_str(item, &["brandName"])
      .or_else(|| json_get_str(item, &["brandInfo", "brandName"]))
      .or_else(|| json_get_str(item, &["brandComInfo", "brandName"]))
      .or_else(|| json_get_str(item, &["bossInfo", "brandName"]))
      .or_else(|| json_get_str(item, &["brandName"]))
      .map(|value| value.to_string()),
    city_name: json_get_str(item, &["cityName"])
      .or_else(|| json_get_str(item, &["jobInfo", "cityName"]))
      .or_else(|| json_get_str(item, &["jobInfo", "locationName"]))
      .or_else(|| json_get_str(item, &["locationName"]))
      .or_else(|| json_get_str(item, &["cityName"]))
      .map(|value| value.to_string()),
    salary_desc: json_get_str(item, &["salaryDesc"])
      .or_else(|| json_get_str(item, &["jobInfo", "salaryDesc"]))
      .or_else(|| json_get_str(item, &["salaryDesc"]))
      .map(|value| value.to_string()),
    experience_name: json_get_str(item, &["jobExperience"])
      .or_else(|| json_get_str(item, &["experienceName"]))
      .or_else(|| json_get_str(item, &["jobInfo", "experienceName"]))
      .or_else(|| json_get_str(item, &["jobExperience"]))
      .map(|value| value.to_string()),
    degree_name: json_get_str(item, &["jobDegree"])
      .or_else(|| json_get_str(item, &["degreeName"]))
      .or_else(|| json_get_str(item, &["jobInfo", "degreeName"]))
      .or_else(|| json_get_str(item, &["jobDegree"]))
      .map(|value| value.to_string()),
  }
}

pub(super) fn extract_job_fields_from_detail(zp_data: &Value) -> JobFields {
  JobFields {
    position_name: json_get_str(zp_data, &["jobInfo", "jobName"])
      .or_else(|| json_get_str(zp_data, &["jobName"]))
      .or_else(|| json_get_str(zp_data, &["jobInfo", "positionName"]))
      .or_else(|| json_get_str(zp_data, &["positionName"]))
      .or_else(|| json_get_str(zp_data, &["jobName"]))
      .map(|value| value.to_string()),
    boss_name: json_get_str(zp_data, &["bossInfo", "name"])
      .or_else(|| json_get_str(zp_data, &["bossInfo", "bossName"]))
      .or_else(|| json_get_str(zp_data, &["bossName"]))
      .map(|value| value.to_string()),
    brand_name: json_get_str(zp_data, &["brandComInfo", "brandName"])
      .or_else(|| json_get_str(zp_data, &["brandInfo", "brandName"]))
      .or_else(|| json_get_str(zp_data, &["bossInfo", "brandName"]))
      .or_else(|| json_get_str(zp_data, &["brandName"]))
      .map(|value| value.to_string()),
    city_name: json_get_str(zp_data, &["jobInfo", "locationName"])
      .or_else(|| json_get_str(zp_data, &["jobInfo", "cityName"]))
      .or_else(|| json_get_str(zp_data, &["locationName"]))
      .or_else(|| json_get_str(zp_data, &["cityName"]))
      .map(|value| value.to_string()),
    salary_desc: json_get_str(zp_data, &["jobInfo", "salaryDesc"])
      .or_else(|| json_get_str(zp_data, &["salaryDesc"]))
      .map(|value| value.to_string()),
    experience_name: json_get_str(zp_data, &["jobInfo", "experienceName"])
      .or_else(|| json_get_str(zp_data, &["experienceName"]))
      .or_else(|| json_get_str(zp_data, &["jobExperience"]))
      .map(|value| value.to_string()),
    degree_name: json_get_str(zp_data, &["jobInfo", "degreeName"])
      .or_else(|| json_get_str(zp_data, &["degreeName"]))
      .or_else(|| json_get_str(zp_data, &["jobDegree"]))
      .map(|value| value.to_string()),
  }
}
