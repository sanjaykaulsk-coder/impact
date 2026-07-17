'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  ConditionalAction,
  FieldType,
  FormArchetype,
  FormTemplateDetail,
  FormTemplateSummary,
  MyAccessResponse,
  UpsertDraftQuestion,
} from '@impact/shared';
import { useEffect, useState } from 'react';

// Stage 3.1: the full field-type palette (all 35+ schema types, grouped), per-field controls,
// validation rules, a multi-rule conditional logic builder, archetype presets and mid-campaign
// SKU sync. The publish flow (freeze + clone) is unchanged from Session A.
const FIELD_TYPE_GROUPS: { group: string; types: { value: FieldType; label: string }[] }[] = [
  {
    group: 'Text',
    types: [
      { value: 'SHORT_TEXT', label: 'Short text' },
      { value: 'LONG_TEXT', label: 'Long text' },
      { value: 'REMARKS', label: 'Remarks' },
    ],
  },
  {
    group: 'Numbers',
    types: [
      { value: 'INTEGER', label: 'Number (whole)' },
      { value: 'DECIMAL', label: 'Decimal' },
      { value: 'CURRENCY', label: 'Currency (₹)' },
      { value: 'PERCENTAGE', label: 'Percentage' },
      { value: 'MEASUREMENT', label: 'Measurement' },
    ],
  },
  {
    group: 'Date & time',
    types: [
      { value: 'DATE', label: 'Date' },
      { value: 'TIME', label: 'Time' },
      { value: 'DATETIME', label: 'Date + time' },
    ],
  },
  {
    group: 'Choice',
    types: [
      { value: 'DROPDOWN', label: 'Dropdown' },
      { value: 'RADIO', label: 'Radio' },
      { value: 'MULTI_SELECT', label: 'Multi-select' },
      { value: 'CHECKBOX', label: 'Checkboxes' },
      { value: 'YES_NO', label: 'Yes / No' },
      { value: 'RATING', label: 'Rating (1-5)' },
    ],
  },
  {
    group: 'Media & evidence',
    types: [
      { value: 'PHOTO', label: 'Photo (camera-only)' },
      { value: 'MULTIPLE_PHOTOS', label: 'Multiple photos' },
      { value: 'SHORT_VIDEO', label: 'Short video' },
      { value: 'SIGNATURE', label: 'Signature' },
      { value: 'DOCUMENT', label: 'Document' },
    ],
  },
  {
    group: 'Location',
    types: [{ value: 'GPS', label: 'GPS location' }],
  },
  {
    group: 'Identity blocks',
    types: [
      { value: 'RETAILER_DETAILS', label: 'Retailer / outlet details' },
      { value: 'CONSUMER_DETAILS', label: 'Consumer details' },
    ],
  },
  {
    group: 'SKU & sales',
    types: [
      { value: 'SKU_SELECTOR', label: 'SKU selector' },
      { value: 'QUANTITY', label: 'Quantity' },
      { value: 'SALES_VALUE', label: 'Sales value' },
      { value: 'STOCK_VALUE', label: 'Stock value' },
    ],
  },
  {
    group: 'Auto-filled',
    types: [
      { value: 'AUTO_TIMESTAMP', label: 'Auto: timestamp' },
      { value: 'AUTO_USER', label: 'Auto: user' },
      { value: 'AUTO_ACTIVITY_ID', label: 'Auto: activity ID' },
      { value: 'AUTO_CAMPAIGN_ID', label: 'Auto: campaign ID' },
      { value: 'AUTO_LOCATION', label: 'Auto: location' },
      { value: 'AUTO_CALCULATED', label: 'Auto: calculated (formula)' },
    ],
  },
  {
    group: 'Workflow',
    types: [{ value: 'APPROVAL_STATUS', label: 'Approval status' }],
  },
];

const CHOICE_TYPES: FieldType[] = ['DROPDOWN', 'RADIO', 'MULTI_SELECT', 'CHECKBOX'];
const TEXT_TYPES: FieldType[] = ['SHORT_TEXT', 'LONG_TEXT', 'REMARKS'];
const NUMERIC_TYPES: FieldType[] = ['INTEGER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE', 'MEASUREMENT', 'QUANTITY', 'SALES_VALUE', 'STOCK_VALUE'];

const CONDITIONAL_ACTIONS: { value: ConditionalAction; label: string }[] = [
  { value: 'SHOW', label: 'Show' },
  { value: 'HIDE', label: 'Hide' },
  { value: 'REQUIRE', label: 'Require' },
  { value: 'OPTIONAL', label: 'Make optional' },
];

