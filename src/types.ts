/**
 * Common types for Backwork SDK
 */

export interface BackworkConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    hint?: string;
    details?: Record<string, any>;
    docUrl?: string;
  };
  meta?: {
    request_id?: string;
    timestamp?: string;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface Pagination {
  cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  checks: {
    database: {
      status: string;
      latency_ms?: number;
    };
    redis: {
      status: string;
    };
    redis_cache: {
      status: string;
    };
  };
  timestamp: string;
}

export type CodeSystem = 'CPT' | 'HCPCS' | 'ICD10CM' | 'ICD10PCS' | 'NDC' | 'UNKNOWN' | 'unknown';

export interface CodeLookupData {
  code: string;
  code_system: CodeSystem;
  found: boolean;
  description: string | null;
  short_description?: string | null;
  category?: string | null;
  betos_code?: string | null;
  poa_exempt?: boolean | null;
  is_active?: boolean | null;
  rvu?: RvuData;
  policies?: PolicyMatch[];
  suggestions?: CodeSuggestion[];
  negotiated_rates?: NegotiatedRateSummary;
  ndc_crosswalk?: NdcCrosswalk;
}

export interface NegotiatedRateSummary {
  min_rate?: string | null;
  max_rate?: string | null;
  avg_rate?: string | null;
  num_rates?: number;
}

export interface RvuData {
  work_rvu?: string | null;
  pe_rvu_nonfacility?: string | null;
  pe_rvu_facility?: string | null;
  mp_rvu?: string | null;
  total_rvu_nonfacility?: string | null;
  total_rvu_facility?: string | null;
  non_facility_price?: string | null;
  facility_price?: string | null;
  conversion_factor?: string | null;
  global_days?: string | null;
  status_code?: string | null;
  year?: number;
}

export interface PolicyMatch {
  policy_id: string;
  title: string;
  policy_type: string;
  disposition: 'covered' | 'not_covered' | 'conditional' | 'requires_pa';
  jurisdiction?: string | null;
  effective_date?: string | null;
}

export interface CodeSuggestion {
  code: string;
  code_system: string;
  description?: string | null;
  score: number;
  match_type: 'code' | 'description';
}

export interface NdcCrosswalk {
  ndc: string;
  hcpcs_code: string;
  hcpcs_description?: string | null;
  ndc_label?: string | null;
  route?: string | null;
  billing_units?: string | null;
  conversion_factor?: string | null;
}

export interface PolicyListItem {
  policy_id: string;
  title: string;
  policy_type: string;
  jurisdiction?: string | null;
  effective_date?: string | null;
  retire_date?: string | null;
  status: 'active' | 'retired';
  source_url?: string | null;
  summary?: string | null;
  codes?: Array<{
    code: string;
    code_system: string;
    disposition: string;
  }>;
  code_count?: number;
}

export interface PolicyDetail {
  policy_id: string;
  title: string;
  policy_type: string;
  jurisdiction?: string | null;
  effective_date?: string | null;
  retire_date?: string | null;
  status: 'active' | 'retired';
  source_url?: string | null;
  last_reviewed_date?: string | null;
  version?: string | null;
  pdf_url?: string | null;
  description?: string | null;
  summary?: string | null;
  specialty?: string[] | null;
  keywords?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  sections?: {
    indications?: string | null;
    limitations?: string | null;
    documentation?: string | null;
  };
  mac?: MacInfo;
  payer?: PayerInfo;
  criteria?: Record<string, CriteriaBlock[]>;
  criteria_count?: number;
  codes?: Array<{
    code: string;
    code_system: string;
    disposition: string;
  }>;
  code_count?: number;
  attachments?: Attachment[];
  versions?: VersionEntry[];
}

export interface MacInfo {
  name?: string;
  code?: string;
  jurisdiction_name?: string;
  states?: string[];
}

export interface PayerInfo {
  name?: string;
  code?: string;
  type?: string;
}

export interface CriteriaBlock {
  block_id?: string;
  criteria_id?: string;
  text?: string;
  logic_ast?: Record<string, any> | null;
  tags?: string[];
  requires_manual_review?: boolean;
  confidence_score?: number;
  policy_id?: string;
  policy_title?: string;
  policy_type?: string;
  jurisdiction?: string | null;
  effective_date?: string | null;
  section?: 'indications' | 'limitations' | 'documentation' | 'frequency' | 'other' | string;
  policy?: {
    policy_id: string;
    title: string;
    policy_type: string;
    jurisdiction?: string | null;
    effective_date?: string | null;
  };
}

export type CriteriaSearchResult = CriteriaBlock;

export interface Attachment {
  file_type?: string;
  url?: string;
  title?: string | null;
  page_number?: number | null;
  file_size_bytes?: number | null;
}

export interface VersionEntry {
  old_version?: string | null;
  new_version?: string | null;
  change_type?: string;
  change_summary?: string | null;
  changed_fields?: string[] | null;
  timestamp?: string | null;
}

export interface PriorAuthResult {
  pa_required: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  matched_policies?: Array<{
    policy_id: string;
    title: string;
    policy_type: string;
    jurisdiction?: string | null;
    codes: Array<{
      code: string;
      code_system: string;
      disposition: string;
      condition_reference?: string | null;
    }>;
  }>;
  documentation_checklist?: string[];
  criteria_details?: {
    indications?: Array<{
      text: string;
      tags: string[];
      policy_id?: string | null;
    }>;
    limitations?: Array<{
      text: string;
      tags: string[];
      policy_id?: string | null;
    }>;
    pagination?: {
      page: number;
      per_page: number;
      indications?: {
        total: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
      };
      limitations?: {
        total: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
      };
      documentation?: {
        total: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
      };
    };
  };
  mac?: {
    name?: string;
    jurisdiction?: string;
    states?: string[];
  } | null;
}

export interface Jurisdiction {
  mac_name: string;
  mac_code?: string;
  jurisdiction_code: string;
  jurisdiction_name?: string;
  states?: string[];
  mac_type?: string;
  website_url?: string;
}

export interface PriorAuthResearchRequest {
  procedureCodes: string[];
  payer?: string;
  state?: string;
  diagnosisCodes?: string[];
  clinicalContext?: string;
  sync?: boolean;
}

export interface PriorAuthResearchResult {
  research_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  created_at: string;
  finished_at?: string;
  poll_url?: string;
  result?: {
    determination: {
      pa_required: boolean;
      confidence: string;
      reasoning: string;
    };
    payer_policies?: Array<{
      title: string;
      url?: string;
      summary?: string;
    }>;
    documentation_requirements?: string[];
    medical_necessity_criteria?: string[];
    coverage_limitations?: string[];
    timeline?: string;
    appeal_process?: string;
    sources?: string[];
  };
  cost?: {
    num_searches: number;
    num_pages: number;
    reasoning_tokens: number;
    total_dollars: number;
  };
  error?: string;
}

export interface SpendingByCodeData {
  [code: string]: {
    total_paid: string;
    total_claims: number;
    unique_beneficiaries: number;
    unique_providers: number;
    date_range: {
      min: string | null;
      max: string | null;
    };
    by_year: Array<{
      year: number;
      total_paid: string;
      total_claims: number;
      unique_beneficiaries: number;
    }>;
  };
}

export interface BatchCodeLookupParams {
  codes: string[];
  codeSystem?: string;
  include?: string[];
}

export interface BatchCodeLookupData {
  results: Record<string, CodeLookupData>;
}

export interface CoverageEvaluateParams {
  policyId: string;
  parameters: Record<string, unknown>;
}

export interface CoverageEvaluationData {
  covered: boolean;
  confidence: number;
  reasons: string[];
  matched_criteria: string[];
  unmatched_criteria: string[];
  skipped_criteria: string[];
  blocks_evaluated: number;
  blocks_without_ast: number;
  policy: {
    policy_id: string;
    title: string;
    policy_type: string;
  };
}

export interface WebhookEndpoint {
  id: number;
  url: string;
  events: string[];
  status: string;
  failure_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface WebhookCreateData extends WebhookEndpoint {
  secret: string;
}

export interface WebhookTestData {
  delivery_id: number;
  endpoint_id: number;
  event: string;
  http_status: number | null;
  success: boolean;
  error: string | null;
  created_at: string | null;
}

export interface ClaimValidationParams {
  procedureCodes: string[];
  payer?: string;
  planType?: 'commercial' | 'medicare_advantage' | 'medicaid' | 'traditional_medicare' | 'exchange';
  lineOfBusiness?: string;
  diagnosisCodes?: string[];
  modifiers?: string[];
  state?: string;
  dateOfService?: string;
  siteOfService?: 'office' | 'outpatient_hospital' | 'asc' | 'inpatient' | 'home' | 'telehealth';
  providerSpecialty?: string;
  ageCategory?: 'pediatric' | 'adult' | 'medicare_age';
  sexWhenPolicyRelevant?: 'female' | 'male' | 'other' | 'unknown';
  idempotencyKey?: string;
}

export interface PolicySource {
  source_id?: string;
  policy_id?: string;
  title?: string;
  policy_type?: string;
  jurisdiction?: string | null;
  source_url?: string | null;
  effective_date?: string | null;
  last_verified_at?: string | null;
}

export interface ClaimValidationCodeResult {
  code: string;
  code_type: string;
  description: string | null;
  coverage_status: 'covered' | 'conditional' | 'not_covered' | 'unknown';
  prior_auth_required: boolean | null;
  pa_required?: boolean | null;
  denial_risk: 'low' | 'medium' | 'high';
  confidence: 'high' | 'medium' | 'low';
  documentation_requirements: string[];
  policy_sources: PolicySource[];
  effective_date: string | null;
  last_verified_at: string | null;
  requires_manual_review: boolean;
  known_gaps: string[];
  issues: string[];
  policy_count: number;
}

export interface ClaimValidationData {
  payer: string | null;
  plan_type: string | null;
  line_of_business: string | null;
  state: string | null;
  date_of_service: string | null;
  site_of_service: string | null;
  provider_specialty: string | null;
  modifiers: string[];
  overall_risk: 'low' | 'medium' | 'high';
  coverage_status: 'covered' | 'conditional' | 'not_covered' | 'unknown';
  prior_auth_required: boolean | null;
  denial_risk: 'low' | 'medium' | 'high';
  confidence: 'high' | 'medium' | 'low';
  documentation_requirements: string[];
  policy_sources: PolicySource[];
  matched_policies: PolicySource[];
  effective_date: string | null;
  last_verified_at: string | null;
  requires_manual_review: boolean;
  known_gaps: string[];
  issues: string[];
  codes: ClaimValidationCodeResult[];
  mac?: {
    name?: string;
    jurisdiction?: string;
  };
}

export interface UnreviewedChange {
  diff_id: number;
  policy_id: string;
  policy_title: string;
  policy_type: string;
  payer_name: string | null;
  change_type: string;
  change_summary: string;
  changed_at: string;
}

export interface PolicyChange {
  diff_id?: number;
  policy_id: string;
  policy_title?: string;
  policy_type?: string;
  payer_name?: string | null;
  old_version?: string | null;
  new_version?: string | null;
  change_type: string;
  change_summary?: string | null;
  changed_fields?: string[];
  timestamp?: string;
  changed_at?: string;
  details?: Record<string, any>;
}

export interface ComplianceStats {
  total_changes_30d: number;
  acknowledged_count: number;
  unreviewed_count: number;
  acknowledgment_rate: number;
  critical_unreviewed: number;
}

export interface AcknowledgeChangeData {
  id: number;
  acknowledged: boolean;
  already_acked: boolean;
}

export interface BulkAcknowledgeChangesData {
  acknowledged: number;
  already_acked: number;
  total: number;
}

export interface DrugFormularyEvidence {
  source: 'cvs_caremark' | 'express_scripts' | 'uhc';
  payer_name: string;
  pbm_name: string | null;
  formulary_name: string | null;
  plan_year: number | null;
  effective_date: string | null;
  drug_name: string;
  matched_text: string | null;
  therapeutic_category: string | null;
  drug_class: string | null;
  tier: string | null;
  coverage_status: string | null;
  requirements?: {
    prior_authorization?: boolean | string | null;
    step_therapy?: boolean | string | null;
    quantity_limit?: boolean | string | null;
    specialty?: boolean | null;
    text?: string | null;
    codes?: string[];
  };
  alternatives: string | null;
  preferred_alternatives: string | null;
  source_url: string | null;
  source_page: number | null;
}
