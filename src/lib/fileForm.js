import * as Yup from 'yup';
import { SPECIAL_DEALERS, requiresNewOwner, DEFAULT_PAPER_LOCATION } from './constants';

/* ---- input transforms (shared by the New/Edit file forms) ---- */
export const upper = (v) => (v || '').toUpperCase();
export const digits = (v) => (v || '').replace(/\D/g, '').slice(0, 10);
/** Chassis / engine: letters, digits, and special characters; strip spaces; max 5. */
export const alnum5 = (v) => (v || '').replace(/\s+/g, '').toUpperCase().slice(0, 5);
// Vehicle number: strip all whitespace + upper-case so it matches the backend's
// canonical form. Uniqueness is (vehicleNo + workType), not vehicle alone.
export const vehicle = (v) => (v || '').replace(/\s+/g, '').toUpperCase();

export const isSpecialDealer = (name) =>
  SPECIAL_DEALERS.some((d) => (name || '').toLowerCase().includes(d.toLowerCase()));

/* ---- form value helpers ---- */
/** @type {import('../types/file.types').FileFormValues} */
export const emptyFileValues = {
  dealerId: '',
  dealerName: '',
  workType: '',
  paperLocation: DEFAULT_PAPER_LOCATION,
  vehicleNo: '',
  vehicleModel: '',
  chassisNo: '',
  engineNo: '',
  oldOwnerName: '',
  ownerName: '',
  oldOwnerMob: '',
  newOwnerMob: '',
  dealerMob: '',
  rtoName: '',
  fieldAgentId: '',
  remarks: '',
  documents: [],
  requiredDocuments: [],
};

export function fileToValues(file) {
  return {
    dealerId: file.dealerId || '',
    dealerName: file.dealerName || '',
    workType: file.workType || '',
    paperLocation: file.paperLocation || DEFAULT_PAPER_LOCATION,
    vehicleNo: file.vehicleNo || '',
    vehicleModel: file.vehicleModel || '',
    chassisNo: file.chassisNo || '',
    engineNo: file.engineNo || '',
    oldOwnerName: file.oldOwnerName || '',
    ownerName: file.ownerName || '',
    oldOwnerMob: file.oldOwnerMob || '',
    newOwnerMob: file.newOwnerMob || '',
    dealerMob: file.dealerMob || '',
    rtoName: file.rtoName || '',
    fieldAgentId: file.fieldAgentId || '',
    remarks: file.remarks || '',
    documents: Array.isArray(file.documents) ? [...file.documents] : [],
    requiredDocuments: Array.isArray(file.requiredDocuments)
      ? [...file.requiredDocuments]
      : [],
  };
}

export function fileValuesToPayload(values) {
  const payload = {
    dealerName: upper(values.dealerName),
    workType: values.workType,
    paperLocation: values.paperLocation || DEFAULT_PAPER_LOCATION,
    vehicleNo: vehicle(values.vehicleNo),
    vehicleModel: upper(values.vehicleModel),
    chassisNo: alnum5(values.chassisNo),
    engineNo: alnum5(values.engineNo),
    oldOwnerName: upper(values.oldOwnerName),
    ownerName: upper(values.ownerName),
    oldOwnerMob: values.oldOwnerMob,
    newOwnerMob: values.newOwnerMob,
    dealerMob: values.dealerMob,
    rtoName: upper(values.rtoName),
    remarks: upper(values.remarks),
    documents: Array.isArray(values.documents) ? values.documents : [],
    requiredDocuments: Array.isArray(values.requiredDocuments)
      ? values.requiredDocuments
      : [],
  };
  if (values.dealerId) {
    payload.dealerId = values.dealerId;
  }
  if (values.fieldAgentId) {
    payload.fieldAgentId = values.fieldAgentId;
  } else {
    payload.fieldAgentId = null;
  }
  return payload;
}

/**
 * Builds the file form validation schema.
 * @param {object} [opts]
 * @param {boolean} [opts.requireNewOwner] When true, new owner name + mobile are
 *   required for transfer-of-ownership work types (used by the "move to In
 *   Process" edit flow).
 */
export function buildFileValidationSchema({ requireNewOwner = false } = {}) {
  const newOwnerActive = (workType) => requireNewOwner && requiresNewOwner(workType);

  return Yup.object({
    dealerId: Yup.string().trim().required('Please select a dealer'),
    dealerName: Yup.string().trim().required('Dealer name is required'),
    workType: Yup.string().required('Work type is required'),
    paperLocation: Yup.string()
      .oneOf(['paper_in_office', 'paper_with_field_agent'], 'Select where the paper is kept')
      .required('Select where the paper is kept'),
    vehicleNo: Yup.string().trim().required('Vehicle number is required'),
    vehicleModel: Yup.string().trim().required('Vehicle model is required'),
    chassisNo: Yup.string()
      .transform((v) => alnum5(v))
      .length(5, 'Chassis must be exactly 5 characters')
      .required('Chassis number is required'),
    engineNo: Yup.string()
      .transform((v) => alnum5(v))
      .length(5, 'Engine must be exactly 5 characters')
      .required('Engine number is required'),
    oldOwnerName: Yup.string().trim().required('Old owner name is required'),
    ownerName: Yup.string().when('workType', {
      is: newOwnerActive,
      then: (s) => s.trim().required('New owner name is required'),
      otherwise: (s) => s,
    }),
    oldOwnerMob: Yup.string()
      .matches(/^\d{10}$/, 'Enter 10 digit mobile number')
      .required('Old owner mobile is required'),
    newOwnerMob: Yup.string().when('workType', {
      is: newOwnerActive,
      then: (s) => s.matches(/^\d{10}$/, 'New owner mobile required (10 digits)'),
      otherwise: (s) => s.matches(/^(\d{10})?$/, 'Enter 10 digit mobile number'),
    }),
    dealerMob: Yup.string().when('dealerName', {
      is: (val) => val && !isSpecialDealer(val),
      then: (s) => s.matches(/^\d{10}$/, 'Dealer mobile required (10 digits)'),
      otherwise: (s) => s.matches(/^(\d{10})?$/, 'Enter 10 digits or leave empty'),
    }),
    rtoName: Yup.string().trim().required('RTO is required'),
    remarks: Yup.string(),
  });
}
