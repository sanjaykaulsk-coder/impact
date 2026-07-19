'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { parseCsv } from '@/lib/csv';
import type {
  AvailableAssignmentUser,
  CreatePjpResponse,
  MyAccessResponse,
  PjpDetail,
  PjpRowHistoryEntry,
  PjpRowInput,
  PjpRowResponse,
  PjpSummary,
} from '@impact/shared';
import { useEffect, useRef, useState } from 'react';

type RowAction = 'edit' | 'cancel' | 'postpone' | 'reschedule' | 'reassign' | 'history';

const SAMPLE_CSV = [
  'Visit date,State,District,Tehsil,Location / outlet,Latitude,Longitude,Contact person,Remarks',
  '2026-08-01,Bihar,Patna,Patna Sadar,Haat Ground,25.5941,85.1376,Ramesh Singh,Weekly haat day',
  '2026-08-02,Bihar,Patna,Danapur,Danapur Cantt Market,25.6269,85.0446,,',
].join('\n');

type ExpectedField =
  | 'date'
  | 'stateName'
  | 'districtName'
  | 'tehsilName'
  | 'locationName'
  | 'latitude'
  | 'longitude'
  | 'contactPerson'
  | 'remarks';

const EXPECTED_FIELDS: { key: ExpectedField; label: string; required: boolean; aliases: string[] }[] = [
  { key: 'date', label: 'Visit date', required: true, aliases: ['date', 'visit date', 'plan date'] },
  { key: 'stateName', label: 'State', required: true, aliases: ['state', 'statename'] },
  { key: 'districtName', label: 'District', required: true, aliases: ['district', 'districtname'] },
  { key: 'tehsilName', label: 'Tehsil', required: true, aliases: ['tehsil', 'taluka', 'block'] },
  { key: 'locationName', label: 'Location / outlet', required: true, aliases: ['location', 'outlet', 'market', 'site', 'locationname'] },
  { key: 'latitude', label: 'Latitude (optional)', required: false, aliases: ['latitude', 'lat'] },
  { key: 'longitude', label: 'Longitude (optional)', required: false, aliases: ['longitude', 'lng', 'long'] },
  { key: 'contactPerson', label: 'Contact person (optional)', required: false, aliases: ['contact', 'contactperson', 'contact person'] },
  { key: 'remarks', label: 'Remarks (optional)', required: false, aliases: ['remarks', 'notes', 'comment'] },
];

function autoMapColumns(headers: string[]): Record<ExpectedField, number> {
  const mapping = {} as Record<ExpectedField, number>;
  for (const field of EXPECTED_FIELDS) mapping[field.key] = -1;
  headers.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    for (const field of EXPECTED_FIELDS) {
      if (mapping[field.key] === -1 && field.aliases.includes(norm)) mapping[field.key] = i;
    }
  });
  return mapping;
}

function rowIsValid(row: PjpRowInput): boolean {
  if (!row.date || Number.isNaN(Date.parse(row.date))) return false;
  if (!row.stateName?.trim() || !row.districtName?.trim() || !row.tehsilName?.trim() || !row.locationName?.trim()) return false;
  if (row.latitude !== undefined && (row.latitude < -90 || row.latitude > 90)) return false;
  if (row.longitude !== undefined && (row.longitude < -180 || row.longitude > 180)) return false;
  return true;
}

