export interface FieldAgent {
  id: string;
  name: string;
  mobile: string;
  description?: string;
  rtoName: string;
  /** @deprecated Legacy office address — no longer edited in UI */
  address?: string;
  /** @deprecated Legacy — use rtoName */
  district?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** One table row per RTO — Agent 1 required, Agent 2 optional. */
export interface FieldAgentOffice {
  id: string;
  rtoName: string;
  agents: FieldAgent[];
}
