export interface FieldAgent {
  id: string;
  name: string;
  mobile: string;
  rtoName: string;
  address?: string;
  /** @deprecated Legacy — use rtoName */
  district?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
