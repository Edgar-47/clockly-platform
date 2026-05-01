export type PlanType = "free" | "pro" | "business";

export interface PlanFeatures {
  has_exports: boolean;
  has_advanced_filters: boolean;
  has_multi_location: boolean;
  has_geolocation: boolean;
  has_admin_reports: boolean;
  has_support: boolean;
}

export interface PlanDefinition extends PlanFeatures {
  code: PlanType;
  name: string;
  description: string;
  max_employees: number | null;
  cta_label: string;
  recommended: boolean;
  custom_onboarding: boolean;
  features: PlanFeatures;
  feature_labels: string[];
}

export interface PlanListResponse {
  items: PlanDefinition[];
}

export interface CompanyPlanContext extends PlanFeatures {
  plan_type: PlanType;
  plan_name: string;
  max_employees: number | null;
  trial_ends_at: string | null;
  is_active_subscription: boolean;
  is_beta_user: boolean;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean;
  created_by: string | null;
}
