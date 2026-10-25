import { ErrorMessage, useFormikContext } from 'formik';
import { PAPER_LOCATIONS } from '@/lib/constants';
import type { FileFormValues, PaperLocation } from '@/types/file.types';

/** Paper location choice (New Entry / Edit). */
export default function PaperLocationField() {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<FileFormValues>();

  return (
    <div className="crm-form-span-all crm-paper-loc-field">
      <span className="crm-field-label">
        Document location <span className="crm-field-req">*</span>
      </span>
      <div className="crm-paper-loc-radios mt-1.5" role="radiogroup" aria-label="Paper location">
        {PAPER_LOCATIONS.map((option) => {
          const inputId = `paper-location-${option.value}`;
          return (
            <label key={option.value} htmlFor={inputId} className="crm-paper-loc-radio">
              <input
                id={inputId}
                type="radio"
                name="paperLocation"
                value={option.value}
                checked={values.paperLocation === option.value}
                className="crm-paper-loc-radio-input"
                onChange={() => {
                  setFieldValue('paperLocation', option.value as PaperLocation, true);
                  setFieldTouched('paperLocation', true, false);
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      <ErrorMessage name="paperLocation" component="p" className="crm-field-error m-0 mt-1.5" />
    </div>
  );
}
