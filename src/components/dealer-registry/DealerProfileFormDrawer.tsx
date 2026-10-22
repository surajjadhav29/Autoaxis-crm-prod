import { CheckCircle } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import type { DealerRegistryFormValues } from '@/types/dealer.types';

const inputClass =
  'w-full min-h-11 min-w-0 rounded-[10px] border border-[#d8dde5] bg-white px-3.5 py-2.5 text-sm text-[#1e242c] outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#1a73e8] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-55 min-w-[140px]';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#dbdfe5] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1e242c] transition hover:bg-[#f9fafb] min-w-[140px]';

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#3d4654]">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#667488]">
      {children}
    </p>
  );
}

interface DealerProfileFormDrawerProps {
  visible: boolean;
  isEditing: boolean;
  form: DealerRegistryFormValues;
  formError: string;
  formSuccess: boolean;
  submitting: boolean;
  onChange: (patch: Partial<DealerRegistryFormValues>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export default function DealerProfileFormDrawer({
  visible,
  isEditing,
  form,
  formError,
  formSuccess,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: DealerProfileFormDrawerProps) {
  return (
    <div
      className={`crm-dealer-registry-form grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible
          ? 'mb-0 grid-rows-[1fr] opacity-100 translate-y-0'
          : 'mb-0 grid-rows-[0fr] opacity-0 -translate-y-2.5'
      }`}
      role="region"
      aria-label={isEditing ? 'Edit dealer form' : 'Create dealer form'}
    >
      <div className="crm-dealer-registry-form-scroll min-h-0">
        <div className="w-full max-w-full rounded-lg border border-[#dbdfe5] bg-white shadow-sm">
          {formSuccess ? (
            <div className="flex items-center gap-2.5 px-5 py-6 text-sm text-[#1d7f50] md:px-6">
              <CheckCircle size={20} className="shrink-0 text-green-500" />
              {isEditing ? 'Dealer updated successfully!' : 'Dealer created successfully!'}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="crm-dealer-registry-form-inner flex min-h-0 flex-col">
              <div className="crm-dealer-registry-form-fields flex flex-col gap-5 p-5 md:gap-6 md:p-6">
                <div className="flex flex-col gap-4">
                  <SectionTitle>Contact details</SectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-name">Dealer name *</FieldLabel>
                      <input
                        id="dealer-name"
                        name="name"
                        className={inputClass}
                        placeholder="e.g. ABC FINANCE"
                        value={form.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-phone">Phone *</FieldLabel>
                      <input
                        id="dealer-phone"
                        name="phone"
                        className={inputClass}
                        placeholder="10-digit mobile"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) =>
                          onChange({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                        }
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-email">Email *</FieldLabel>
                      <input
                        id="dealer-email"
                        name="email"
                        type="email"
                        className={inputClass}
                        placeholder="dealer@example.com"
                        value={form.email}
                        onChange={(e) => onChange({ email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-address">Street address *</FieldLabel>
                      <input
                        id="dealer-address"
                        name="address"
                        className={inputClass}
                        placeholder="Building, street, area"
                        value={form.address}
                        onChange={(e) => onChange({ address: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-city">City *</FieldLabel>
                      <input
                        id="dealer-city"
                        name="city"
                        className={inputClass}
                        placeholder="City"
                        value={form.city}
                        onChange={(e) => onChange({ city: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="dealer-state">State *</FieldLabel>
                      <input
                        id="dealer-state"
                        name="state"
                        className={inputClass}
                        placeholder="State"
                        value={form.state}
                        onChange={(e) => onChange({ state: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                      <FieldLabel htmlFor="dealer-zip">PIN / ZIP code *</FieldLabel>
                      <input
                        id="dealer-zip"
                        name="zip"
                        className={inputClass}
                        placeholder="6-digit PIN"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.zip}
                        onChange={(e) =>
                          onChange({ zip: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                {formError ? (
                  <p className="m-0 text-sm font-medium text-[#dc0024]">{formError}</p>
                ) : null}
              </div>

              <div className="crm-dealer-registry-form-actions flex shrink-0 flex-wrap gap-3 border-t border-[#eef0f3] bg-[#fbfcfd] px-5 py-4 md:px-6">
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? 'Saving…' : isEditing ? 'Update Dealer' : 'Create Dealer'}
                </button>
                <button type="button" className={btnSecondary} onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
