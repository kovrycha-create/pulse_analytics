export interface PageView {
  id: string;
  page: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
}

export interface PageSummaryData {
  page: string;
  views: number;
}
