import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { useAuth } from '@/features/auth';
import { selectLoginSessionKey } from '@/features/auth/store/authSelectors';
import { applyFileStatusUpdate } from '@/lib/applyFileStatusUpdate';
import { isObjectionOverdue, OBJECTION_REMINDER_OPEN_EVENT } from '@/lib/objectionReminder';
import { FILE_STATUSES, requiresNewOwner, hasNewOwnerDetails } from '@/lib/constants';
import {
  getAllowedStatusValues,
  hasMissingRequiredDocuments,
  hasPendingRequiredDocuments,
  DOCUMENTS_REQUIRED_MESSAGE,
  DOCUMENTS_REQUIRED_CODE,
  STATUS_TRANSITION_BLOCKED_CODE,
} from '@/lib/whatsapp';
import {
  fetchObjectionFollowUps,
  fetchOverdueObjections,
  submitObjectionReview,
  updateFileStatus,
} from '@/services/fileService';
import { fetchAllUsers } from '@/services/userService';
import { useToast } from '@/hooks/useToast';
import { getApiError, getApiErrorCode } from '@/lib/apiError';
import ObjectionReminderModal from '@/components/ObjectionReminderModal';
import ObjectionModal from '@/components/ObjectionModal';
import ObjectionReviewModal from '@/components/ObjectionReviewModal';
import type { ObjectionReminderTab } from '@/components/ObjectionReminderModal';
import FileDetailsModal from '@/components/FileDetailsModal';
import Toast from '@/components/Toast';
import type { FileRecord, FileStatus } from '@/types/file.types';
import type { User } from '@/types/user.types';

interface OverdueObjectionContextValue {
  overdueCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  openReminder: () => void;
}

const emptyOverdueContext: OverdueObjectionContextValue = {
  overdueCount: 0,
  loading: false,
  refresh: async () => {},
  openReminder: () => {},
};

const OverdueObjectionContext =
  createContext<OverdueObjectionContextValue>(emptyOverdueContext);

export function useOverdueObjections(): OverdueObjectionContextValue {
  return useContext(OverdueObjectionContext);
}