export default function PjpPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [pjps, setPjps] = useState<PjpSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<ExpectedField, number> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CreatePjpResponse | null>(null);

  const [openPjpId, setOpenPjpId] = useState<string | null>(null);
  const [openPjpDetail, setOpenPjpDetail] = useState<PjpDetail | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [managingRowId, setManagingRowId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<RowAction | null>(null);
  const [rowActionSaving, setRowActionSaving] = useState(false);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [rowActionNotice, setRowActionNotice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ locationName?: string; contactPerson?: string; remarks?: string }>({});
  const [dateForm, setDateForm] = useState<{ newDate?: string; reason?: string }>({});
  const [cancelReason, setCancelReason] = useState('');
  const [reassignSupervisorId, setReassignSupervisorId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [availableSupervisors, setAvailableSupervisors] = useState<AvailableAssignmentUser[] | null>(null);
  const [rowHistory, setRowHistory] = useState<PjpRowHistoryEntry[] | null>(null);

  const [addingManual, setAddingManual] = useState(false);
  const [manualForm, setManualForm] = useState<PjpRowInput>({});
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  const canManage = access?.permissions.includes('manage_pjp') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadPjps = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.pjp.list(selectedCampaignId).then(setPjps).catch((err) => setError(err instanceof Error ? err.message : 'Could not load PJPs'));
  };

  useEffect(() => {
    loadPjps();
    setOpenPjpId(null);
    setOpenPjpDetail(null);
    resetUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    api.myAccess(selectedCampaignId).then((res) => {
      if (!cancelled) setAccess(res);
    }).catch(() => {
      if (!cancelled) setAccess(null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const resetUpload = () => {
    setFileName(null);
    setHeaders([]);
    setDataRows([]);
    setMapping(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFileChosen = async (file: File) => {
    setError(null);
    setImportResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError('That CSV has no data rows below the header.');
      return;
    }
    const [headerRow, ...rows] = parsed;
    setFileName(file.name);
    setHeaders(headerRow);
    setDataRows(rows);
    setMapping(autoMapColumns(headerRow));
  };

  const rowsFromMapping = (): PjpRowInput[] => {
    if (!mapping) return [];
    return dataRows.map((r) => {
      const get = (field: ExpectedField) => {
        const idx = mapping[field];
        return idx >= 0 ? r[idx]?.trim() : undefined;
      };
      const latRaw = get('latitude');
      const lngRaw = get('longitude');
      return {
        date: get('date'),
        stateName: get('stateName'),
        districtName: get('districtName'),
        tehsilName: get('tehsilName'),
        locationName: get('locationName'),
        latitude: latRaw ? Number(latRaw) : undefined,
        longitude: lngRaw ? Number(lngRaw) : undefined,
        contactPerson: get('contactPerson') || undefined,
        remarks: get('remarks') || undefined,
      };
    });
  };

  const previewRows = rowsFromMapping().slice(0, 10);
  const invalidPreviewCount = rowsFromMapping().filter((r) => !rowIsValid(r)).length;

  const submitImport = async () => {
    if (!selectedCampaignId || !fileName) return;
    setImporting(true);
    setError(null);
    try {
      const result = await api.pjp.create(selectedCampaignId, { fileName, rows: rowsFromMapping() });
      setImportResult(result);
      loadPjps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not import PJP');
    } finally {
      setImporting(false);
    }
  };

  const submitManualLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setManualSaving(true);
    setError(null);
    setManualSuccess(null);
    try {
      await api.pjp.addManualLocation(selectedCampaignId, manualForm);
      setManualSuccess(`Added "${manualForm.locationName}" — it's ready to assign right away.`);
      setManualForm({});
      loadPjps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that location');
    } finally {
      setManualSaving(false);
    }
  };

  const openPjp = async (pjpId: string) => {
    if (!selectedCampaignId) return;
    setOpenPjpId(pjpId);
    setError(null);
    try {
      const detail = await api.pjp.get(selectedCampaignId, pjpId);
      setOpenPjpDetail(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load PJP');
    }
  };

  const publishPjp = async (pjpId: string) => {
    if (!selectedCampaignId) return;
    setPublishing(true);
    setError(null);
    try {
      await api.pjp.publish(selectedCampaignId, pjpId);
      loadPjps();
      openPjp(pjpId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish PJP');
    } finally {
      setPublishing(false);
    }
  };

  const closeRowManagement = () => {
    setManagingRowId(null);
    setActiveAction(null);
    setRowActionError(null);
    setEditForm({});
    setDateForm({});
    setCancelReason('');
    setReassignSupervisorId('');
    setReassignReason('');
    setRowHistory(null);
  };

  const startManagingRow = (row: PjpRowResponse) => {
    setManagingRowId(row.id);
    setActiveAction(null);
    setRowActionError(null);
    setRowActionNotice(null);
    setEditForm({ locationName: row.locationName, contactPerson: row.contactPerson ?? '', remarks: row.remarks ?? '' });
    setDateForm({ newDate: row.date.slice(0, 10) });
    setReassignSupervisorId(row.supervisorUserId ?? '');
  };

  const chooseAction = async (action: RowAction) => {
    setActiveAction(action);
    setRowActionError(null);
    if (action === 'reassign' && selectedCampaignId && !availableSupervisors) {
      try {
        setAvailableSupervisors(await api.assignments.availableUsers(selectedCampaignId));
      } catch {
        setAvailableSupervisors([]);
      }
    }
    if (action === 'history' && selectedCampaignId && openPjpId && managingRowId) {
      try {
        setRowHistory(await api.pjp.rowHistory(selectedCampaignId, openPjpId, managingRowId));
      } catch (err) {
        setRowActionError(err instanceof ApiError ? err.message : 'Could not load history for this stop');
      }
    }
  };

  const afterRowAction = async (message: string) => {
    if (!selectedCampaignId || !openPjpId) return;
    setRowActionNotice(message);
    const detail = await api.pjp.get(selectedCampaignId, openPjpId);
    setOpenPjpDetail(detail);
    setActiveAction(null);
  };

  const saveEdit = async () => {
    if (!selectedCampaignId || !openPjpId || !managingRowId) return;
    setRowActionSaving(true);
    setRowActionError(null);
    try {
      await api.pjp.updateRow(selectedCampaignId, openPjpId, managingRowId, editForm);
      await afterRowAction('Saved.');
    } catch (err) {
      setRowActionError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setRowActionSaving(false);
    }
  };

  const submitCancel = async () => {
    if (!selectedCampaignId || !openPjpId || !managingRowId) return;
    setRowActionSaving(true);
    setRowActionError(null);
    try {
      await api.pjp.cancelRow(selectedCampaignId, openPjpId, managingRowId, { reason: cancelReason || undefined });
      await afterRowAction('This stop has been cancelled.');
    } catch (err) {
      setRowActionError(err instanceof ApiError ? err.message : 'Could not cancel this stop');
    } finally {
      setRowActionSaving(false);
    }
  };

  const submitPostpone = async () => {
    if (!selectedCampaignId || !openPjpId || !managingRowId || !dateForm.newDate) return;
    setRowActionSaving(true);
    setRowActionError(null);
    try {
      await api.pjp.postponeRow(selectedCampaignId, openPjpId, managingRowId, { newDate: dateForm.newDate, reason: dateForm.reason || undefined });
      await afterRowAction(`Postponed to ${dateForm.newDate}.`);
    } catch (err) {
      setRowActionError(err instanceof ApiError ? err.message : 'Could not postpone this stop');
    } finally {
      setRowActionSaving(false);
    }
  };

  const submitReschedule = async () => {
    if (!selectedCampaignId || !openPjpId || !managingRowId || !dateForm.newDate) return;
    setRowActionSaving(true);
    setRowActionError(null);
    try {
      await api.pjp.rescheduleRow(selectedCampaignId, openPjpId, managingRowId, { newDate: dateForm.newDate, reason: dateForm.reason || undefined });
      await afterRowAction(`Rescheduled to ${dateForm.newDate}.`);
    } catch (err) {
      setRowActionError(err instanceof ApiError ? err.message : 'Could not reschedule this stop');
    } finally {
      setRowActionSaving(false);
    }
  };

  const submitReassign = async () => {
    if (!selectedCampaignId || !openPjpId || !managingRowId || !reassignSupervisorId) return;
    setRowActionSaving(true);
    setRowActionError(null);
    try {
      await api.pjp.reassignRow(selectedCampaignId, openPjpId, managingRowId, {
        supervisorUserId: reassignSupervisorId,
        reason: reassignReason || undefined,
      });
      await afterRowAction('Supervisor reassigned.');
    } catch (err) {
      setRowActionError(err instanceof ApiError ? err.message : 'Could not reassign this stop');
    } finally {
      setRowActionSaving(false);
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pjp-sample-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to upload its PJP.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>PJP Upload — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {canManage && (
        <div className="panel">
          <h2>Upload a route plan (CSV)</h2>
          <p className="subtitle">
            Expected columns: {EXPECTED_FIELDS.map((f) => f.label.replace(' (optional)', '')).join(', ')}. Header
            names are matched automatically where possible — adjust any mapping below before importing. Not sure of
            the format? <button type="button" className="btn-secondary" onClick={downloadSampleCsv}>Download a sample CSV</button> — open it in Excel, fill in your rows, and save as CSV to upload here.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChosen(file);
            }}
          />

          {mapping && (
            <>
              <h2 style={{ marginTop: 20 }}>Column mapping</h2>
              <div className="form-grid">
                {EXPECTED_FIELDS.map((field) => (
                  <div className="field" key={field.key}>
                    <label>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    <select
                      value={mapping[field.key]}
                      onChange={(e) => setMapping((m) => (m ? { ...m, [field.key]: Number(e.target.value) } : m))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
                      <option value={-1}>— not mapped —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <h2 style={{ marginTop: 20 }}>
                Preview ({dataRows.length} row{dataRows.length === 1 ? '' : 's'} detected, first 10 shown
                {invalidPreviewCount > 0 ? `, ${invalidPreviewCount} look invalid` : ''})
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Valid</th>
                      {EXPECTED_FIELDS.map((f) => (
                        <th key={f.key}>{f.label.replace(' (optional)', '')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge status-${rowIsValid(r) ? 'active' : 'inactive'}`}>
                            {rowIsValid(r) ? 'OK' : 'Invalid'}
                          </span>
                        </td>
                        <td>{r.date}</td>
                        <td>{r.stateName}</td>
                        <td>{r.districtName}</td>
                        <td>{r.tehsilName}</td>
                        <td>{r.locationName}</td>
                        <td>{r.latitude ?? ''}</td>
                        <td>{r.longitude ?? ''}</td>
                        <td>{r.contactPerson ?? ''}</td>
                        <td>{r.remarks ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel-actions" style={{ marginTop: 16 }}>
                <button className="btn-primary inline" onClick={submitImport} disabled={importing}>
                  {importing ? 'Importing…' : `Import ${dataRows.length} rows`}
                </button>
                <button className="btn-secondary" onClick={resetUpload}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {importResult && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <p>
                Imported <strong>{importResult.rows.length}</strong> of {importResult.totalRows} rows.{' '}
                {importResult.invalidRows > 0 && (
                  <span style={{ color: 'var(--danger)' }}>{importResult.invalidRows} row(s) were skipped.</span>
                )}
              </p>
              {importResult.invalidRowDetails.length > 0 && (
                <ul style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {importResult.invalidRowDetails.map((iv) => (
                    <li key={iv.rowIndex}>
                      Row {iv.rowIndex + 1}: {iv.reasons.join('; ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: addingManual ? 16 : 0 }}>
            <h2 style={{ margin: 0 }}>Add a location manually</h2>
            {!addingManual && (
              <button className="btn-secondary" onClick={() => setAddingManual(true)}>
                + Add a location
              </button>
            )}
          </div>
          <p className="subtitle" style={{ marginTop: addingManual ? 0 : 8 }}>
            No PJP uploaded yet, or just need one more stop? Add a single location here — it's
            ready to assign immediately, no CSV needed.
          </p>

          {addingManual && (
            <form onSubmit={submitManualLocation}>
              <div className="form-grid">
                <div className="field">
                  <label>Visit date *</label>
                  <input
                    required
                    type="date"
                    value={manualForm.date ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>State *</label>
                  <input
                    required
                    value={manualForm.stateName ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, stateName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>District *</label>
                  <input
                    required
                    value={manualForm.districtName ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, districtName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Tehsil *</label>
                  <input
                    required
                    value={manualForm.tehsilName ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, tehsilName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Location / outlet *</label>
                  <input
                    required
                    value={manualForm.locationName ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, locationName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Latitude (optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={manualForm.latitude ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div className="field">
                  <label>Longitude (optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={manualForm.longitude ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div className="field">
                  <label>Contact person (optional)</label>
                  <input
                    value={manualForm.contactPerson ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Remarks (optional)</label>
                  <input
                    value={manualForm.remarks ?? ''}
                    onChange={(e) => setManualForm((f) => ({ ...f, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <div className="panel-actions">
                <button className="btn-primary inline" type="submit" disabled={manualSaving}>
                  {manualSaving ? 'Adding…' : 'Add location'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAddingManual(false)}>
                  Close
                </button>
              </div>
            </form>
          )}

          {manualSuccess && (
            <p style={{ marginTop: 16, color: 'var(--brand-primary)', fontSize: 14 }}>{manualSuccess}</p>
          )}
        </div>
      )}

      {openPjpId && openPjpDetail && (
        <div className="panel">
          <h2>
            {openPjpDetail.fileName}{' '}
            <span className={`badge status-${openPjpDetail.status === 'PUBLISHED' ? 'active' : 'inactive'}`} style={{ marginLeft: 8 }}>
              {openPjpDetail.status}
            </span>
          </h2>
          <p className="subtitle">
            {openPjpDetail.totalRows} total, {openPjpDetail.invalidRows} invalid, {openPjpDetail.rows.length} active rows.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>State</th>
                  <th>District</th>
                  <th>Tehsil</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Supervisor</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {openPjpDetail.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date.slice(0, 10)}</td>
                    <td>{r.stateName}</td>
                    <td>{r.districtName}</td>
                    <td>{r.tehsilName}</td>
                    <td>{r.locationName}</td>
                    <td>{r.contactPerson ?? ''}</td>
                    <td>
                      <span className={`badge status-${r.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{r.status}</span>
                    </td>
                    <td>{r.supervisorName ?? '—'}</td>
                    {canManage && (
                      <td>
                        <button className="btn-secondary" onClick={() => startManagingRow(r)}>
                          Manage
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {managingRowId && (() => {
            const row = openPjpDetail.rows.find((r) => r.id === managingRowId);
            if (!row) return null;
            return (
              <div className="panel" style={{ marginTop: 16, background: 'var(--surface-alt, #f7f7f7)' }}>
                <div className="toolbar">
                  <h3 style={{ margin: 0 }}>
                    Manage stop — {row.locationName} ({row.date.slice(0, 10)})
                  </h3>
                  <button className="btn-secondary" onClick={closeRowManagement}>
                    Close
                  </button>
                </div>

                {rowActionError && <div className="error-banner">{rowActionError}</div>}
                {rowActionNotice && !rowActionError && <p style={{ color: 'var(--brand-primary)', fontSize: 14 }}>{rowActionNotice}</p>}

                <div className="panel-actions" style={{ marginBottom: 16 }}>
                  <button className="btn-secondary" onClick={() => chooseAction('edit')}>
                    Edit
                  </button>
                  <button className="btn-secondary" onClick={() => chooseAction('cancel')} disabled={row.status === 'CANCELLED'}>
                    Cancel
                  </button>
                  <button className="btn-secondary" onClick={() => chooseAction('postpone')}>
                    Postpone
                  </button>
                  <button className="btn-secondary" onClick={() => chooseAction('reschedule')}>
                    Reschedule
                  </button>
                  <button className="btn-secondary" onClick={() => chooseAction('reassign')}>
                    Reassign supervisor
                  </button>
                  <button className="btn-secondary" onClick={() => chooseAction('history')}>
                    History
                  </button>
                </div>

                {activeAction === 'edit' && (
                  <div className="form-grid">
                    <div className="field">
                      <label>Location / outlet</label>
                      <input
                        value={editForm.locationName ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, locationName: e.target.value }))}
                      />
                    </div>
                    <div className="field">
                      <label>Contact person</label>
                      <input
                        value={editForm.contactPerson ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, contactPerson: e.target.value }))}
                      />
                    </div>
                    <div className="field">
                      <label>Remarks</label>
                      <input value={editForm.remarks ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))} />
                    </div>
                    <div className="panel-actions">
                      <button className="btn-primary inline" onClick={saveEdit} disabled={rowActionSaving}>
                        {rowActionSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                )}

                {activeAction === 'cancel' && (
                  <div className="form-grid">
                    <div className="field">
                      <label>Reason (optional)</label>
                      <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    </div>
                    <div className="panel-actions">
                      <button className="btn-primary inline" onClick={submitCancel} disabled={rowActionSaving}>
                        {rowActionSaving ? 'Cancelling…' : 'Cancel this stop'}
                      </button>
                    </div>
                  </div>
                )}

                {(activeAction === 'postpone' || activeAction === 'reschedule') && (
                  <div className="form-grid">
                    <div className="field">
                      <label>New date</label>
                      <input
                        type="date"
                        value={dateForm.newDate ?? ''}
                        onChange={(e) => setDateForm((f) => ({ ...f, newDate: e.target.value }))}
                      />
                    </div>
                    <div className="field">
                      <label>Reason (optional)</label>
                      <input value={dateForm.reason ?? ''} onChange={(e) => setDateForm((f) => ({ ...f, reason: e.target.value }))} />
                    </div>
                    <div className="panel-actions">
                      <button
                        className="btn-primary inline"
                        onClick={activeAction === 'postpone' ? submitPostpone : submitReschedule}
                        disabled={rowActionSaving || !dateForm.newDate}
                      >
                        {rowActionSaving ? 'Saving…' : activeAction === 'postpone' ? 'Postpone' : 'Reschedule'}
                      </button>
                    </div>
                  </div>
                )}

                {activeAction === 'reassign' && (
                  <div className="form-grid">
                    <div className="field">
                      <label>New supervisor</label>
                      <select
                        value={reassignSupervisorId}
                        onChange={(e) => setReassignSupervisorId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                      >
                        <option value="">— select —</option>
                        {(availableSupervisors ?? []).map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.fullName} ({u.roleName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Reason (optional)</label>
                      <input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} />
                    </div>
                    <div className="panel-actions">
                      <button className="btn-primary inline" onClick={submitReassign} disabled={rowActionSaving || !reassignSupervisorId}>
                        {rowActionSaving ? 'Saving…' : 'Reassign'}
                      </button>
                    </div>
                  </div>
                )}

                {activeAction === 'history' && (
                  <div>
                    {rowHistory === null ? (
                      <p className="subtitle">Loading…</p>
                    ) : rowHistory.length === 0 ? (
                      <p className="subtitle">No changes recorded yet for this stop.</p>
                    ) : (
                      <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                        {rowHistory.map((h) => (
                          <li key={h.id} style={{ marginBottom: 6 }}>
                            <strong>{h.action.replace('PJP_ROW_', '').replaceAll('_', ' ')}</strong> by {h.actorName ?? 'unknown user'} —{' '}
                            {new Date(h.createdAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="panel-actions" style={{ marginTop: 16 }}>
            {canManage && openPjpDetail.status === 'DRAFT' && (
              <button className="btn-primary inline" onClick={() => publishPjp(openPjpDetail.id)} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={() => {
                setOpenPjpId(null);
                closeRowManagement();
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        {pjps === null ? (
          <p className="subtitle">Loading…</p>
        ) : pjps.length === 0 ? (
          <p className="subtitle">No PJPs uploaded yet for this campaign.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Invalid</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {pjps.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => openPjp(p.id)}>
                  <td>{p.fileName}</td>
                  <td>
                    <span className={`badge status-${p.status === 'PUBLISHED' ? 'active' : 'inactive'}`}>{p.status}</span>
                  </td>
                  <td>{p.totalRows}</td>
                  <td>{p.invalidRows}</td>
                  <td>{p.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
