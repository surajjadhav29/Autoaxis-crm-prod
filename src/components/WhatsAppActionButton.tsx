import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { getWhatsAppBlockReason, isWhatsAppBlocked } from '@/lib/whatsapp';
import type { FileRecord } from '@/types/file.types';
import { CrmWhatsAppIcon } from '@/components/icons/CrmIcons';

interface WhatsAppActionButtonProps {
  file: FileRecord;
  onWhatsApp?: (file: FileRecord) => void;
}

/**
 * Disabled + tooltip when required numbers are missing for the file status.
 * TO / TO+HPT / TO+HPT+HPA: new owner only. Other types: new owner, else old owner.
 */
export default function WhatsAppActionButton({ file, onWhatsApp }: WhatsAppActionButtonProps) {
  const blocked = isWhatsAppBlocked(file);
  const tipText = getWhatsAppBlockReason(file) || 'WhatsApp';
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const hideTip = () => setTip(null);

  const showTip = () => {
    if (!blocked || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setTip({
      top: r.top + r.height / 2,
      left: Math.max(12, r.left - 10),
    });
  };

  useEffect(() => {
    if (!tip) return undefined;
    const hide = () => setTip(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [tip]);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) {
      showTip();
      onWhatsApp?.(file);
      return;
    }
    onWhatsApp?.(file);
  };

  return (
    <>
      <span
        ref={wrapRef}
        className={`figma-wa-wrap${blocked ? ' figma-wa-wrap--blocked' : ''}`}
        onPointerEnter={showTip}
        onPointerLeave={hideTip}
        onClick={handleClick}
      >
        <button
          type="button"
          disabled={blocked}
          aria-disabled={blocked}
          aria-label={blocked ? tipText : 'WhatsApp'}
          title={blocked ? tipText : 'WhatsApp'}
          className={`figma-icon-btn figma-icon-btn--wa${blocked ? ' figma-icon-btn--wa-blocked' : ''}`}
          style={blocked ? { pointerEvents: 'none' } : undefined}
          onClick={handleClick}
        >
          <CrmWhatsAppIcon />
        </button>
      </span>

      {blocked && tip
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: 'fixed',
                top: tip.top,
                left: tip.left,
                transform: 'translate(-100%, -50%)',
                zIndex: 2147483646,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#1e242c',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 10px 28px rgba(14,16,19,0.28)',
              }}
            >
              {tipText}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
