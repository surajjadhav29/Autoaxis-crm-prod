import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormikContext } from 'formik';
import { FilterSelect } from '@/components/form/FilterSelect';
import { fetchDealerRegistry } from '@/services/dealerRegistryApi';
import type { FileFormValues } from '@/types/file.types';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import { dealerNameKey } from '@/lib/dealerNameKey';

interface DealerSelectProps {
  required?: boolean;
  label?: string;
}

/** Loads dealers from API when the form mounts; sets dealerId + dealerName on pick. */
export function DealerSelect({ required = true, label = 'Dealer' }: DealerSelectProps) {
  const { values, setValues, setFieldValue, setFieldTouched, errors, touched } =
    useFormikContext<FileFormValues>();
  const [dealers, setDealers] = useState<DealerRegistryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const linkedLegacyRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    fetchDealerRegistry()
      .then((list) => {
        if (!active) return;
        setDealers(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (active) {
          setDealers([]);
          setLoadError('Could not load dealers. Refresh or add dealers from the Dealer page.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || linkedLegacyRef.current || !dealers.length) return;
    if (values.dealerId) return;
    if (!values.dealerName) return;
    const key = dealerNameKey(values.dealerName);
    const match = dealers.find((d) => dealerNameKey(d.name) === key);
    if (match) {
      linkedLegacyRef.current = true;
      setFieldValue('dealerId', match.id, false);
    }
  }, [loading, dealers, values.dealerId, values.dealerName, setFieldValue]);

  const options = useMemo(
    () => dealers.map((d) => ({ value: d.id, label: d.name })),
    [dealers]
  );

  const handleChange = (dealerId: string) => {
    if (!dealerId) {
      void setValues({ ...values, dealerId: '', dealerName: '' }, true).then(() => {
        setFieldTouched('dealerId', true, false);
      });
      return;
    }
    const dealer = dealers.find((d) => d.id === dealerId);
    if (!dealer) return;
    void setValues(
      {
        ...values,
        dealerId: dealer.id,
        dealerName: dealer.name,
        ...(dealer.phone ? { dealerMob: dealer.phone } : {}),
      },
      true
    ).then(() => {
      setFieldTouched('dealerId', true, false);
      setFieldTouched('dealerName', true, false);
    });
  };

  const fieldError = values.dealerId
    ? loadError || ''
    : (touched.dealerId && errors.dealerId) ||
      (touched.dealerName && errors.dealerName) ||
      loadError;

  return (
    <div className="flex flex-col gap-1.5">
      {loading ? (
        <p className="m-0 text-[12px] text-[#667488]">Loading dealers…</p>
      ) : null}
      <FilterSelect
        id="dealer-select"
        label={label}
        value={values.dealerId || ''}
        onChange={handleChange}
        options={options}
        allowEmpty={!required}
        emptyLabel="Select dealer"
        placeholder={loading ? 'Loading dealers…' : 'Select dealer'}
        compact={false}
        searchPlaceholder="Search dealer…"
      />
      {fieldError ? (
        <p className="m-0 text-xs font-medium text-[#dc0024]">{String(fieldError)}</p>
      ) : null}
      {!loading && !dealers.length && !loadError ? (
        <p className="m-0 text-[12px] text-[#667488]">
          No dealers in registry yet. Add one from the Dealer menu first.
        </p>
      ) : null}
    </div>
  );
}

export default DealerSelect;
