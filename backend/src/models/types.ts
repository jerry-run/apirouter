// Key model
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  providers: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  isActive: boolean;
}

// Provider config model
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  isConfigured: boolean;
  lastChecked: Date | null;
}

// Stats model
export interface UsageStats {
  keyId: string;
  provider: string;
  requestCount: number;
  errorCount: number;
  lastUsedAt: Date;
}

// Request validation
export interface CreateKeyRequest {
  name: string;
  providers: string[];
}

export interface KeyResponse {
  id: string;
  name: string;
  key: string;
  providers: string[];
  createdAt: string;
  isActive: boolean;
}
