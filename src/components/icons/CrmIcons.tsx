import { FaWhatsapp } from 'react-icons/fa';
import {
  HiCheck,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineComputerDesktop,
  HiOutlineEllipsisVertical,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineGlobeAlt,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXCircle,
} from 'react-icons/hi2';

const TABLE_ICON = 16;

export function CrmSortIcon() {
  return <HiOutlineArrowsUpDown size={TABLE_ICON} className="figma-sort-icon" aria-hidden />;
}

export function CrmRowErrorIcon() {
  return (
    <HiOutlineXCircle size={TABLE_ICON} className="figma-row-icon" color="#DC0024" aria-hidden />
  );
}

export function CrmRowSuccessIcon() {
  return (
    <HiOutlineCheckCircle size={TABLE_ICON} className="figma-row-icon" color="#26A568" aria-hidden />
  );
}

export function CrmRowWarningIcon() {
  return (
    <HiOutlineExclamationTriangle
      size={TABLE_ICON}
      className="figma-row-icon"
      color="#F2B500"
      aria-hidden
    />
  );
}

export function CrmKebabIcon() {
  return (
    <HiOutlineEllipsisVertical size={TABLE_ICON} className="figma-kebab-icon" aria-hidden />
  );
}

export function CrmWhatsAppIcon() {
  return (
    <FaWhatsapp
      size={18}
      className="figma-action-icon figma-wa-img"
      aria-hidden
    />
  );
}

export function CrmGlobeSideIcon() {
  return <HiOutlineGlobeAlt size={TABLE_ICON} className="figma-side-icon" aria-hidden />;
}

export function CrmMonitorSideIcon() {
  return (
    <HiOutlineComputerDesktop size={TABLE_ICON} className="figma-side-icon" aria-hidden />
  );
}

export function CrmChevronDown({
  open = false,
  className = 'figma-status-chevron',
  size = 12,
}: {
  open?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <HiChevronDown
      size={size}
      className={`${className}${open ? ' figma-status-chevron--open' : ''}`}
      aria-hidden
    />
  );
}

export function CrmCheckIcon({ size = 14 }: { size?: number }) {
  return <HiCheck size={size} aria-hidden />;
}

export function CrmChevronLeft({ className = 'block size-4 shrink-0' }: { className?: string }) {
  return <HiChevronLeft className={className} aria-hidden />;
}

export function CrmChevronRight({ className = 'block size-4 shrink-0' }: { className?: string }) {
  return <HiChevronRight className={className} aria-hidden />;
}

type IconSizeProps = { size?: number; className?: string };

export function CrmEditIcon({ size = 16, className }: IconSizeProps) {
  return <HiOutlinePencil size={size} className={className} aria-hidden />;
}

export function CrmPlusIcon({ size = 16, className }: IconSizeProps) {
  return <HiOutlinePlus size={size} className={className} aria-hidden />;
}

export function CrmTrashIcon({ size = 16, className }: IconSizeProps) {
  return <HiOutlineTrash size={size} className={className} aria-hidden />;
}

export function CrmEyeIcon({ size = 16, className }: IconSizeProps) {
  return <HiOutlineEye size={size} className={className} aria-hidden />;
}

export function CrmPaginationChevronDown({
  open = false,
  className = 'block size-3.5 shrink-0 transition-transform duration-150',
}: {
  open?: boolean;
  className?: string;
}) {
  return (
    <HiChevronDown
      className={`${className}${open ? ' rotate-180' : ''}`}
      aria-hidden
    />
  );
}