const ARCHETYPES: { value: FormArchetype | ''; label: string; hint: string }[] = [
  { value: '', label: 'Blank form', hint: 'Start from an empty form' },
  { value: 'PROFILE', label: 'Profile (record-level)', hint: 'One record per outlet/consumer visited, with per-SKU sales — the DFR rolls up from this' },
  { value: 'DFR', label: 'DFR (daily team summary)', hint: 'One record per team per day, for campaigns without outlet-level granularity' },
  { value: 'STOCK_RECONCILIATION', label: 'Stock reconciliation', hint: 'Per-SKU opening/received/sold/scheme/sampled/damaged/closing, keyed by invoice' },
  { value: 'ENQUIRY_LEADS', label: 'Enquiry / leads', hint: 'Lead capture with temperature and customer type — no SKU columns' },
];

let keyCounter = 0;
const newKey = () => `q${Date.now()}_${keyCounter++}`;

interface QuestionState {
  key: string;
  fieldType: FieldType;
  label: string;
  helpText: string;
  isMandatory: boolean;
  optionsCsv: string;
  formulaExpression: string;
  validationPattern: string;
  validationMessage: string;
  min: string;
  max: string;
  maxLength: string;
  maxCount: string;
  maxDurationSec: string;
  // Opaque pass-through (preserves skuBinding and any control this UI doesn't edit).
  controlsJson: Record<string, unknown>;
}

interface SectionState {
  title: string;
  questions: QuestionState[];
}

interface RuleState {
  triggerKey: string;
  triggerValue: string;
  action: ConditionalAction;
  targetKey: string;
}

function parseTriggerValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

function emptyQuestion(): QuestionState {
  return {
    key: newKey(),
    fieldType: 'SHORT_TEXT',
    label: '',
    helpText: '',
    isMandatory: false,
    optionsCsv: '',
    formulaExpression: '',
    validationPattern: '',
    validationMessage: '',
    min: '',
    max: '',
    maxLength: '',
    maxCount: '',
    maxDurationSec: '',
    controlsJson: {},
  };
}

function isSkuBound(q: QuestionState): boolean {
  return typeof q.controlsJson === 'object' && q.controlsJson !== null && 'skuBinding' in q.controlsJson;
}