export function OverdueObjectionProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginSessionKey = useAppSelector(selectLoginSessionKey);
  const { toast, showToast, showError, clearToast } = useToast();

  const handledLoginKeyRef = useRef<number | null>(null);
  const sessionAutoPopupRef = useRef(false);

  const [overdueFiles, setOverdueFiles] = useState<FileRecord[]>([]);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overduePage, setOverduePage] = useState(1);
  const [overdueTotalPages, setOverdueTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [viewFile, setViewFile] = useState<FileRecord | null>(null);
  const [ownerUsers, setOwnerUsers] = useState<User[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [objectionTarget, setObjectionTarget] = useState<string | null>(null);
  const [objectionDescription, setObjectionDescription] = useState('');
  const [objectionError, setObjectionError] = useState('');
  const [savingObjection, setSavingObjection] = useState(false);
  const [reviewFile, setReviewFile] = useState<FileRecord | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewUpdatingId, setReviewUpdatingId] = useState<string | null>(null);
  const [reminderTab, setReminderTab] = useState<ObjectionReminderTab>('pending');
  const [followUpFiles, setFollowUpFiles] = useState<FileRecord[]>([]);
  const [followUpTotal, setFollowUpTotal] = useState(0);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [followUpTotalPages, setFollowUpTotalPages] = useState(1);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsLoadingMore, setFollowUpsLoadingMore] = useState(false);
  const [viewFileFromReminder, setViewFileFromReminder] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOverdueFiles([]);
      setOverdueTotal(0);
      setOverduePage(1);
      setOverdueTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchOverdueObjections(user, { overduePage: 1 });
      setOverdueFiles(result.files);
      setOverdueTotal(result.total);
      setOverduePage(result.page);
      setOverdueTotalPages(result.totalPages);
    } catch {
      setOverdueFiles([]);
      setOverdueTotal(0);
      setOverduePage(1);
      setOverdueTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMoreOverdue = useCallback(async () => {
    if (!user || loadingMore || loading) return;
    if (overduePage >= overdueTotalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = overduePage + 1;
      const result = await fetchOverdueObjections(user, { overduePage: nextPage });
      setOverdueFiles((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        const merged = [...prev];
        for (const file of result.files) {
          if (!seen.has(file.id)) merged.push(file);
        }
        return merged;
      });
      setOverdueTotal(result.total);
      setOverduePage(result.page);
      setOverdueTotalPages(result.totalPages);
    } catch {
      /* keep current list */
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, loading, overduePage, overdueTotalPages]);

  const loadFollowUps = useCallback(async () => {
    if (!user || !isAdmin) {
      setFollowUpFiles([]);
      setFollowUpTotal(0);
      setFollowUpPage(1);
      setFollowUpTotalPages(1);
      return;
    }
    setFollowUpsLoading(true);
    try {
      const result = await fetchObjectionFollowUps(user, { page: 1 });
      setFollowUpFiles(result.files);
      setFollowUpTotal(result.total);
      setFollowUpPage(result.page);
      setFollowUpTotalPages(result.totalPages);
    } catch {
      setFollowUpFiles([]);
      setFollowUpTotal(0);
      setFollowUpPage(1);
      setFollowUpTotalPages(1);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [user, isAdmin]);

  const loadMoreFollowUps = useCallback(async () => {
    if (!user || !isAdmin || followUpsLoadingMore || followUpsLoading) return;
    if (followUpPage >= followUpTotalPages) return;
    setFollowUpsLoadingMore(true);
    try {
      const nextPage = followUpPage + 1;
      const result = await fetchObjectionFollowUps(user, { page: nextPage });
      setFollowUpFiles((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        const merged = [...prev];
        for (const file of result.files) {
          if (!seen.has(file.id)) merged.push(file);
        }
        return merged;
      });
      setFollowUpTotal(result.total);
      setFollowUpPage(result.page);
      setFollowUpTotalPages(result.totalPages);
    } catch {
      /* keep list */
    } finally {
      setFollowUpsLoadingMore(false);
    }
  }, [user, isAdmin, followUpsLoadingMore, followUpsLoading, followUpPage, followUpTotalPages]);

  const handleReminderTabChange = useCallback(
    (tab: ObjectionReminderTab) => {
      setReminderTab(tab);
      if (tab === 'followups') void loadFollowUps();
    },
    [loadFollowUps]
  );

  const patchFollowUpFile = useCallback((updated: FileRecord) => {
    setFollowUpFiles((prev) => {
      const hasReviews =
        Array.isArray(updated.objectionReviews) && updated.objectionReviews.length > 0;
      const stillObjection = updated.status === 'objection';
      if (!hasReviews || !stillObjection) {
        return prev.filter((f) => f.id !== updated.id);
      }
      if (prev.some((f) => f.id === updated.id)) {
        return prev.map((f) => (f.id === updated.id ? updated : f));
      }
      return [updated, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!user) {
      handledLoginKeyRef.current = null;
      sessionAutoPopupRef.current = false;
      setOverdueFiles([]);
      setOverdueTotal(0);
      setReminderOpen(false);
      setLoading(false);
      return;
    }
    void load();
  }, [user?.id, location.pathname, load]);

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, load]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    fetchAllUsers()
      .then(setOwnerUsers)
      .catch(() => setOwnerUsers([]));
  }, [isAdmin, user]);

  useEffect(() => {
    if (loading || !user?.id || overdueTotal <= 0) return;

    if (loginSessionKey != null && handledLoginKeyRef.current !== loginSessionKey) {
      setReminderTab('pending');
      setReminderOpen(true);
      handledLoginKeyRef.current = loginSessionKey;
      return;
    }

    if (loginSessionKey == null && !sessionAutoPopupRef.current) {
      sessionAutoPopupRef.current = true;
      setReminderTab('pending');
      setReminderOpen(true);
    }
  }, [loading, user?.id, loginSessionKey, overdueTotal]);

  useEffect(() => {
    if (!reminderOpen || overdueTotal > 0) return;
    // Admin can stay on follow-ups tab (or when follow-ups exist) even if nothing is pending.
    if (isAdmin && (reminderTab === 'followups' || followUpTotal > 0)) return;
    setReminderOpen(false);
  }, [reminderOpen, overdueTotal, isAdmin, reminderTab, followUpTotal]);

  useEffect(() => {
    if (reminderOpen && isAdmin) void loadFollowUps();
  }, [reminderOpen, isAdmin, loadFollowUps]);

  useEffect(() => {
    const onOpen = () => {
      void load();
      setReminderTab('pending');
      setReminderOpen(true);
    };
    window.addEventListener(OBJECTION_REMINDER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OBJECTION_REMINDER_OPEN_EVENT, onOpen);
  }, [load]);

  const openReminder = useCallback(() => {
    void load();
    setReminderTab('pending');
    setReminderOpen(true);
  }, [load]);

  const patchLocalFile = useCallback((id: string, status: FileStatus, remarks?: string) => {
    const changedAt = new Date().toISOString();
    setOverdueFiles((prev) =>
      prev
        .map((f) => (f.id === id ? applyFileStatusUpdate(f, status, changedAt, remarks) : f))
        .filter((f) => isObjectionOverdue(f))
    );
  }, []);

  const patchLocalFileAfterReview = useCallback((updated: FileRecord) => {
    setOverdueFiles((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f)).filter((f) => isObjectionOverdue(f))
    );
    if (viewFile?.id === updated.id) {
      setViewFile(updated);
    }
  }, [viewFile?.id]);

  const closeReviewModal = () => {
    setReviewFile(null);
    setReviewReason('');
    setReviewError('');
  };

  const openReviewModal = (file: FileRecord) => {
    const fresh = overdueFiles.find((f) => f.id === file.id) ?? file;
    setReviewFile(fresh);
    setReviewReason('');
    setReviewError('');
  };

  const assigneeNameForFile = useCallback(
    (file: FileRecord) => {
      if (!isAdmin) return null;
      return (
        ownerUsers.find((u) => u.id === file.createdBy)?.fullName ||
        (user?.id === file.createdBy ? user.fullName : null) ||
        null
      );
    },
    [isAdmin, ownerUsers, user?.id, user?.fullName]
  );

  const closeObjectionModal = () => {
    setObjectionTarget(null);
    setObjectionDescription('');
    setObjectionError('');
  };

  const handleStatusChange = async (id: string, status: FileStatus) => {
    const target = overdueFiles.find((f) => f.id === id);
    if (!target || !user) return;
    if (status === target.status) return;

    const allowed = getAllowedStatusValues(target);
    if (!allowed.includes(status)) {
      if (
        (target.status === 'on_hold' || target.status === 'paper_return') &&
        status !== 'in_progress'
      ) {
        showError('From Hold or Paper Return you can only move the file to In Process');
        return;
      }
      if (hasMissingRequiredDocuments(target)) {
        showError(DOCUMENTS_REQUIRED_MESSAGE);
        return;
      }
      showError('This status change is not allowed');
      return;
    }

    if (status === 'objection') {
      setObjectionTarget(id);
      setObjectionDescription('');
      setObjectionError('');
      return;
    }

    if (status === 'in_progress') {
      if (requiresNewOwner(target.workType) && !hasNewOwnerDetails(target)) {
        showToast('Add new owner name & mobile to move this file to In Process');
        navigate(`/files/${id}/edit?requireNewOwner=1`);
        return;
      }
    }

    setUpdatingStatusId(id);
    try {
      await updateFileStatus(id, status, user);
      patchLocalFile(id, status);
      if (isAdmin && status !== 'objection') {
        setFollowUpFiles((prev) => prev.filter((f) => f.id !== id));
      }
      void load();
      if (isAdmin) void loadFollowUps();
      const label = FILE_STATUSES.find((s) => s.value === status)?.label || status;
      showToast(`Status updated to ${label}`);
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === DOCUMENTS_REQUIRED_CODE) {
        showError(getApiError(err, DOCUMENTS_REQUIRED_MESSAGE));
        return;
      }
      if (code === STATUS_TRANSITION_BLOCKED_CODE) {
        showError(getApiError(err, 'This status change is not allowed'));
        return;
      }
      if (code === 'NEW_OWNER_REQUIRED') {
        showToast('Add new owner name & mobile to move this file to In Process');
        navigate(`/files/${id}/edit?requireNewOwner=1`);
        return;
      }
      showError(getApiError(err, 'Failed to update status'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmReview = async () => {
    if (!reviewFile || !user) return;
    const trimmed = reviewReason.trim();
    if (!trimmed) {
      setReviewError('Please describe why this file is still in Objection.');
      return;
    }
    setReviewError('');
    setSavingReview(true);
    setReviewUpdatingId(reviewFile.id);
    try {
      const data = await submitObjectionReview(reviewFile.id, trimmed);
      const updated = data?.file as FileRecord | undefined;
      if (!updated?.id) {
        setReviewError('Saved but the server response was incomplete. Refresh and try again.');
        return;
      }
      patchLocalFileAfterReview(updated);
      if (isAdmin) patchFollowUpFile(updated);
      closeReviewModal();
      showToast('Follow-up saved — reminder paused for 3 days');
      void load();
      if (isAdmin) void loadFollowUps();
    } catch (err) {
      setReviewError(getApiError(err, 'Failed to save follow-up.'));
    } finally {
      setSavingReview(false);
      setReviewUpdatingId(null);
    }
  };

  const handleConfirmObjection = async () => {
    if (!objectionTarget || !user) return;
    const target = overdueFiles.find((f) => f.id === objectionTarget);
    if (target && hasPendingRequiredDocuments(target)) {
      setObjectionError(DOCUMENTS_REQUIRED_MESSAGE);
      return;
    }
    const trimmed = objectionDescription.trim();
    if (!trimmed) {
      setObjectionError('Description is required.');
      return;
    }
    setObjectionError('');
    setSavingObjection(true);
    try {
      await updateFileStatus(objectionTarget, 'objection', user, trimmed);
      patchLocalFile(objectionTarget, 'objection', trimmed);
      void load();
      closeObjectionModal();
      showToast('Status updated to Objection');
    } catch (err) {
      if (getApiErrorCode(err) === DOCUMENTS_REQUIRED_CODE) {
        setObjectionError(getApiError(err, DOCUMENTS_REQUIRED_MESSAGE));
        return;
      }
      setObjectionError(getApiError(err, 'Failed to update status.'));
    } finally {
      setSavingObjection(false);
    }
  };

  const value = useMemo(
    () =>
      user
        ? {
            overdueCount: overdueTotal,
            loading,
            refresh: load,
            openReminder,
          }
        : emptyOverdueContext,
    [user, overdueTotal, loading, load, openReminder]
  );

  return (
    <OverdueObjectionContext.Provider value={value}>
      {children}

      {user ? (
        <>
          <ObjectionReminderModal
            open={reminderOpen}
            files={overdueFiles}
            totalCount={overdueTotal}
            hasMore={overduePage < overdueTotalPages}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMoreOverdue()}
            updatingId={updatingStatusId}
            onClose={() => setReminderOpen(false)}
            onRemindLater={() => setReminderOpen(false)}
            onViewFile={(file) => {
              setViewFile(file);
              setViewFileFromReminder(true);
            }}
            onOpenReview={openReviewModal}
            reviewUpdatingId={reviewUpdatingId}
            assigneeNameForFile={assigneeNameForFile}
            onStatusChange={handleStatusChange}
            onOpenAll={() => {
              setReminderOpen(false);
              navigate('/files?tab=objection');
            }}
            showStatusControl={isAdmin}
            showAdminTabs={isAdmin}
            activeTab={reminderTab}
            onTabChange={handleReminderTabChange}
            followUpFiles={followUpFiles}
            followUpTotalCount={followUpTotal}
            followUpHasMore={followUpPage < followUpTotalPages}
            followUpLoading={followUpsLoading}
            followUpLoadingMore={followUpsLoadingMore}
            onLoadMoreFollowUps={() => void loadMoreFollowUps()}
          />

          <ObjectionModal
            open={!!objectionTarget}
            description={objectionDescription}
            onDescriptionChange={setObjectionDescription}
            error={objectionError}
            saving={savingObjection}
            onClose={closeObjectionModal}
            onConfirm={handleConfirmObjection}
          />

          <ObjectionReviewModal
            open={!!reviewFile}
            file={reviewFile}
            reason={reviewReason}
            onReasonChange={setReviewReason}
            error={reviewError}
            saving={savingReview}
            showReviewerNames={isAdmin}
            onClose={closeReviewModal}
            onConfirm={handleConfirmReview}
          />

          <FileDetailsModal
            file={viewFile}
            open={!!viewFile}
            elevated={viewFileFromReminder}
            onBack={
              viewFileFromReminder
                ? () => {
                    setViewFile(null);
                    setViewFileFromReminder(false);
                  }
                : undefined
            }
            backLabel="Back to reminder"
            onClose={() => {
              setViewFile(null);
              if (viewFileFromReminder) {
                setReminderOpen(false);
                setViewFileFromReminder(false);
              }
            }}
            users={ownerUsers}
          />

          {toast ? (
            <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />
          ) : null}
        </>
      ) : null}
    </OverdueObjectionContext.Provider>
  );
}
