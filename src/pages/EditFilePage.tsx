import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Formik, Form, type FormikHelpers } from 'formik';
import { Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { requiresNewOwner } from '../lib/constants';
import { fetchFileById, updateFile, updateFileStatus } from '../services/fileService';
import { AnimatedButton } from '../components/form/AnimatedButton';
import EmptyData from '../components/EmptyData';
import FileFormFields from '../components/file/FileFormFields';
import {
  buildFileValidationSchema,
  fileToValues,
  fileValuesToPayload,
} from '../lib/fileForm';
import { getApiError, getApiErrorCode } from '../lib/apiError';
import type { FileFormValues, FileRecord } from '@/types/file.types';

export default function EditFilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requireNewOwner = searchParams.get('requireNewOwner') === '1';
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  const validationSchema = useMemo(
    () => buildFileValidationSchema({ requireNewOwner }),
    [requireNewOwner],
  );

  useEffect(() => {
    if (!user || !id) return;
    fetchFileById(id, user)
      .then(setFile)
      .catch(() => setFile(null))
      .finally(() => setLoading(false));
  }, [user, id]);

  const handleSubmit = async (values: FileFormValues, { setSubmitting }: FormikHelpers<FileFormValues>) => {
    setSubmitError('');
    try {
      await updateFile(id, fileValuesToPayload(values), user);
      // If we came here to unblock a status change, advance the file now.
      if (requireNewOwner && requiresNewOwner(values.workType)) {
        try {
          await updateFileStatus(id, 'in_progress', user);
        } catch (statusErr) {
          if (getApiErrorCode(statusErr) === 'DOCUMENTS_REQUIRED') {
            setSubmitError(getApiError(statusErr, 'DOC IS REQUIRED'));
            return;
          }
          /* other status guards — return to list */
        }
      }
      navigate('/files');
    } catch (err) {
      setSubmitError(getApiError(err, 'Failed to update file.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="crm-page">
        <div className="figma-table-empty">
          <div className="figma-table-spinner" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="crm-page">
        <EmptyData
          title="File not found"
          description="This record may have been removed or you do not have access."
          actionLabel="Back to records"
          onAction={() => navigate('/files')}
        />
      </div>
    );
  }

  return (
    <div className="crm-page crm-form-page">
      <div className="crm-form-page-head crm-animate-in">
        <div className="crm-form-page-title-row crm-page-head-row">
          <div className="crm-page-head">
            <h1 className="crm-title">{file.fileNumber}</h1>
          </div>
        </div>
      </div>

      <Formik
        initialValues={fileToValues(file)}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values }) => {
          const newOwnerRequired = requireNewOwner && requiresNewOwner(values.workType);
          return (
            <Form className="crm-form-shell crm-animate-in">
              <div className="crm-form-panel">
                {newOwnerRequired && (
                  <div className="crm-form-notice">
                    <AlertCircle size={16} className="crm-form-notice-icon" />
                    <span>
                      Add the <strong>new owner name</strong> and <strong>mobile number</strong> to
                      move this file to <strong>In Process</strong>. Saving will update the status
                      automatically.
                    </span>
                  </div>
                )}

                <FileFormFields newOwnerRequired={newOwnerRequired} />

                {submitError && <div className="crm-form-alert">{submitError}</div>}

                <div className="crm-form-panel-foot">
                  <p className="crm-form-foot-note">
                    <span className="crm-field-req">*</span> Required fields
                  </p>
                  <div className="crm-form-foot-actions">
                    <AnimatedButton variant="secondary" type="button" onClick={() => navigate('/files')}>
                      Cancel
                    </AnimatedButton>
                    <AnimatedButton type="submit" variant="primary" loading={isSubmitting} icon={Save}>
                      Save changes
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
