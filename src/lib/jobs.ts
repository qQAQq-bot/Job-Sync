export interface KeywordGroup {
  keyword: string | null;
  label: string;
  job_count: number;
}

export interface JobRow {
  encrypt_job_id: string;
  position_name: string | null;
  boss_name: string | null;
  brand_name: string | null;
  city_name: string | null;
  salary_desc: string | null;
  experience_name: string | null;
  degree_name: string | null;
  last_seen_at: string | null;
}

export interface JobDetail {
  securityId?: string;
  lid?: string;
  jobInfo?: {
    jobName?: string;
    positionName?: string;
    postDescription?: string;
    address?: string;
    cityName?: string;
    locationName?: string;
    salaryDesc?: string;
    experienceName?: string;
    degreeName?: string;
    skills?: string[];
    showSkills?: string[];
    jobLabels?: string[];
    jobStatusDesc?: string;
  };
  brandInfo?: {
    brandName?: string;
    industryName?: string;
    scaleName?: string;
    stage?: string;
  };
  brandComInfo?: {
    brandName?: string;
    industryName?: string;
    scaleName?: string;
    stageName?: string;
  };
  bossInfo?: {
    bossName?: string;
    bossTitle?: string;
    name?: string;
    title?: string;
    activeTimeDesc?: string;
  };
  [key: string]: unknown;
}

export interface LoadKeywordOptions {
  preserveExpanded?: boolean;
  refreshExpandedList?: boolean;
}