export default function FormsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [templates, setTemplates] = useState<FormTemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newArchetype, setNewArchetype] = useState<FormArchetype | ''>('');
  const [createSaving, setCreateSaving] = useState(false);

  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FormTemplateDetail | null>(null);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [rules, setRules] = useState<RuleState[]>([]);
  const [draftSaving, setDraftSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const canManage = access?.permissions.includes('manage_forms') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadTemplates = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api
      .forms.list(selectedCampaignId)
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load forms'));
  };

  useEffect(() => {
    loadTemplates();
    setOpenTemplateId(null);
    setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    api
      .myAccess(selectedCampaignId)
      .then((res) => {
        if (!cancelled) setAccess(res);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const loadIntoBuilder = (loaded: FormTemplateDetail) => {
    setDetail(loaded);
    const draft = loaded.versions.find((v) => v.status === 'DRAFT');
    if (!draft) {
      setSections([]);
      setRules([]);
      return;
    }

    // Every question gets a fresh client-side key; keep a map from the server's question id to
    // that new key so existing conditional rules (which reference server ids) can be re-pointed
    // at the regenerated keys the rule UI actually uses.
    const idToNewKey = new Map<string, string>();
    setSections(
      draft.sections.map((s) => ({
        title: s.title,
        questions: s.questions.map((q) => {
          const key = newKey();
          idToNewKey.set(q.id, key);
          const controls = (q.controlsJson ?? {}) as Record<string, unknown>;
          const patternRule = q.validationRules?.find((r) => r.ruleType === 'pattern');
          const patternConfig = (patternRule?.configJson ?? {}) as { pattern?: string; message?: string };
          return {
            key,
            fieldType: q.fieldType,
            label: q.label,
            helpText: q.helpText ?? '',
            isMandatory: q.isMandatory,
            optionsCsv: q.options.map((o) => o.label).join(', '),
            formulaExpression: q.formulaExpression ?? '',
            validationPattern: patternConfig.pattern ?? '',
            validationMessage: patternConfig.message ?? '',
            min: controls.min !== undefined ? String(controls.min) : '',
            max: controls.max !== undefined ? String(controls.max) : '',
            maxLength: controls.maxLength !== undefined ? String(controls.maxLength) : '',
            maxCount: controls.maxCount !== undefined ? String(controls.maxCount) : '',
            maxDurationSec: controls.maxDurationSec !== undefined ? String(controls.maxDurationSec) : '',
            controlsJson: controls,
          };
        }),
      })),
    );

    setRules(
      draft.conditionalRules.map((r) => ({
        triggerKey: idToNewKey.get(r.triggerQuestionId) ?? '',
        triggerValue:
          typeof r.triggerValueJson === 'boolean' ? String(r.triggerValueJson) : String(r.triggerValueJson ?? ''),
        action: r.action,
        targetKey: idToNewKey.get(r.targetQuestionId) ?? '',
      })),
    );
  };

  const openTemplate = async (templateId: string) => {
    setOpenTemplateId(templateId);
    setError(null);
    setNotice(null);
    try {
      const loaded = await api.forms.get(selectedCampaignId!, templateId);
      loadIntoBuilder(loaded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load form');
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setCreateSaving(true);
    setError(null);
    try {
      const created = await api.forms.create(selectedCampaignId, {
        name: newName,
        description: newDescription || undefined,
        archetype: newArchetype || undefined,
      });
      setNewName('');
      setNewDescription('');
      setNewArchetype('');
      setCreating(false);
      loadTemplates();
      openTemplate(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create form');
    } finally {
      setCreateSaving(false);
    }
  };

  const updateQuestion = (si: number, qi: number, patch: Partial<QuestionState>) =>
    setSections((s) =>
      s.map((sec, i) =>
        i === si
          ? { ...sec, questions: sec.questions.map((qq, j) => (j === qi ? { ...qq, ...patch } : qq)) }
          : sec,
      ),
    );

  const addSection = () => setSections((s) => [...s, { title: `Section ${s.length + 1}`, questions: [] }]);
  const addQuestion = (sectionIdx: number) =>
    setSections((s) => s.map((sec, i) => (i === sectionIdx ? { ...sec, questions: [...sec.questions, emptyQuestion()] } : sec)));

  const flatQuestions = sections.flatMap((s) => s.questions);

  const buildQuestionPayload = (q: QuestionState, qi: number): UpsertDraftQuestion => {
    // Merge the numeric/length controls this UI edits into the opaque controls (which may carry a
    // skuBinding and anything else this UI doesn't know about).
    const controls: Record<string, unknown> = { ...q.controlsJson };
    const setOrDelete = (key: string, raw: string) => {
      if (raw === '') delete controls[key];
      else controls[key] = Number(raw);
    };
    setOrDelete('min', q.min);
    setOrDelete('max', q.max);
    setOrDelete('maxLength', q.maxLength);
    setOrDelete('maxCount', q.maxCount);
    setOrDelete('maxDurationSec', q.maxDurationSec);

    return {
      key: q.key,
      fieldType: q.fieldType,
      label: q.label,
      helpText: q.helpText || undefined,
      order: qi,
      isMandatory: q.isMandatory,
      options: CHOICE_TYPES.includes(q.fieldType)
        ? q.optionsCsv
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v, oi) => ({ label: v, value: v.toLowerCase().replace(/\s+/g, '_'), order: oi }))
        : undefined,
      controlsJson: Object.keys(controls).length ? controls : undefined,
      formulaExpression: q.fieldType === 'AUTO_CALCULATED' && q.formulaExpression ? q.formulaExpression : undefined,
      validationRules: q.validationPattern
        ? [{ ruleType: 'pattern', configJson: { pattern: q.validationPattern, message: q.validationMessage || 'Invalid value' } }]
        : undefined,
    };
  };

  const saveDraft = async () => {
    if (!selectedCampaignId || !openTemplateId) return;
    setDraftSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payloadSections = sections.map((s, si) => ({
        title: s.title,
        order: si,
        questions: s.questions.map((q, qi) => buildQuestionPayload(q, qi)),
      }));

      const conditionalRules = rules
        .filter((r) => r.triggerKey && r.targetKey)
        .map((r) => ({
          triggerQuestionKey: r.triggerKey,
          triggerValueJson: parseTriggerValue(r.triggerValue),
          action: r.action,
          targetQuestionKey: r.targetKey,
        }));

      const saved = await api.forms.upsertDraft(selectedCampaignId, openTemplateId, {
        sections: payloadSections,
        conditionalRules: conditionalRules.length ? conditionalRules : undefined,
      });
      loadTemplates();
      loadIntoBuilder(saved);
      setNotice('Draft saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const publish = async () => {
    if (!selectedCampaignId || !openTemplateId) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.forms.publish(selectedCampaignId, openTemplateId);
      loadTemplates();
      loadIntoBuilder(saved);
      setNotice('Published. A new editable draft has been opened automatically.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish form');
    } finally {
      setPublishing(false);
    }
  };

  const syncSkus = async () => {
    if (!selectedCampaignId || !openTemplateId) return;
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.forms.syncSkus(selectedCampaignId, openTemplateId);
      loadIntoBuilder(saved);
      setNotice('SKU fields updated from the current SKU Master. Published versions are untouched.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sync SKU fields');
    } finally {
      setSyncing(false);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to manage its forms.</p>
      </div>
    );
  }

  const publishedVersion = detail?.versions.find((v) => v.status === 'PUBLISHED');
  const selectStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 };

  return (
    <div>
      <div className="toolbar">
        <h1>Forms — {activeCampaign?.campaignName ?? ''}</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New form
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && <p className="subtitle">{notice}</p>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New form</h2>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input required minLength={2} maxLength={160} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="field">
              <label>Start from</label>
              <select value={newArchetype} onChange={(e) => setNewArchetype(e.target.value as FormArchetype | '')} style={selectStyle}>
                {ARCHETYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="subtitle">{ARCHETYPES.find((a) => a.value === newArchetype)?.hint}</p>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create form'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {openTemplateId && detail && (
        <div className="panel">
          <h2>
            {detail.name}{' '}
            {detail.archetype && (
              <span className="badge status-inactive" style={{ marginLeft: 8 }}>
                {ARCHETYPES.find((a) => a.value === detail.archetype)?.label ?? detail.archetype}
              </span>
            )}
            {publishedVersion && (
              <span className="badge status-active" style={{ marginLeft: 8 }}>
                published v{publishedVersion.version}
              </span>
            )}
          </h2>

          {sections.map((section, si) => (
            <div key={si} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div className="field" style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label>Section title</label>
                  <input
                    value={section.title}
                    onChange={(e) => setSections((s) => s.map((sec, i) => (i === si ? { ...sec, title: e.target.value } : sec)))}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSections((s) => s.filter((_, i) => i !== si))}
                >
                  Remove section
                </button>
              </div>

              {section.questions.map((q, qi) => (
                <div
                  key={q.key}
                  style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}
                >
                  <div className="form-grid" style={{ alignItems: 'end' }}>
                    <div className="field">
                      <label>Field type {isSkuBound(q) && <span className="badge status-inactive">SKU-bound</span>}</label>
                      <select
                        value={q.fieldType}
                        onChange={(e) => updateQuestion(si, qi, { fieldType: e.target.value as FieldType })}
                        style={selectStyle}
                        disabled={isSkuBound(q)}
                      >
                        {FIELD_TYPE_GROUPS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.types.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Question label</label>
                      <input value={q.label} onChange={(e) => updateQuestion(si, qi, { label: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Help text (optional)</label>
                      <input value={q.helpText} onChange={(e) => updateQuestion(si, qi, { helpText: e.target.value })} />
                    </div>
                    <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={q.isMandatory}
                          onChange={(e) => updateQuestion(si, qi, { isMandatory: e.target.checked })}
                        />{' '}
                        Mandatory
                      </label>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setSections((s) =>
                            s.map((sec, i) => (i === si ? { ...sec, questions: sec.questions.filter((_, j) => j !== qi) } : sec)),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {(CHOICE_TYPES.includes(q.fieldType) ||
                    TEXT_TYPES.includes(q.fieldType) ||
                    NUMERIC_TYPES.includes(q.fieldType) ||
                    q.fieldType === 'AUTO_CALCULATED' ||
                    q.fieldType === 'MULTIPLE_PHOTOS' ||
                    q.fieldType === 'SHORT_VIDEO') && (
                    <div className="form-grid" style={{ marginTop: 6 }}>
                      {CHOICE_TYPES.includes(q.fieldType) && (
                        <div className="field">
                          <label>Options (comma-separated)</label>
                          <input value={q.optionsCsv} onChange={(e) => updateQuestion(si, qi, { optionsCsv: e.target.value })} />
                        </div>
                      )}
                      {NUMERIC_TYPES.includes(q.fieldType) && (
                        <>
                          <div className="field">
                            <label>Minimum (optional)</label>
                            <input type="number" value={q.min} onChange={(e) => updateQuestion(si, qi, { min: e.target.value })} />
                          </div>
                          <div className="field">
                            <label>Maximum (optional)</label>
                            <input type="number" value={q.max} onChange={(e) => updateQuestion(si, qi, { max: e.target.value })} />
                          </div>
                        </>
                      )}
                      {TEXT_TYPES.includes(q.fieldType) && (
                        <>
                          <div className="field">
                            <label>Character limit (optional)</label>
                            <input type="number" min={1} value={q.maxLength} onChange={(e) => updateQuestion(si, qi, { maxLength: e.target.value })} />
                          </div>
                          <div className="field">
                            <label>Validation pattern (regex, optional)</label>
                            <input
                              value={q.validationPattern}
                              onChange={(e) => updateQuestion(si, qi, { validationPattern: e.target.value })}
                            />
                          </div>
                          {q.validationPattern && (
                            <div className="field">
                              <label>Validation message</label>
                              <input
                                value={q.validationMessage}
                                onChange={(e) => updateQuestion(si, qi, { validationMessage: e.target.value })}
                              />
                            </div>
                          )}
                        </>
                      )}
                      {q.fieldType === 'MULTIPLE_PHOTOS' && (
                        <div className="field">
                          <label>Max photos</label>
                          <input type="number" min={1} value={q.maxCount} onChange={(e) => updateQuestion(si, qi, { maxCount: e.target.value })} />
                        </div>
                      )}
                      {q.fieldType === 'SHORT_VIDEO' && (
                        <div className="field">
                          <label>Max duration (seconds)</label>
                          <input
                            type="number"
                            min={1}
                            value={q.maxDurationSec}
                            onChange={(e) => updateQuestion(si, qi, { maxDurationSec: e.target.value })}
                          />
                        </div>
                      )}
                      {q.fieldType === 'AUTO_CALCULATED' && (
                        <div className="field">
                          <label>Formula</label>
                          <input
                            placeholder="e.g. SKU_QTY_TOTAL(SOLD)"
                            value={q.formulaExpression}
                            onChange={(e) => updateQuestion(si, qi, { formulaExpression: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={() => addQuestion(si)}>
                + Add question
              </button>
            </div>
          ))}

          <button type="button" className="btn-secondary" onClick={addSection}>
            + Add section
          </button>

          {flatQuestions.length >= 2 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                Conditional rules
              </label>
              {rules.map((rule, ri) => (
                <div key={ri} className="form-grid" style={{ alignItems: 'end', marginBottom: 8 }}>
                  <div className="field">
                    <label>When question</label>
                    <select value={rule.triggerKey} onChange={(e) => setRules((rs) => rs.map((r, i) => (i === ri ? { ...r, triggerKey: e.target.value } : r)))} style={selectStyle}>
                      <option value="">Select…</option>
                      {flatQuestions.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.label || '(untitled)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Equals value</label>
                    <input value={rule.triggerValue} onChange={(e) => setRules((rs) => rs.map((r, i) => (i === ri ? { ...r, triggerValue: e.target.value } : r)))} />
                  </div>
                  <div className="field">
                    <label>Then</label>
                    <select value={rule.action} onChange={(e) => setRules((rs) => rs.map((r, i) => (i === ri ? { ...r, action: e.target.value as ConditionalAction } : r)))} style={selectStyle}>
                      {CONDITIONAL_ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Question</label>
                    <select value={rule.targetKey} onChange={(e) => setRules((rs) => rs.map((r, i) => (i === ri ? { ...r, targetKey: e.target.value } : r)))} style={selectStyle}>
                      <option value="">Select…</option>
                      {flatQuestions.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.label || '(untitled)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <button type="button" className="btn-secondary" onClick={() => setRules((rs) => rs.filter((_, i) => i !== ri))}>
                      Remove rule
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRules((rs) => [...rs, { triggerKey: '', triggerValue: 'true', action: 'SHOW', targetKey: '' }])}
              >
                + Add conditional rule
              </button>
            </div>
          )}

          <div className="panel-actions" style={{ marginTop: 20 }}>
            <button className="btn-primary inline" onClick={saveDraft} disabled={draftSaving}>
              {draftSaving ? 'Saving…' : 'Save draft'}
            </button>
            <button className="btn-secondary" onClick={publish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
            {detail.archetype && detail.archetype !== 'ENQUIRY_LEADS' && (
              <button className="btn-secondary" onClick={syncSkus} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync SKU fields'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => setOpenTemplateId(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        {templates === null ? (
          <p className="subtitle">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="subtitle">No forms yet for this campaign.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Started from</th>
                <th>Versions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => openTemplate(t.id)}>
                  <td>{t.name}</td>
                  <td>{t.archetype ? ARCHETYPES.find((a) => a.value === t.archetype)?.label ?? t.archetype : 'Blank'}</td>
                  <td>
                    {t.versions.map((v) => (
                      <span key={v.id} className={`badge status-${v.status === 'DRAFT' ? 'inactive' : 'active'}`} style={{ marginRight: 6 }}>
                        v{v.version} {v.status}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
