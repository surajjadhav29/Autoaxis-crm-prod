import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { MdOutlinePersonPin } from 'react-icons/md';
import { DEFAULT_PAPER_LOCATION, paperLocationLabel } from '@/lib/constants';
import type { FileRecord, PaperLocation } from '@/types/file.types';

export function resolvePaperLocation(file: Pick<FileRecord, 'paperLocation'>): PaperLocation {
  const value = file.paperLocation || DEFAULT_PAPER_LOCATION;
  return value === 'paper_with_field_agent' ? 'paper_with_field_agent' : 'paper_in_office';
}

interface PaperLocationIconProps {
  file: Pick<FileRecord, 'paperLocation'>;
  size?: number;
  className?: string;
}

/** Office vs with field agent — shown beside Field Agent column text. */
export default function PaperLocationIcon({ file, size = 17, className = '' }: PaperLocationIconProps) {
  const location = resolvePaperLocation(file);
  const label = paperLocationLabel(location);
  const withAgent = location === 'paper_with_field_agent';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-0.5 ${withAgent ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#eef0f3] text-[#576579]'} ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      {withAgent ? (
        <MdOutlinePersonPin size={size} aria-hidden />
      ) : (
        <HiOutlineBuildingOffice2 size={size} aria-hidden />
      )}
    </span>
  );
}
