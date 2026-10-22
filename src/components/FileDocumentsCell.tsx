import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock } from 'lucide-react';
import { getFileDocumentCounts, getPendingDocuments } from '@/lib/whatsapp';
import type { FileRecord } from '@/types/file.types';

interface FileDocumentsCellProps {
  file: FileRecord;
  compact?: boolean;
}

interface TipPos {
  top: number;
  left: number;
}

/** Document status: ratio + chip; hover chip for pending names. */
export default function FileDocumentsCell({ file, compact = false }: FileDocumentsCellProps) {
  const { submitted, pending, required } = getFileDocumentCounts(file);
  const pendingDocs = getPendingDocuments(file);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipPos, setTipPos] = useState<TipPos | null>(null);

  useLayoutEffect(() => {
    if (!tipOpen || !badgeRef.current) {
      setTipPos(null);
      return;
    }
    const rect = badgeRef.current.getBoundingClientRect();
    setTipPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [tipOpen]);

  if (!required) {
    return <span className="figma-doc-meter-empty">No docs</span>;
  }

  const isDone = pending === 0;
  const isEmpty = submitted === 0;

  let badgeClass = 'figma-doc-meter-badge--partial';
  let badgeLabel = `${pending} left`;
  let BadgeIcon = Clock;

  if (isDone) {
    badgeClass = 'figma-doc-meter-badge--done';
    badgeLabel = 'Done';
    BadgeIcon = Check;
  } else if (isEmpty) {
    badgeClass = 'figma-doc-meter-badge--wait';
    badgeLabel = `${pending} left`;
  }

  const showPendingTip = pendingDocs.length > 0;

  const tooltip =
    tipOpen && tipPos && showPendingTip
      ? createPortal(
          <div
            className="figma-doc-tooltip"
            style={{ top: tipPos.top, left: tipPos.left }}
            role="tooltip"
          >
            <p className="figma-doc-tooltip-title">Not submitted</p>
            <ul className="figma-doc-tooltip-list">
              {pendingDocs.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`figma-doc-meter${compact ? ' figma-doc-meter--compact' : ''}`}>
      <div className="figma-doc-meter-top">
        <span className="figma-doc-meter-ratio">
          {submitted}
          <span className="figma-doc-meter-slash">/</span>
          {required}
        </span>
        <span
          ref={badgeRef}
          className={`figma-doc-meter-badge ${badgeClass}${
            showPendingTip ? ' figma-doc-meter-badge--tip' : ''
          }`}
          onMouseEnter={() => showPendingTip && setTipOpen(true)}
          onMouseLeave={() => setTipOpen(false)}
          onFocus={() => showPendingTip && setTipOpen(true)}
          onBlur={() => setTipOpen(false)}
          tabIndex={showPendingTip ? 0 : undefined}
          aria-label={
            showPendingTip
              ? `${pending} documents not submitted: ${pendingDocs.join(', ')}`
              : badgeLabel
          }
        >
          <BadgeIcon size={10} strokeWidth={2.5} aria-hidden />
          {badgeLabel}
        </span>
        {tooltip}
      </div>
    </div>
  );
}
