export type SidecarEvent =
  | {
      type: "LOG";
      payload: { level: string; message: string; ts?: string };
    }
  | {
      type: "PROGRESS";
      payload: {
        keyword?: string;
        current_page?: number;
        captured_job_list?: number;
        captured_job_detail?: number;
      };
    }
  | {
      type: "LOGIN_STATUS";
      payload: { status: string; message?: string };
    }
  | {
      type: "COOKIE_COLLECTED";
      payload: { cookies: unknown; local_storage: unknown };
    }
  | {
      type: "JOB_LIST_CAPTURED";
      payload: { keyword?: string; filters?: unknown; raw: unknown };
    }
  | {
      type: "JOB_DETAIL_CAPTURED";
      payload: { encrypt_job_id: string; zp_data: unknown };
    }
  | { type: "AI_RESULT"; payload: { result: unknown } }
  | {
      type: "BOSS_META_SYNCED";
      payload: {
        synced_at?: string;
        city_group?: unknown;
        filter_conditions?: unknown;
        industry_filter_exemption?: unknown;
      };
    }
  | { type: "FINISHED" }
  | {
      type: "ERROR";
      payload: { message: string; stack?: string };
    };
