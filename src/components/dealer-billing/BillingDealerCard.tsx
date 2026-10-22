import { ArrowRight } from 'lucide-react';
import type { DealerRegistryRecord } from '@/types/dealer.types';

interface BillingDealerCardProps {
  dealer: DealerRegistryRecord;
  busy?: boolean;
  onSelect: (dealer: DealerRegistryRecord) => void;
}

export default function BillingDealerCard({ dealer, busy = false, onSelect }: BillingDealerCardProps) {
  const location = [dealer.city, dealer.state].filter(Boolean).join(', ');

  return (
    <article className="crm-billing-dealer-card">
      <div className="crm-billing-dealer-card-head">
        <div className="min-w-0 flex-1">
          <p className="crm-billing-dealer-card-name">{dealer.name}</p>
          {location ? <p className="crm-billing-dealer-card-meta">{location}</p> : null}
          {dealer.phone ? (
            <p className="crm-billing-dealer-card-meta crm-billing-dealer-card-phone">{dealer.phone}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="crm-btn crm-btn--primary crm-billing-dealer-card-btn"
        disabled={busy}
        aria-busy={busy}
        onClick={() => onSelect(dealer)}
      >
        {busy ? 'Opening…' : 'Continue to files'}
        {!busy ? <ArrowRight size={16} aria-hidden /> : null}
      </button>
    </article>
  );
}
