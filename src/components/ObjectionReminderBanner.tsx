import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOverdueObjections } from '@/context/OverdueObjectionContext';
import { objectionOverdueBannerMessage } from '@/lib/objectionReminderCopy';

/** Dashboard banner while objection papers are overdue (>3 days). */
export default function ObjectionReminderBanner() {
  const { overdueCount, loading, openReminder } = useOverdueObjections();
  const navigate = useNavigate();

  if (loading || overdueCount <= 0) return null;

  return (
    <div
      className="crm-objection-reminder-banner crm-objection-reminder-banner--compact"
      role="status"
    >
      <span className="crm-objection-reminder-banner__text flex min-w-0 items-center gap-2">
        <AlertTriangle size={15} className="shrink-0 text-[#5b5dd0]" aria-hidden />
        <span>{objectionOverdueBannerMessage(overdueCount)}</span>
      </span>
      <div className="crm-objection-reminder-banner__actions">
        <button
          type="button"
          className="crm-objection-reminder-banner__btn crm-objection-reminder-banner__btn--secondary"
          onClick={openReminder}
        >
          Review now
        </button>
        <button
          type="button"
          className="crm-objection-reminder-banner__btn crm-objection-reminder-banner__btn--primary"
          onClick={() => navigate('/files?tab=objection')}
        >
          Open Objection
        </button>
      </div>
    </div>
  );
}
