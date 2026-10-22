import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { getApiError } from '../lib/apiError';
import {
  fetchDealerRegistry,
  createDealerRegistryEntry,
  updateDealerRegistryEntry,
} from '../services/dealerRegistryApi';
import DealerRegistryToolbar from '../components/dealer-registry/DealerRegistryToolbar';
import DealerProfileFormDrawer from '../components/dealer-registry/DealerProfileFormDrawer';
import DealerDirectoryTable from '../components/dealer-registry/DealerDirectoryTable';
import Toast from '../components/Toast';
import type { DealerRegistryFormValues, DealerRegistryRecord } from '@/types/dealer.types';
import { dealerNameKey } from '@/lib/dealerNameKey';

const FORM_ANIM_MS = 320;

const emptyForm: DealerRegistryFormValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'India',
};

function recordToForm(record: DealerRegistryRecord): DealerRegistryFormValues {
  return {
    name: record.name || '',
    email: record.email || '',
    phone: record.phone || '',
    address: record.address || '',
    city: record.city || '',
    state: record.state || '',
    zip: record.zip || '',
    country: record.country || 'India',
  };
}

function validateForm(
  form: DealerRegistryFormValues,
  dealers: DealerRegistryRecord[],
  editingId: string | null
): string | null {
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();
  const city = form.city.trim();
  const state = form.state.trim();
  const zip = form.zip.trim();

  if (!name || !phone || !address || !city || !state || !zip) {
    return 'Name, phone, address, city, state and ZIP are required.';
  }
  if (phone.length !== 10) {
    return 'Phone must be a 10-digit mobile number.';
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (zip.length < 4) {
    return 'Enter a valid PIN / ZIP code (at least 4 digits).';
  }
  const key = dealerNameKey(name);
  const duplicate = dealers.some(
    (d) => dealerNameKey(d.name) === key && d.id !== editingId
  );
  if (duplicate) {
    return 'A dealer with this name already exists (names are unique, ignoring case and spacing).';
  }
  return null;
}

function filterDealers(list: DealerRegistryRecord[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.city.toLowerCase().includes(q) ||
      d.state.toLowerCase().includes(q) ||
      (d.address && d.address.toLowerCase().includes(q))
  );
}

export default function DealerRegistryPage() {
  const [dealers, setDealers] = useState<DealerRegistryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealerRegistryFormValues>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  const isEditing = formMode === 'edit';

  const filteredDealers = useMemo(() => filterDealers(dealers, search), [dealers, search]);

  const loadDealers = async () => {
    setLoading(true);
    try {
      const list = await fetchDealerRegistry();
      setDealers(list);
      setError('');
    } catch {
      setDealers([]);
      setError('Failed to load dealers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealers();
  }, []);

  const openForm = useCallback(() => {
    setFormMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFormVisible(true));
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    window.setTimeout(() => {
      setFormMounted(false);
      setFormMode('create');
      setEditingId(null);
      setForm(emptyForm);
      setFormError('');
      setFormSuccess(false);
    }, FORM_ANIM_MS);
  }, []);

  const handleCreateToggle = () => {
    if (formMounted && formMode === 'create') {
      closeForm();
      return;
    }
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleEdit = (item: DealerRegistryRecord) => {
    setFormMode('edit');
    setEditingId(item.id);
    setForm(recordToForm(item));
    setFormError('');
    setFormSuccess(false);
    openForm();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const validationError = validateForm(form, dealers, editingId);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      country: form.country.trim() || 'India',
    };

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateDealerRegistryEntry(editingId, payload);
        showToast('Dealer updated successfully');
      } else {
        await createDealerRegistryEntry(payload);
        showToast('Dealer created successfully');
      }
      setFormSuccess(true);
      await loadDealers();
      window.setTimeout(() => closeForm(), 900);
    } catch (err) {
      setFormError(getApiError(err, 'Failed to save dealer.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`crm-page crm-form-page crm-page--dealer-registry${
        formMounted && formVisible ? ' crm-dealer-registry-form-open' : ''
      }`}
    >
      <DealerRegistryToolbar
        search={search}
        onSearchChange={setSearch}
        actions={
          <button type="button" onClick={handleCreateToggle} className="crm-btn crm-btn--primary">
            {formMounted && formMode === 'create' ? <X size={16} /> : <Building2 size={16} />}
            {formMounted && formMode === 'create' ? 'Close' : 'Create Dealer'}
          </button>
        }
      />

      <div className="crm-dealer-registry-body">
        {formMounted ? (
          <DealerProfileFormDrawer
            visible={formVisible}
            isEditing={isEditing}
            form={form}
            formError={formError}
            formSuccess={formSuccess}
            submitting={submitting}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        ) : null}

        {error ? (
          <p className="m-0 rounded-lg border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#dc0024]">
            {error}
          </p>
        ) : null}

        {!loading && search.trim() ? (
          <p className="crm-billing-muted crm-dealer-registry-search-hint m-0">
            Showing {filteredDealers.length} of {dealers.length} dealers
          </p>
        ) : null}

        <div className="figma-table-card">
          <DealerDirectoryTable
            dealers={filteredDealers}
            loading={loading}
            onEdit={handleEdit}
            emptyDescription={
              search.trim()
                ? 'No dealers match your search. Try another term or clear search.'
                : 'Click Create Dealer to add your first dealer to the registry.'
            }
          />
        </div>

        {toast ? (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onClose={clearToast}
          />
        ) : null}
      </div>
    </div>
  );
}
