import type {
  BackworkConfig,
  ApiResponse,
  HealthStatus,
  CodeLookupData,
  PolicyListItem,
  PolicyDetail,
  PriorAuthResult,
  PriorAuthResearchResult,
  CriteriaSearchResult,
  SpendingByCodeData,
  Jurisdiction,
  BatchCodeLookupParams,
  BatchCodeLookupData,
  CoverageEvaluateParams,
  CoverageEvaluationData,
  WebhookEndpoint,
  WebhookCreateData,
  WebhookTestData,
  ClaimValidationParams,
  ClaimValidationData,
  UnreviewedChange,
  ComplianceStats,
  AcknowledgeChangeData,
  BulkAcknowledgeChangesData,
  DrugFormularyEvidence,
  PolicyChange,
} from './types';
import { BackworkError } from './errors';
import { Effect, Schedule } from 'effect';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class BackworkClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: BackworkConfig | string) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.baseUrl = 'https://backworkhealth.com/api/v1';
      this.timeout = 30000;
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://backworkhealth.com/api/v1';
      this.timeout = config.timeout || 30000;
    }

    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    method: RequestMethod,
    path: string,
    options: {
      params?: Record<string, any>;
      body?: Record<string, any>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    return Effect.runPromise(this.requestEffect<T>(method, path, options));
  }

  private requestEffect<T>(
    method: RequestMethod,
    path: string,
    options: {
      params?: Record<string, any>;
      body?: Record<string, any>;
      headers?: Record<string, string>;
    } = {}
  ): Effect.Effect<ApiResponse<T>, BackworkError> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': 'backwork-ts/1.0.0',
      ...options.headers,
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchAttempt = Effect.tryPromise({
      try: () => this.fetchWithTimeout(url.toString(), method, headers, options.body),
      catch: (error) => this.toNetworkError(error),
    });
    const retryableTransportFailure = method === 'GET' || Boolean(headers['X-Idempotency-Key']);
    const fetchResponse = retryableTransportFailure
      ? fetchAttempt.pipe(
          Effect.retry(
            Schedule.exponential('100 millis').pipe(Schedule.compose(Schedule.recurs(2)))
          )
        )
      : fetchAttempt;

    return fetchResponse.pipe(
      Effect.flatMap((response) =>
        this.parseResponse<T>(response).pipe(
          Effect.flatMap((data) =>
            response.ok
              ? Effect.succeed(data)
              : Effect.fail(BackworkError.fromResponse(response.status, data))
          )
        )
      )
    );
  }

  private async fetchWithTimeout(
    url: string,
    method: RequestMethod,
    headers: Record<string, string>,
    body?: Record<string, any>
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse<T>(response: Response): Effect.Effect<ApiResponse<T>, BackworkError> {
    return Effect.tryPromise({
      try: async () => {
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true, data: undefined };
      },
      catch: (error) =>
        new BackworkError(
          error instanceof Error
            ? `Invalid JSON response: ${error.message}`
            : 'Invalid JSON response',
          'INVALID_RESPONSE'
        ),
    });
  }

  private toNetworkError(error: unknown): BackworkError {
    if (error instanceof BackworkError) {
      return error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return new BackworkError('Request timeout', 'TIMEOUT');
    }

    return new BackworkError(
      error instanceof Error ? error.message : 'Unknown error',
      'NETWORK_ERROR'
    );
  }

  /**
   * Check API health status
   */
  async health(): Promise<ApiResponse<HealthStatus>> {
    return this.request<HealthStatus>('GET', '/health');
  }

  /**
   * Look up a medical code
   */
  async lookupCode(params: {
    code: string;
    codeSystem?: 'CPT' | 'HCPCS' | 'ICD10CM' | 'ICD10PCS' | 'NDC';
    jurisdiction?: string;
    include?: Array<'rvu' | 'policies' | 'rates'>;
    fuzzy?: boolean;
  }): Promise<ApiResponse<CodeLookupData>> {
    const queryParams: Record<string, any> = {
      code: params.code,
      fuzzy: params.fuzzy !== false ? 'true' : 'false',
    };

    if (params.codeSystem) {
      queryParams.code_system = params.codeSystem;
    }
    if (params.jurisdiction) {
      queryParams.jurisdiction = params.jurisdiction;
    }
    if (params.include) {
      queryParams.include = params.include.join(',');
    }

    return this.request<CodeLookupData>('GET', '/codes/lookup', { params: queryParams });
  }

  /**
   * Search and list policies
   */
  async listPolicies(params?: {
    q?: string;
    mode?: 'keyword' | 'semantic';
    policyType?: string;
    jurisdiction?: string;
    payer?: string;
    status?: 'active' | 'retired' | 'all';
    cursor?: string;
    limit?: number;
    include?: Array<'summary' | 'criteria' | 'codes'>;
    icd10?: string;
    format?: string;
  }): Promise<ApiResponse<PolicyListItem[]>> {
    const queryParams: Record<string, any> = {
      mode: params?.mode || 'keyword',
      status: params?.status || 'active',
      limit: params?.limit || 50,
    };

    if (params?.q) queryParams.q = params.q;
    if (params?.policyType) queryParams.policy_type = params.policyType;
    if (params?.jurisdiction) queryParams.jurisdiction = params.jurisdiction;
    if (params?.payer) queryParams.payer = params.payer;
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.include) queryParams.include = params.include.join(',');
    if (params?.icd10) queryParams.icd10 = params.icd10;
    if (params?.format) queryParams.format = params.format;

    return this.request<PolicyListItem[]>('GET', '/policies', { params: queryParams });
  }

  /**
   * Get a policy by ID
   */
  async getPolicy(
    policyId: string,
    options?: {
      include?: Array<'criteria' | 'codes' | 'attachments' | 'versions'>;
    }
  ): Promise<ApiResponse<PolicyDetail>> {
    const params: Record<string, any> = {};

    if (options?.include) {
      params.include = options.include.join(',');
    }

    return this.request<PolicyDetail>('GET', `/policies/${policyId}`, { params });
  }

  /**
   * Compare policies across jurisdictions
   */
  async comparePolicies(params: {
    procedureCodes: string[];
    policyType?: 'LCD' | 'Article' | 'NCD';
    jurisdictions?: string[];
    idempotencyKey?: string;
  }): Promise<ApiResponse<any>> {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const body: Record<string, any> = {
      procedure_codes: params.procedureCodes,
    };

    if (params.policyType) body.policy_type = params.policyType;
    if (params.jurisdictions) body.jurisdictions = params.jurisdictions;

    return this.request('POST', '/policies/compare', { body, headers });
  }

  /**
   * Get policy change feed
   */
  async getPolicyChanges(params?: {
    since?: string;
    policyId?: string;
    changeType?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<PolicyChange[]>> {
    const queryParams: Record<string, any> = {
      limit: params?.limit || 50,
    };

    if (params?.since) queryParams.since = params.since;
    if (params?.policyId) queryParams.policy_id = params.policyId;
    if (params?.changeType) queryParams.change_type = params.changeType;
    if (params?.cursor) queryParams.cursor = params.cursor;

    return this.request<PolicyChange[]>('GET', '/policies/changes', { params: queryParams });
  }

  /**
   * Search coverage criteria
   */
  async searchCriteria(params: {
    q: string;
    section?: 'indications' | 'limitations' | 'documentation' | 'frequency' | 'other';
    policyType?: 'LCD' | 'Article' | 'NCD' | 'PayerPolicy';
    jurisdiction?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<CriteriaSearchResult[]>> {
    const queryParams: Record<string, any> = {
      q: params.q,
      limit: params.limit || 50,
    };

    if (params.section) queryParams.section = params.section;
    if (params.policyType) queryParams.policy_type = params.policyType;
    if (params.jurisdiction) queryParams.jurisdiction = params.jurisdiction;
    if (params.cursor) queryParams.cursor = params.cursor;

    return this.request<CriteriaSearchResult[]>('GET', '/coverage/criteria', {
      params: queryParams,
    });
  }

  /**
   * List MAC jurisdictions
   */
  async listJurisdictions(): Promise<ApiResponse<Jurisdiction[]>> {
    return this.request<Jurisdiction[]>('GET', '/jurisdictions');
  }

  /**
   * Check prior authorization requirements
   */
  async checkPriorAuth(params: {
    procedureCodes: string[];
    diagnosisCodes?: string[];
    state?: string;
    payer?: 'medicare' | 'aetna' | 'uhc' | 'all';
    criteriaPage?: number;
    criteriaPerPage?: number;
    idempotencyKey?: string;
  }): Promise<ApiResponse<PriorAuthResult>> {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const body: Record<string, any> = {
      procedure_codes: params.procedureCodes,
      payer: params.payer || 'medicare',
      criteria_page: params.criteriaPage || 1,
      criteria_per_page: params.criteriaPerPage || 25,
    };

    if (params.diagnosisCodes) body.diagnosis_codes = params.diagnosisCodes;
    if (params.state) body.state = params.state;

    return this.request<PriorAuthResult>('POST', '/prior-auth/check', { body, headers });
  }

  /**
   * Validate coverage and denial risk for a claim.
   */
  async validateClaim(params: ClaimValidationParams): Promise<ApiResponse<ClaimValidationData>> {
    return this.validateClaimAtPath('/claims/validate', params);
  }

  /**
   * Validate a claim through the deprecated compatibility endpoint.
   */
  async validateClaimLegacy(
    params: ClaimValidationParams
  ): Promise<ApiResponse<ClaimValidationData>> {
    return this.validateClaimAtPath('/claim-validation', params);
  }

  private async validateClaimAtPath(
    path: '/claims/validate' | '/claim-validation',
    params: ClaimValidationParams
  ): Promise<ApiResponse<ClaimValidationData>> {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const body: Record<string, any> = {
      procedure_codes: params.procedureCodes,
    };

    if (params.payer) body.payer = params.payer;
    if (params.planType) body.plan_type = params.planType;
    if (params.lineOfBusiness) body.line_of_business = params.lineOfBusiness;
    if (params.diagnosisCodes) body.diagnosis_codes = params.diagnosisCodes;
    if (params.modifiers) body.modifiers = params.modifiers;
    if (params.state) body.state = params.state;
    if (params.dateOfService) body.date_of_service = params.dateOfService;
    if (params.siteOfService) body.site_of_service = params.siteOfService;
    if (params.providerSpecialty) body.provider_specialty = params.providerSpecialty;
    if (params.ageCategory) body.age_category = params.ageCategory;
    if (params.sexWhenPolicyRelevant) {
      body.sex_when_policy_relevant = params.sexWhenPolicyRelevant;
    }

    return this.request<ClaimValidationData>('POST', path, { body, headers });
  }

  /**
   * Research prior authorization requirements using AI-powered web research.
   * By default runs asynchronously - returns a research_id for polling.
   * Set sync: true to wait for completion.
   */
  async researchPriorAuth(params: {
    procedureCodes: string[];
    payer?: string;
    state?: string;
    diagnosisCodes?: string[];
    clinicalContext?: string;
    sync?: boolean;
  }): Promise<ApiResponse<PriorAuthResearchResult>> {
    const body: Record<string, any> = {
      procedure_codes: params.procedureCodes,
    };

    if (params.payer) body.payer = params.payer;
    if (params.state) body.state = params.state;
    if (params.diagnosisCodes) body.diagnosis_codes = params.diagnosisCodes;
    if (params.clinicalContext) body.clinical_context = params.clinicalContext;
    if (params.sync !== undefined) body.sync = params.sync;

    return this.request<PriorAuthResearchResult>('POST', '/prior-auth/research', { body });
  }

  /**
   * Get the status and results of a prior authorization research task.
   * Poll this until status is "completed" or "failed".
   */
  async getPriorAuthResearch(researchId: string): Promise<ApiResponse<PriorAuthResearchResult>> {
    return this.request<PriorAuthResearchResult>('GET', `/prior-auth/research/${researchId}`);
  }

  /**
   * Get Medicaid spending data by HCPCS code.
   */
  async getSpendingByCode(params: {
    code?: string;
    codes?: string[];
    year?: number;
  }): Promise<ApiResponse<SpendingByCodeData>> {
    const queryParams: Record<string, any> = {};

    if (params.code) {
      queryParams.code = params.code;
    } else if (params.codes) {
      queryParams.codes = params.codes.join(',');
    }

    if (params.year) {
      queryParams.year = params.year;
    }

    return this.request<SpendingByCodeData>('GET', '/spending/by-code', { params: queryParams });
  }

  /**
   * Batch lookup multiple medical codes at once
   */
  async batchLookupCodes(params: BatchCodeLookupParams): Promise<ApiResponse<BatchCodeLookupData>> {
    const body: Record<string, any> = {
      codes: params.codes,
    };

    if (params.codeSystem) body.code_system = params.codeSystem;
    if (params.include) body.include = params.include;

    return this.request<BatchCodeLookupData>('POST', '/codes/batch', { body });
  }

  /**
   * Evaluate coverage for a policy against provided parameters
   */
  async evaluateCoverage(
    params: CoverageEvaluateParams
  ): Promise<ApiResponse<CoverageEvaluationData>> {
    const body: Record<string, any> = {
      policy_id: params.policyId,
      parameters: params.parameters,
    };

    return this.request<CoverageEvaluationData>('POST', '/coverage/evaluate', { body });
  }

  /**
   * List all webhook endpoints
   */
  async listWebhooks(): Promise<ApiResponse<WebhookEndpoint[]>> {
    return this.request<WebhookEndpoint[]>('GET', '/webhooks');
  }

  /**
   * Create a new webhook endpoint
   */
  async createWebhook(params: {
    url: string;
    events: string[];
  }): Promise<ApiResponse<WebhookCreateData>> {
    const body: Record<string, any> = {
      url: params.url,
      events: params.events,
    };

    return this.request<WebhookCreateData>('POST', '/webhooks', { body });
  }

  /**
   * Update an existing webhook endpoint
   */
  async updateWebhook(
    id: number,
    params: {
      url?: string;
      events?: string[];
      status?: string;
    }
  ): Promise<ApiResponse<WebhookEndpoint>> {
    const body: Record<string, any> = {};

    if (params.url) body.url = params.url;
    if (params.events) body.events = params.events;
    if (params.status) body.status = params.status;

    return this.request<WebhookEndpoint>('PATCH', `/webhooks/${id}`, { body });
  }

  /**
   * Delete a webhook endpoint
   */
  async deleteWebhook(id: number): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/webhooks/${id}`);
  }

  /**
   * Send a test event to a webhook endpoint
   */
  async testWebhook(id: number): Promise<ApiResponse<WebhookTestData>> {
    return this.request<WebhookTestData>('POST', `/webhooks/${id}/test`);
  }

  /**
   * List policy changes that have not been acknowledged.
   */
  async listUnreviewedChanges(params?: {
    changeType?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<UnreviewedChange[]>> {
    const queryParams: Record<string, any> = {
      limit: params?.limit || 50,
    };

    if (params?.changeType) queryParams.change_type = params.changeType;
    if (params?.cursor) queryParams.cursor = params.cursor;

    return this.request<UnreviewedChange[]>('GET', '/compliance/unreviewed', {
      params: queryParams,
    });
  }

  /**
   * Acknowledge a single policy change.
   */
  async acknowledgeChange(params: {
    diffId: number;
    notes?: string;
  }): Promise<ApiResponse<AcknowledgeChangeData>> {
    const body: Record<string, any> = {
      diff_id: params.diffId,
    };

    if (params.notes) body.notes = params.notes;

    return this.request<AcknowledgeChangeData>('POST', '/compliance/ack', { body });
  }

  /**
   * Acknowledge multiple policy changes.
   */
  async bulkAcknowledgeChanges(params: {
    diffIds: number[];
    notes?: string;
  }): Promise<ApiResponse<BulkAcknowledgeChangesData>> {
    const body: Record<string, any> = {
      diff_ids: params.diffIds,
    };

    if (params.notes) body.notes = params.notes;

    return this.request<BulkAcknowledgeChangesData>('POST', '/compliance/ack/bulk', { body });
  }

  /**
   * Get compliance dashboard statistics.
   */
  async getComplianceStats(): Promise<ApiResponse<ComplianceStats>> {
    return this.request<ComplianceStats>('GET', '/compliance/stats');
  }

  /**
   * Search commercial pharmacy-benefit formulary evidence.
   */
  async searchDrugFormularyEvidence(params: {
    q: string;
    payer?: 'all' | 'cvs_caremark' | 'express_scripts' | 'uhc';
    limit?: number;
  }): Promise<ApiResponse<DrugFormularyEvidence[]>> {
    const queryParams: Record<string, any> = {
      q: params.q,
      payer: params.payer || 'all',
      limit: params.limit || 25,
    };

    return this.request<DrugFormularyEvidence[]>('GET', '/drugs/formulary', {
      params: queryParams,
    });
  }
}
