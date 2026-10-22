import type { BillingWizardStep } from '@/types/dealerBilling.types';

const WIZARD_STEPS = [
  { n: 1 as const, title: 'Dealer' },
  { n: 2 as const, title: 'Files' },
  { n: 3 as const, title: 'Invoice' },
];

type BillingWizardRailProps = {
  step: BillingWizardStep;
  variant?: 'rail' | 'inline' | 'hero';
  className?: string;
};

export default function BillingWizardRail({
  step,
  variant = 'rail',
  className = '',
}: BillingWizardRailProps) {
  const rootClass =
    variant === 'inline'
      ? `crm-billing-wizard-rail crm-billing-wizard-rail--inline${className ? ` ${className}` : ''}`
      : variant === 'hero'
        ? `crm-billing-wizard-rail crm-billing-wizard-rail--hero print:hidden${className ? ` ${className}` : ''}`
        : `crm-billing-wizard-rail print:hidden${className ? ` ${className}` : ''}`;

  return (
    <nav className={rootClass} aria-label="Invoice steps">
      {WIZARD_STEPS.map((ws, i) => {
        const done = step > ws.n;
        const active = step === ws.n;
        return (
          <div key={ws.n} className="crm-billing-wizard-rail-item">
            <div
              className={`crm-billing-wizard-step${active ? ' crm-billing-wizard-step--active' : ''}${done ? ' crm-billing-wizard-step--done' : ''}`}
            >
              <span className="crm-billing-wizard-step-badge">{done ? '✓' : ws.n}</span>
              <div className="crm-billing-wizard-step-text">
                <span className="crm-billing-wizard-step-title">{ws.title}</span>
              </div>
            </div>
            {i < WIZARD_STEPS.length - 1 ? (
              <span className="crm-billing-wizard-step-connector" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
