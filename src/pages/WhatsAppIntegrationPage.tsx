import { useMemo, useState } from 'react';
import {
  FigmaActionsCell,
  FigmaBodyRow,
  FigmaCell,
  FigmaFeatureCell,
  FigmaHeaderRow,
  FigmaLicenseCell,
  FigmaSortHeader,
  FigmaTable,
} from '../components/table/FigmaTable';
import { WHATSAPP_FEATURES } from '../lib/whatsappFeatures';

type FeatureSortKey = 'id' | 'name' | 'licenseType' | 'date';

export default function WhatsAppIntegrationPage() {
  const [sortKey, setSortKey] = useState<FeatureSortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    return [...WHATSAPP_FEATURES].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [sortKey, sortDir]);

  const toggleSort = (key: FeatureSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="figma-table-page">
      <FigmaTable>
        <FigmaHeaderRow>
          <FigmaCell variant="font">
            <FigmaSortHeader label="Font" onClick={() => toggleSort('name')} />
          </FigmaCell>
          <FigmaCell variant="license">
            <FigmaSortHeader label="License usage" onClick={() => toggleSort('licenseType')} />
          </FigmaCell>
          <FigmaCell variant="scope">
            <FigmaSortHeader label="Import scope" sortable={false} />
          </FigmaCell>
          <FigmaCell variant="date">
            <FigmaSortHeader label="Import date" onClick={() => toggleSort('date')} />
          </FigmaCell>
          <FigmaCell variant="access">
            <FigmaSortHeader label="Access" onClick={() => toggleSort('id')} />
          </FigmaCell>
          <FigmaCell variant="actions">
            <FigmaSortHeader label="Actions" sortable={false} />
          </FigmaCell>
        </FigmaHeaderRow>

        {rows.map((row) => (
          <FigmaBodyRow key={row.id}>
            <FigmaCell variant="font">
              <FigmaFeatureCell
                name={row.name}
                state={row.state as 'ok' | 'warn' | 'err'}
                icon={row.icon === 'monitor' ? 'monitor' : 'globe'}
                tag={row.tag || undefined}
              />
            </FigmaCell>
            <FigmaCell variant="license">
              <FigmaLicenseCell
                type={row.licenseType as 'pill-active' | 'pill-missing' | 'pill-expiring' | 'pill-expired' | 'pill-overused' | 'progress-blue' | 'progress-red'}
                progress={row.progress}
              />
            </FigmaCell>
            <FigmaCell variant="scope">
              <span className={row.scopeAlert ? 'figma-td-text figma-td-text--alert' : 'figma-td-text'}>
                {row.scope}
              </span>
            </FigmaCell>
            <FigmaCell variant="date">
              <span className={row.dateAlert ? 'figma-td-text figma-td-text--alert' : 'figma-td-text'}>
                {row.date}
              </span>
            </FigmaCell>
            <FigmaCell variant="access">
              <button type="button" className="figma-access-num">{row.id}</button>
            </FigmaCell>
            <FigmaCell variant="actions">
              <FigmaActionsCell label={row.action} />
            </FigmaCell>
          </FigmaBodyRow>
        ))}
      </FigmaTable>
    </div>
  );
}
