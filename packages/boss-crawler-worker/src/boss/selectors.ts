export const URLS = {
  USER: "https://www.zhipin.com/web/user/",
  DESKTOP: "https://www.zhipin.com/desktop/",
  GEEK_JOBS: "https://www.zhipin.com/web/geek/jobs",
} as const;

export const API_PATH = {
  USER_INFO: "/wapi/zpuser/wap/getUserInfo.json",
  JOB_LIST: "/wapi/zpgeek/search/joblist.json",
  JOB_LIST_RECOMMEND: "/wapi/zpgeek/pc/recommend/job/list.json",
  JOB_DETAIL: "/wapi/zpgeek/job/detail.json",
  CITY_GROUP: "/wapi/zpCommon/data/cityGroup.json",
  FILTER_CONDITIONS: "/wapi/zpgeek/pc/all/filter/conditions.json",
  INDUSTRY_FILTER_EXEMPTION: "/wapi/zpCommon/data/industryFilterExemption",
} as const;

export const SEARCH_INPUT_SELECTORS: string[] = [
  "input.ipt-search",
  'input[placeholder*="搜索"]',
  'input[placeholder*="职位"]',
  'input[type="text"]',
];

export const JOB_CARD_SELECTORS: string[] = [
  ".job-card-wrapper",
  ".job-card",
  'li[class*="job"]',
];
