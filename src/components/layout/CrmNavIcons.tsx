import type { IconType } from 'react-icons';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBuildingStorefront,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentPlus,
  HiOutlineFolderOpen,
  HiOutlineReceiptPercent,
  HiOutlineSquares2X2,
  HiOutlineUsers,
} from 'react-icons/hi2';
import { MdOutlinePersonPin } from 'react-icons/md';

export const CRM_NAV_ICON_SIZE = 18;
export const CRM_NAV_ICON_SIZE_MOBILE = 22;

export const CrmNavIconSet = {
  dashboard: HiOutlineSquares2X2,
  fileRecords: HiOutlineFolderOpen,
  newEntry: HiOutlineDocumentPlus,
  workTypes: HiOutlineClipboardDocumentList,
  fieldAgents: MdOutlinePersonPin,
  dealer: HiOutlineBuildingStorefront,
  billing: HiOutlineReceiptPercent,
  users: HiOutlineUsers,
  parivahan: HiOutlineArrowTopRightOnSquare,
  logout: HiOutlineArrowRightOnRectangle,
  sidebarCollapse: HiOutlineChevronDoubleLeft,
  sidebarExpand: HiOutlineChevronDoubleRight,
} as const satisfies Record<string, IconType>;

type CrmNavIconProps = {
  icon: IconType;
  size?: number;
  className?: string;
};

export function CrmNavIcon({ icon: Icon, size = CRM_NAV_ICON_SIZE, className = 'crm-nav-icon' }: CrmNavIconProps) {
  return <Icon size={size} className={className} aria-hidden />;
}
