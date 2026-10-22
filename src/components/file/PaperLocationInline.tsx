import PaperLocationIcon, { resolvePaperLocation } from './PaperLocationIcon';
import { paperLocationLabel, paperLocationShortLabel } from '@/lib/constants';
import type { FileRecord } from '@/types/file.types';

interface PaperLocationInlineProps {
  file: Pick<FileRecord, 'paperLocation'>;
  /** Use short copy on narrow layouts (mobile cards). */
  compact?: boolean;
}

export default function PaperLocationInline({ file, compact = false }: PaperLocationInlineProps) {
  const location = resolvePaperLocation(file);
  const title = paperLocationLabel(location);
  const text = compact ? paperLocationShortLabel(location) : title;

  return (
    <span className="crm-paper-loc-inline" title={title}>
      <PaperLocationIcon file={file} size={18} className="crm-paper-loc-inline-icon" />
      <span className="crm-paper-loc-inline-text">{text}</span>
    </span>
  );
}
