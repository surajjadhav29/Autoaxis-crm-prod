import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { useField } from 'formik';

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  required?: boolean;
}

function FieldLabel({ htmlFor, label, required }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="crm-field-label">
      {label}
      {required && <span className="crm-field-req" aria-hidden>*</span>}
    </label>
  );
}

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string;
  name: string;
  required?: boolean;
  transform?: (value: string) => string;
  hint?: string;
  list?: string;
}

export function FormInput({
  label,
  name,
  required,
  transform,
  hint,
  list,
  ...props
}: FormInputProps) {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && meta.error;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = transform ? transform(e.target.value) : e.target.value;
    helpers.setValue(val);
  };

  return (
    <div className={`crm-field ${hasError ? 'crm-field--error' : ''}`}>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <input
        {...field}
        {...props}
        id={name}
        list={list}
        onChange={handleChange}
        onBlur={field.onBlur}
        className={`crm-field-input ${props.className || ''}`}
      />
      {hint && !hasError && <p className="crm-field-hint">{hint}</p>}
      {hasError && <p className="crm-field-error">{meta.error}</p>}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  label: string;
  name: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export function FormSelect({
  label,
  name,
  required,
  options,
  placeholder,
  ...props
}: FormSelectProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  return (
    <div className={`crm-field ${hasError ? 'crm-field--error' : ''}`}>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <div className="crm-field-select-wrap">
        <select {...field} {...props} id={name} className="crm-field-input crm-field-select">
          <option value="">{placeholder || 'Select an option'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {hasError && <p className="crm-field-error">{meta.error}</p>}
    </div>
  );
}

interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  label: string;
  name: string;
  required?: boolean;
  transform?: (value: string) => string;
}

export function FormTextarea({ label, name, required, transform, ...props }: FormTextareaProps) {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && meta.error;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = transform ? transform(e.target.value) : e.target.value;
    helpers.setValue(val);
  };

  return (
    <div className={`crm-field ${hasError ? 'crm-field--error' : ''}`}>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <textarea
        {...field}
        {...props}
        id={name}
        onChange={handleChange}
        className={`crm-field-input crm-field-textarea ${props.className || ''}`}
      />
      {hasError && <p className="crm-field-error">{meta.error}</p>}
    </div>
  );
}

interface FormSectionProps {
  number: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function FormSection({ number, title, subtitle, icon: Icon, children }: FormSectionProps) {
  return (
    <section className="crm-form-block">
      <div className="crm-form-block-head">
        <span className="crm-form-block-num">{number}</span>
        <div className="crm-form-block-meta">
          <h2 className="crm-form-block-title">
            {Icon && <Icon size={18} strokeWidth={2} />}
            {title}
          </h2>
          {subtitle && <p className="crm-form-block-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="crm-form-block-body">{children}</div>
    </section>
  );
}

interface FormStep {
  id: string;
  label: string;
}

interface FormStepsProps {
  steps: FormStep[];
}

export function FormSteps({ steps }: FormStepsProps) {
  return (
    <nav
      aria-label="Form progress"
      className="w-full min-w-0 max-w-full overflow-hidden border-b border-[#eef0f3] bg-gradient-to-b from-[#fafbfc] to-white px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    >
      <ol className="grid w-full min-w-0 grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-col items-center gap-1"
          >
            {i < steps.length - 1 && (
              <span
                className="pointer-events-none absolute top-3.5 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-0.5 rounded-sm bg-[#e2e6eb]"
                aria-hidden
              />
            )}
            <span className="relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef4fd] text-xs font-bold text-[#1a73e8]">
              {step.id}
            </span>
            <span className="relative z-10 max-w-full truncate px-0.5 text-center text-[12px] font-medium text-[#3d4654] sm:text-[13px]">
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
