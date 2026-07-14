'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  ConditionalAction,
  FieldType,
  FormTemplateDetail,
  FormTemplateSummary,
  MyAccessResponse,
} from '@impact/shared';
import { useEffect, useState } from 'react';

// Core field types offered by this minimal builder (build sequence Session A scope) — the full
// 35+ type list (including the Campaign SKU Master's SKU_SELECTOR/QUANTITY/etc.) is Stage 3.1.
const CORE_FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'SHORT_TEXT', label: 'Short text' },
  { value: 'LONG_TEXT', label: 'Long text' },
  { value: 'INTEGER', label: 'Number' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'DATE', label: 'Date' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'RADIO', label: 'Radio' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'GPS', label: 'GPS location' },
];

const CHOICE_TYPES: FieldType[] = ['DROPDOWN', 'RADIO'];

const CONDITIONAL_ACTIONS: { value: ConditionalAction; label: string }[] = [
  { value: 'SHOW', label: 'Show' },
  { value: 'HIDE', label: 'Hide' },
  { value: 'REQUIRE', label: 'Require' },
  { value: 'OPTIONAL', label: 'Make optional' },
];

let keyCounter = 0;
const newKey = () => `q${Date.now()}_${keyCounter++}`;

interface QuestionState {
  key: string;
  fieldType: FieldType;
  label: string;
  isMandatory: boolean;
  optionsCsv: string;
}

interface SectionState {
  title: string;
  questions: QuestionState[];
}

interface RuleState {
  enabled: boolean;
  triggerKey: string;
  triggerValue: string;
  action: ConditionalAction;
  targetKey: string;
}

const EMPTY_RULE: RuleState = { enabled: false, triggerKey: '', triggerValue: 'true', action: 'SHOW', targetKey: '' };

function parseTriggerValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export default function FormsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [templates, setTemplates] = useState<FormTemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FormTemplateDetail | null>(null);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [rule, setRule] = useState<RuleState>(EMPTY_RULE);
  const [draftSaving, setDraftSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
      setRule(EMPTY_RULE);
      return;
    }

    // Every question gets a fresh client-side key; keep a map from the server's question id to
    // that new key so an existing conditional rule (which references server ids) can be
    // re-pointed at the regenerated keys the rule UI actually uses.
    const idToNewKey = new Map<string, string>();
    setSections(
      draft.sections.map((s) => ({
        title: s.title,
        questions: s.questions.map((q) => {
          const key = newKey();
          idToNewKey.set(q.id, key);
          return {
            key,
            fieldType: q.fieldType,
            label: q.label,
            isMandatory: q.isMandatory,
            optionsCsv: q.options.map((o) => o.label).join(', '),
          };
        }),
      })),
    );

    const existingRule = draft.conditionalRules[0];
    if (existingRule) {
      setRule({
        enabled: true,
        triggerKey: idToNewKey.get(existingRule.triggerQuestionId) ?? '',
        triggerValue:
          typeof existingRule.triggerValueJson === 'boolean'
            ? String(existingRule.triggerValueJson)
            : String(existingRule.triggerValueJson ?? ''),
        action: existingRule.action,
        targetKey: idToNewKey.get(existingRule.targetQuestionId) ?? '',
      });
    } else {
      setRule(EMPTY_RULE);
    }
  };

  const openTemplate = async (templateId: string) => {
    setOpenTemplateId(templateId);
    setError(null);
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
      });
      setNewName('');
      setNewDescription('');
      setCreating(false);
      loadTemplates();
      openTemplate(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create form');
    } finally {
      setCreateSaving(false);
    }
  };

  const addSection = () => setSections((s) => [...s, { title: `Section ${s.length + 1}`, questions: [] }]);

  const addQuestion = (sectionIdx: number) =>
    setSections((s) =>
      s.map((sec, i) =>
        i === sectionIdx
          ? { ...sec, questions: [...sec.questions, { key: newKey(), fieldType: 'SHORT_TEXT', label: '', isMandatory: false, optionsCsv: '' }] }
          : sec,
      ),
    );

  const flatQuestions = sections.flatMap((s, si) => s.questions.map((q, qi) => ({ ...q, idx: `${si}:${qi}` })));

  const saveDraft = async () => {
    if (!selectedCampaignId || !openTemplateId) return;
    setDraftSaving(true);
    setError(null);
    try {
      const payloadSections = sections.map((s, si) => ({
        title: s.title,
        order: si,
        questions: s.questions.map((q, qi) => ({
          key: q.key,
          fieldType: q.fieldType,
          label: q.label,
          order: qi,
          isMandatory: q.isMandatory,
          options: CHOICE_TYPES.includes(q.fieldType)
            ? q.optionsCsv
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v, oi) => ({ label: v, value: v.toLowerCase().replace(/\s+/g, '_'), order: oi }))
            : undefined,
        })),
      }));

      const conditionalRules =
        rule.enabled && rule.triggerKey && rule.targetKey
          ? [
              {
                triggerQuestionKey: rule.triggerKey,
                triggerValueJson: parseTriggerValue(rule.triggerValue),
                action: rule.action,
                targetQuestionKey: rule.targetKey,
              },
            ]
          : undefined;

      const saved = await api.forms.upsertDraft(selectedCampaignId, openTemplateId, {
        sections: payloadSections,
        conditionalRules,
      });
      loadTemplates();
      loadIntoBuilder(saved);
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
    try {
      const saved = await api.forms.publish(selectedCampaignId, openTemplateId);
      loadTemplates();
      loadIntoBuilder(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish form');
    } finally {
      setPublishing(false);
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
          </div>
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
            {publishedVersion && (
              <span className="badge status-active" style={{ marginLeft: 8 }}>
                published v{publishedVersion.version}
              </span>
            )}
          </h2>

          {sections.map((section, si) => (
            <div key={si} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div className="field">
                <label>Section title</label>
                <input
                  value={section.title}
                  onChange={(e) =>
                    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, title: e.target.value } : sec)))
                  }
                />
              </div>

              {section.questions.map((q, qi) => (
                <div key={q.key} className="form-grid" style={{ alignItems: 'end', marginBottom: 4 }}>
                  <div className="field">
                    <label>Field type</label>
                    <select
                      value={q.fieldType}
                      onChange={(e) =>
                        setSections((s) =>
                          s.map((sec, i) =>
                            i === si
                              ? {
                                  ...sec,
                                  questions: sec.questions.map((qq, j) =>
                                    j === qi ? { ...qq, fieldType: e.target.value as FieldType } : qq,
                                  ),
                                }
                              : sec,
                          ),
                        )
                      }
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
                      {CORE_FIELD_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Question label</label>
                    <input
                      value={q.label}
                      onChange={(e) =>
                        setSections((s) =>
                          s.map((sec, i) =>
                            i === si
                              ? { ...sec, questions: sec.questions.map((qq, j) => (j === qi ? { ...qq, label: e.target.value } : qq)) }
                              : sec,
                          ),
                        )
                      }
                    />
                  </div>
                  {CHOICE_TYPES.includes(q.fieldType) && (
                    <div className="field">
                      <label>Options (comma-separated)</label>
                      <input
                        value={q.optionsCsv}
                        onChange={(e) =>
                          setSections((s) =>
                            s.map((sec, i) =>
                              i === si
                                ? { ...sec, questions: sec.questions.map((qq, j) => (j === qi ? { ...qq, optionsCsv: e.target.value } : qq)) }
                                : sec,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                  <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={q.isMandatory}
                        onChange={(e) =>
                          setSections((s) =>
                            s.map((sec, i) =>
                              i === si
                                ? { ...sec, questions: sec.questions.map((qq, j) => (j === qi ? { ...qq, isMandatory: e.target.checked } : qq)) }
                                : sec,
                            ),
                          )
                        }
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
              ))}
              <button type="button" className="btn-secondary" onClick={() => addQuestion(si)}>
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
                Conditional rule (optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input type="checkbox" checked={rule.enabled} onChange={(e) => setRule((r) => ({ ...r, enabled: e.target.checked }))} />
                <span>Enable a conditional rule</span>
              </div>
              {rule.enabled && (
                <div className="form-grid">
                  <div className="field">
                    <label>When question</label>
                    <select
                      value={rule.triggerKey}
                      onChange={(e) => setRule((r) => ({ ...r, triggerKey: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
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
                    <input value={rule.triggerValue} onChange={(e) => setRule((r) => ({ ...r, triggerValue: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Then</label>
                    <select
                      value={rule.action}
                      onChange={(e) => setRule((r) => ({ ...r, action: e.target.value as ConditionalAction }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
                      {CONDITIONAL_ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Question</label>
                    <select
                      value={rule.targetKey}
                      onChange={(e) => setRule((r) => ({ ...r, targetKey: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
                      <option value="">Select…</option>
                      {flatQuestions.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.label || '(untitled)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="panel-actions" style={{ marginTop: 20 }}>
            <button className="btn-primary inline" onClick={saveDraft} disabled={draftSaving}>
              {draftSaving ? 'Saving…' : 'Save draft'}
            </button>
            <button className="btn-secondary" onClick={publish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
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
                <th>Versions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => openTemplate(t.id)}>
                  <td>{t.name}</td>
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

