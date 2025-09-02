export interface PageView {
  id: string;
  page: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
  type?: 'pageview' | 'page_unload' | 'custom_event' | 'outbound_click';
  screen?: { width: number; height: number };
  viewport?: { width: number; height: number };
  deviceType?: string;
  performance?: Record<string, any>;
  timeOnPage?: number; // seconds
  scrollDepth?: number; // percent
  eventName?: string;
  properties?: Record<string, any>;
  sessionId?: string;
}

export interface PageSummaryData {
  page: string;
  views: number;
}
