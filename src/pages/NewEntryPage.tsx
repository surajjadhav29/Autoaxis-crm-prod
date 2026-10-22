import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, type FormikHelpers } from 'formik';
import { Save, CheckCircle, Download, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { SYSTEM_ACCOUNT_EMAIL } from '@/lib/constants';
import {
  createFile,
  downloadExcelTemplate,
  downloadFailedExcelRecords,
  uploadExcelFile,
} from '../services/fileService';
import { FormSteps } from '../components/form/FormField';
import { AnimatedButton } from '../components/form/AnimatedButton';
import FileFormFields from '../components/file/FileFormFields';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  emptyFileValues,
  buildFileValidationSchema,
  fileValuesToPayload,
} from '../lib/fileForm';
import { getApiError } from '../lib/apiError';
import type { FileFormValues } from '@/types/file.types';

const FORM_STEPS = [
  { id: '1', label: 'Dealer' },
  { id: '2', label: 'Vehicle' },
  { id: '3', label: 'Owner' },
];

const validationSchema = buildFileValidationSchema();

function apiErrorMessage(err: unknown, fallback: string) {
  return getApiError(err, fallback);
}

export default function NewEntryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast, showToast, showError, clearToast } = useToast();
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const excelBusy = downloading || uploading;
  const isSystemSuperadmin =
    (user?.email || '').trim().toLowerCase() === SYSTEM_ACCOUNT_EMAIL.toLowerCase();

  const handleSubmit = async (values: FileFormValues, { setSubmitting }: FormikHelpers<FileFormValues>) => {
    setSubmitError('');
    try {
      await createFile(fileValuesToPayload(values), user);
      showToast('File created successfully');
      setSuccess(true);
      setTimeout(() => navigate('/files'), 1800);
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to save file.');
      setSubmitError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadExcelTemplate();
      showToast('Excel format downloaded');
    } catch (err) {
      showError(apiErrorMessage(err, 'Failed to download Excel format'));
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadClick = () => {
    if (excelBusy) return;
    fileInputRef.current?.click();
  };

  const handleExcelSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadExcelFile(file);
      const created = result.createdCount ?? 0;
      const failed = result.failedCount ?? 0;
      const errors = result.errors || [];
      const firstErr = errors[0];

      if (failed > 0) {
        let failedDownloaded = false;
        try {
          await downloadFailedExcelRecords(errors);
          failedDownloaded = true;
        } catch {
          // Don't block toast if failed-file download fails.
        }

        if (created > 0) {
          showError(
            failedDownloaded
              ? `${created} created, ${failed} failed. Failed records Excel downloaded.`
              : `${created} created, ${failed} failed. Could not download failed file.`
          );
        } else {
          showError(
            failedDownloaded
              ? `No files created. Failed records Excel downloaded.${firstErr ? ` ${firstErr.error}` : ''}`
              : `No files created.${firstErr ? ` ${firstErr.error}` : ''}`
          );
        }
      } else if (created > 0) {
        showToast(`${created} file(s) created from Excel`);
        setTimeout(() => navigate('/files'), 1600);
      } else {
        showError('No files created from Excel');
      }
    } catch (err) {
      showError(apiErrorMessage(err, 'Failed to upload Excel file'));
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="crm-page">
        <div className="crm-success-panel crm-animate-in">
          <div className="crm-success-icon">
            <CheckCircle size={48} strokeWidth={1.5} />
          </div>
          <h2 className="crm-success-title">File created successfully</h2>
          <p className="crm-success-sub">Taking you to file records…</p>
          <div className="crm-success-bar">
            <div className="crm-success-bar-fill" />
          </div>
        </div>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onClose={clearToast}
          />
        )}
      </div>
    );
  }

  return (
    <div className="crm-page crm-form-page">
      <div className="crm-form-page-head crm-animate-in">
        <div className="crm-form-page-title-row">
          <div className="crm-page-head min-w-0">
            <h1 className="crm-title">Create file entry</h1>
          </div>
          {isSystemSuperadmin && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                className="crm-btn crm-btn--secondary h-9 shrink-0 px-3 text-[13px] sm:h-auto sm:px-[22px]"
                onClick={handleDownloadTemplate}
                disabled={excelBusy}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="sm:hidden">{downloading ? 'Downloading…' : 'Download Excel'}</span>
                <span className="hidden sm:inline">{downloading ? 'Downloading…' : 'Download Excel format'}</span>
              </button>
              <button
                type="button"
                className="crm-btn crm-btn--primary h-9 shrink-0 px-3 text-[13px] sm:h-auto sm:px-[22px]"
                onClick={handleUploadClick}
                disabled={excelBusy}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                <span className="sm:hidden">{uploading ? 'Uploading…' : 'Upload Excel'}</span>
                <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload Excel file'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                disabled={excelBusy}
                onChange={handleExcelSelected}
              />
            </div>
          )}
        </div>
      </div>

      <Formik
        initialValues={emptyFileValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="crm-form-shell crm-animate-in min-w-0" style={{ animationDelay: '80ms' }}>
            <div className="crm-form-panel min-w-0 overflow-x-hidden">
              <FormSteps steps={FORM_STEPS} />

              <FileFormFields />

              {submitError && <div className="crm-form-alert">{submitError}</div>}

              <div className="crm-form-panel-foot">
                <p className="crm-form-foot-note">
                  <span className="crm-field-req">*</span> Required fields
                </p>
                <div className="crm-form-foot-actions">
                  <AnimatedButton
                    variant="secondary"
                    type="button"
                    onClick={() => navigate('/files')}
                    disabled={isSubmitting || excelBusy}
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    icon={Save}
                    disabled={excelBusy}
                  >
                    Save entry
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={clearToast}
        />
      )}
    </div>
  );
}
