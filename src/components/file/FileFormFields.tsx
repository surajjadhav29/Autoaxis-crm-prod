import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormikContext } from 'formik';
import { Building2, Car, UserCircle, Files } from 'lucide-react';
import { upper, digits, alnum5, vehicle, isSpecialDealer } from '@/lib/fileForm';
import { FormInput, FormSelect, FormTextarea, FormSection } from '@/components/form/FormField';
import { WorkTypeSelect } from '@/components/form/WorkTypeSelect';
import { DealerSelect } from '@/components/form/DealerSelect';
import { RtoSelect } from '@/components/form/RtoSelect';
import DocumentChecklist from '@/components/form/DocumentChecklist';
import { fetchWorkTypes } from '@/services/workTypeService';
import {
  fetchFieldAgents,
  listFieldAgentsForRto,
  pickFieldAgentForRto,
} from '@/services/fieldAgentService';
import type { FieldAgent } from '@/types/fieldAgent.types';
import PaperLocationField from './PaperLocationField';
import type { FileFormValues, WorkType } from '@/types/file.types';

interface FileFormFieldsProps {
  newOwnerRequired?: boolean;
}

/**
 * The shared 3-section body (Dealer & work type → Vehicle → Owner & contact)
 * used by both the New Entry and Edit File forms. Must be rendered inside a
 * Formik <Form>.
 *
 * @param {object} props
 * @param {boolean} [props.newOwnerRequired] Mark new owner name + mobile as required.
 */
