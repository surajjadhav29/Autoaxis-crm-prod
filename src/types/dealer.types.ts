export interface DealerRegistryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealerRegistryNameOption {
  id: string;
  name: string;
}

export interface DealerRegistryFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}