export default function FileFormFields({ newOwnerRequired = false }: FileFormFieldsProps) {
  const { values, setFieldValue } = useFormikContext<FileFormValues>();
  const dealerMobRequired = values.dealerName && !isSpecialDealer(values.dealerName);
  const [catalog, setCatalog] = useState<WorkType[]>([]);
  const [fieldAgents, setFieldAgents] = useState<FieldAgent[]>([]);
  const prevWorkTypeRef = useRef<string | null>(null);
  const prevRtoRef = useRef<string | null>(null);
  /** True after the user changes work type until we can snapshot from the catalog. */
  const pendingSnapshotRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetchWorkTypes()
      .then((items) => {
        if (active) setCatalog(items || []);
      })
      .catch(() => {
        if (active) setCatalog([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchFieldAgents({ activeOnly: true })
      .then((items) => {
        if (active) setFieldAgents(items || []);
      })
      .catch(() => {
        if (active) setFieldAgents([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const agentsForRto = useMemo(
    () => listFieldAgentsForRto(fieldAgents, values.rtoName || '', { activeOnly: true }),
    [fieldAgents, values.rtoName]
  );

  const fieldAgentOptions = useMemo(
    () =>
      agentsForRto.map((agent) => ({
        value: agent.id,
        label: [agent.name, agent.mobile].filter(Boolean).join(' · '),
      })),
    [agentsForRto]
  );

  /** 2+ agents for this RTO → show picker; 0–1 → auto-map, no dropdown. */
  const showFieldAgentPicker = agentsForRto.length >= 2;

  useEffect(() => {
    const current = values.rtoName || '';
    const rtoChanged =
      prevRtoRef.current !== null && prevRtoRef.current !== current;
    if (prevRtoRef.current === null || rtoChanged) {
      prevRtoRef.current = current;
    }

    if (!current) {
      if (values.fieldAgentId) setFieldValue('fieldAgentId', '', false);
      return;
    }
    if (!fieldAgents.length) return;

    const matches = listFieldAgentsForRto(fieldAgents, current, { activeOnly: true });
    const currentId = values.fieldAgentId || '';
    const stillValid = matches.some((a) => a.id === currentId);

    if (matches.length === 0) {
      if (currentId) setFieldValue('fieldAgentId', '', false);
      return;
    }

    if (matches.length === 1) {
      if (currentId !== matches[0].id) {
        setFieldValue('fieldAgentId', matches[0].id, false);
      }
      return;
    }

    // 2+ agents: keep selection if still valid for this RTO; else default first.
    if (rtoChanged || !stillValid) {
      const picked = pickFieldAgentForRto(fieldAgents, current);
      if (picked?.id && picked.id !== currentId) {
        setFieldValue('fieldAgentId', picked.id, false);
      }
    }
  }, [values.rtoName, values.fieldAgentId, fieldAgents, setFieldValue]);

  const workTypeKey = (name?: string) =>
    String(name || '')
      .toUpperCase()
      .replace(/\s+/g, '');

  const selectedWorkType = useMemo(() => {
    const key = workTypeKey(values.workType);
    if (!key) return null;
    return catalog.find((w) => workTypeKey(w.name) === key) || null;
  }, [catalog, values.workType]);

  // Prefer the file's saved snapshot on edit; fall back to live Work Type docs.
  const documentOptions = useMemo(() => {
    const snapshot = Array.isArray(values.requiredDocuments) ? values.requiredDocuments : [];
    if (snapshot.length) return snapshot;
    return selectedWorkType?.documents || [];
  }, [values.requiredDocuments, selectedWorkType]);

  useEffect(() => {
    const current = values.workType || '';

    // First render: remember current work type but do NOT overwrite requiredDocuments
    // (preserves the file snapshot when opening Edit).
    if (prevWorkTypeRef.current === null) {
      prevWorkTypeRef.current = current;
      return;
    }

    if (prevWorkTypeRef.current !== current) {
      prevWorkTypeRef.current = current;
      setFieldValue('documents', [], false);
      if (!current) {
        setFieldValue('requiredDocuments', [], false);
        pendingSnapshotRef.current = false;
      } else {
        pendingSnapshotRef.current = true;
      }
    }

    // Apply catalog snapshot only after a user-driven work-type change
    // (waits if catalog is still loading).
    if (pendingSnapshotRef.current && selectedWorkType) {
      setFieldValue(
        'requiredDocuments',
        Array.isArray(selectedWorkType.documents) ? [...selectedWorkType.documents] : [],
        false
      );
      pendingSnapshotRef.current = false;
    }
  }, [values.workType, selectedWorkType, setFieldValue]);

  return (
    <>
      <FormSection
        number="01"
        title="Dealer & work type"
        subtitle="Who is the dealer and what work is being done?"
        icon={Building2}
      >
        <div className="crm-form-grid crm-form-grid--pair">
          <DealerSelect required label="Dealer" />
          <WorkTypeSelect name="workType" required />
        </div>
      </FormSection>

      {values.workType ? (
        <>
          <div className="crm-form-divider" />
          <FormSection
            number="01b"
            title="Documents"
            subtitle="Mark the documents collected for this work type"
            icon={Files}
          >
            <DocumentChecklist
              label="Document checklist"
              hint={
                documentOptions.length
                  ? 'Select all documents received with this file.'
                  : 'No documents are configured for this work type yet. Add them in Work Types.'
              }
              options={documentOptions}
              value={Array.isArray(values.documents) ? values.documents : []}
              onChange={(documents) => setFieldValue('documents', documents)}
              emptyMessage="No documents configured for this work type. Ask an admin to set them on the Work Types page."
            />
          </FormSection>
        </>
      ) : null}

      <div className="crm-form-divider" />

      <FormSection
        number="02"
        title="Vehicle details"
        subtitle="Registration number, model, chassis and engine"
        icon={Car}
      >
        <div className="crm-form-grid crm-form-grid--pair">
          <FormInput label="Vehicle number" name="vehicleNo" required placeholder="MH12AB1234" transform={vehicle} />
          <FormInput label="Vehicle model" name="vehicleModel" required placeholder="SWIFT, CRETA…" transform={upper} />
          <FormInput label="Chassis no. (5 chars)" name="chassisNo" required maxLength={5} placeholder="AB1/X" transform={alnum5} autoComplete="off" />
          <FormInput label="Engine no. (5 chars)" name="engineNo" required maxLength={5} placeholder="EN*9-" transform={alnum5} autoComplete="off" />
        </div>
      </FormSection>

      <div className="crm-form-divider" />

      <FormSection
        number="03"
        title="Owner & contact"
        subtitle="Owner details, mobiles and RTO office"
        icon={UserCircle}
      >
        <div className="crm-form-grid crm-form-grid--triple">
          <FormInput label="Old owner name" name="oldOwnerName" required transform={upper} />
          <FormInput
            label="New owner name"
            name="ownerName"
            required={newOwnerRequired}
            placeholder={newOwnerRequired ? 'Required' : 'Optional now'}
            transform={upper}
            hint="Needed for Transfer (TO) work before In Process"
          />
          <FormInput label="Old owner mobile" name="oldOwnerMob" required maxLength={10} placeholder="10 digits" transform={digits} />
          <FormInput
            label="New owner mobile"
            name="newOwnerMob"
            required={newOwnerRequired}
            maxLength={10}
            placeholder={newOwnerRequired ? 'Required' : '10 digits (optional)'}
            transform={digits}
          />
          <FormInput
            label="Dealer mobile"
            name="dealerMob"
            required={Boolean(dealerMobRequired)}
            maxLength={10}
            placeholder={dealerMobRequired ? 'Required' : 'Optional'}
            transform={digits}
            hint={!dealerMobRequired && values.dealerName ? 'Not required for finance dealers' : undefined}
          />
          <RtoSelect name="rtoName" required />
          {showFieldAgentPicker ? (
            <FormSelect
              label="Field agent"
              name="fieldAgentId"
              required
              options={fieldAgentOptions}
              placeholder="Select field agent"
            />
          ) : null}
          <PaperLocationField />
          <div className="crm-form-span-all">
            <FormTextarea label="Remarks" name="remarks" rows={3} placeholder="Any extra notes (optional)" transform={upper} />
          </div>
        </div>
      </FormSection>
    </>
  );
}
