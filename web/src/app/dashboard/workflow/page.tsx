'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  FormTemplateSummary,
  MilestoneInput,
  MyAccessResponse,
  RoleSummary,
  SopChecklistItemInput,
  StageInput,
  WorkflowResponse,
} from '@impact/shared';
import { useEffect, useState } from 'react';

// Stage 3.2: configurable stages (spec §11), each with milestones bindable to a PUBLISHED form
// (spec §16), role assignments, an approval rule, and a pre-activity SOP checklist (spec §12).
// The whole tree is replaced on every save, the same pattern FormsService.upsertDraft uses.

interface MilestoneState extends MilestoneInput {
  key: string;
}
interface SopItemState extends SopChecklistItemInput {
  key: string;
}
interface StageState {
  key: string;
  name: string;
  allowIncompletePreparation: boolean;
  milestones: MilestoneState[];
  assignedRoleCodes: string[];
  requiresApproval: boolean;
  approverRoleCode: string;
  sopChecklistItems: SopItemState[];
}

let keyCounter = 0;
const newKey = () => `k${Date.now()}_${keyCounter++}`;

function emptyMilestone(order: number): MilestoneState {
  return { key: newKey(), name: '', order, mandatoryPhotoCount: 0, mandatoryGps: false, mandatorySignature: false };
}
function emptySopItem(order: number): SopItemState {
  return { key: newKey(), label: '', order, isMandatory: true };
}
function emptyStage(order: number): StageState {
  return {
    key: newKey(),
    name: `Stage ${order + 1}`,
    allowIncompletePreparation: true,
    milestones: [],
    assignedRoleCodes: [],
    requiresApproval: false,
    approverRoleCode: '',
    sopChecklistItems: [],
  };
}

function fromServer(workflow: WorkflowResponse): { name: string; stages: StageState[] } {
  return {
    name: workflow.name,
    stages: workflow.stages.map((s) => ({
      key: newKey(),
      name: s.name,
      allowIncompletePreparation: s.allowIncompletePreparation,
      milestones: s.milestones.map((m) => ({
        key: newKey(),
        name: m.name,
        order: m.order,
        formVersionId: m.formVersionId ?? undefined,
        mandatoryPhotoCount: m.mandatoryPhotoCount,
        mandatoryGps: m.mandatoryGps,
        mandatorySignature: m.mandatorySignature,
        kpiKey: m.kpiKey ?? undefined,
      })),
      assignedRoleCodes: s.stageAssignments.map((a) => a.role.code),
      requiresApproval: s.stageApprovalRules[0]?.requiresApproval ?? false,
      approverRoleCode: s.stageApprovalRules[0]?.approverRole?.code ?? '',
      sopChecklistItems: s.sopChecklistItems.map((i) => ({ key: newKey(), label: i.label, order: i.order, isMandatory: i.isMandatory })),
    })),
  };
}

export default function WorkflowPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowResponse | null | undefined>(undefined);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [publishedForms, setPublishedForms] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('New Workflow');
  const [stages, setStages] = useState<StageState[]>([]);

  const canManage = access?.permissions.includes('manage_forms') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  useEffect(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setWorkflow(undefined);
    Promise.all([
      api.workflow.get(selectedCampaignId),
      api.workflow.roles(selectedCampaignId),
      api.forms.list(selectedCampaignId),
    ])
      .then(([wf, roleList, forms]: [WorkflowResponse | null, RoleSummary[], FormTemplateSummary[]]) => {
        setWorkflow(wf);
        setRoles(roleList);
        setPublishedForms(
          forms.flatMap((f) =>
            f.versions.filter((v) => v.status === 'PUBLISHED').map((v) => ({ id: v.id, label: `${f.name} v${v.version}` })),
          ),
        );
        if (wf) {
          const loaded = fromServer(wf);
          setName(loaded.name);
          setStages(loaded.stages);
        } else {
          setName('New Workflow');
          setStages([emptyStage(0)]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load workflow'));
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

  const updateStage = (si: number, patch: Partial<StageState>) =>
    setStages((s) => s.map((st, i) => (i === si ? { ...st, ...patch } : st)));

  const save = async () => {
    if (!selectedCampaignId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        name,
        stages: stages.map((s, si) => ({
          name: s.name,
          order: si,
          allowIncompletePreparation: s.allowIncompletePreparation,
          milestones: s.milestones.map((m, mi) => ({
            name: m.name,
            order: mi,
            formVersionId: m.formVersionId || undefined,
            mandatoryPhotoCount: m.mandatoryPhotoCount,
            mandatoryGps: m.mandatoryGps,
            mandatorySignature: m.mandatorySignature,
            kpiKey: m.kpiKey || undefined,
          })),
          assignedRoleCodes: s.assignedRoleCodes,
          requiresApproval: s.requiresApproval,
          approverRoleCode: s.approverRoleCode || undefined,
          sopChecklistItems: s.sopChecklistItems.map((i, ii) => ({ label: i.label, order: ii, isMandatory: i.isMandatory })),
        })),
      };
      const saved = await api.workflow.upsert(selectedCampaignId, payload);
      setWorkflow(saved);
      const loaded = fromServer(saved);
      setName(loaded.name);
      setStages(loaded.stages);
      setNotice('Workflow saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save workflow');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to manage its workflow.</p>
      </div>
    );
  }

  const selectStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 };

  return (
    <div>
      <div className="toolbar">
        <h1>Workflow — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && <p className="subtitle">{notice}</p>}

      {workflow === undefined ? (
        <p className="subtitle">Loading…</p>
      ) : (
        <div className="panel">
          <div className="field">
            <label>Workflow name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {stages.map((stage, si) => (
            <div key={stage.key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 16 }}>
              <div className="form-grid" style={{ alignItems: 'end' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Stage name</label>
                  <input value={stage.name} onChange={(e) => updateStage(si, { name: e.target.value })} />
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={stage.allowIncompletePreparation}
                      onChange={(e) => updateStage(si, { allowIncompletePreparation: e.target.checked })}
                    />{' '}
                    Allow check-in with incomplete preparation
                  </label>
                </div>
                <div className="field">
                  <button type="button" className="btn-secondary" onClick={() => setStages((s) => s.filter((_, i) => i !== si))}>
                    Remove stage
                  </button>
                </div>
              </div>
              {!stage.allowIncompletePreparation && (
                <p className="subtitle">
                  Field workers cannot check in for this stage until every mandatory checklist item below is marked
                  Completed or Not Applicable.
                </p>
              )}

              <h3 style={{ marginTop: 16 }}>Milestones</h3>
              {stage.milestones.map((m, mi) => (
                <div key={m.key} className="form-grid" style={{ alignItems: 'end', marginBottom: 6 }}>
                  <div className="field">
                    <label>Name</label>
                    <input
                      value={m.name}
                      onChange={(e) =>
                        updateStage(si, {
                          milestones: stage.milestones.map((mm, j) => (j === mi ? { ...mm, name: e.target.value } : mm)),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Bound form (published only)</label>
                    <select
                      value={m.formVersionId ?? ''}
                      onChange={(e) =>
                        updateStage(si, {
                          milestones: stage.milestones.map((mm, j) =>
                            j === mi ? { ...mm, formVersionId: e.target.value || undefined } : mm,
                          ),
                        })
                      }
                      style={selectStyle}
                    >
                      <option value="">No form</option>
                      {publishedForms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Mandatory photos</label>
                    <input
                      type="number"
                      min={0}
                      value={m.mandatoryPhotoCount}
                      onChange={(e) =>
                        updateStage(si, {
                          milestones: stage.milestones.map((mm, j) =>
                            j === mi ? { ...mm, mandatoryPhotoCount: Number(e.target.value) } : mm,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={m.mandatoryGps}
                        onChange={(e) =>
                          updateStage(si, {
                            milestones: stage.milestones.map((mm, j) => (j === mi ? { ...mm, mandatoryGps: e.target.checked } : mm)),
                          })
                        }
                      />{' '}
                      GPS
                    </label>
                    <label style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={m.mandatorySignature}
                        onChange={(e) =>
                          updateStage(si, {
                            milestones: stage.milestones.map((mm, j) =>
                              j === mi ? { ...mm, mandatorySignature: e.target.checked } : mm,
                            ),
                          })
                        }
                      />{' '}
                      Signature
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => updateStage(si, { milestones: stage.milestones.filter((_, j) => j !== mi) })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateStage(si, { milestones: [...stage.milestones, emptyMilestone(stage.milestones.length)] })}
              >
                + Add milestone
              </button>

              <h3 style={{ marginTop: 16 }}>Role assignment</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {roles.map((r) => (
                  <label key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={stage.assignedRoleCodes.includes(r.code)}
                      onChange={(e) =>
                        updateStage(si, {
                          assignedRoleCodes: e.target.checked
                            ? [...stage.assignedRoleCodes, r.code]
                            : stage.assignedRoleCodes.filter((c) => c !== r.code),
                        })
                      }
                    />
                    {r.name}
                  </label>
                ))}
              </div>

              <h3 style={{ marginTop: 16 }}>Approval</h3>
              <div className="form-grid" style={{ alignItems: 'end' }}>
                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={stage.requiresApproval}
                      onChange={(e) => updateStage(si, { requiresApproval: e.target.checked })}
                    />{' '}
                    Requires approval to complete
                  </label>
                </div>
                {stage.requiresApproval && (
                  <div className="field">
                    <label>Approver role</label>
                    <select value={stage.approverRoleCode} onChange={(e) => updateStage(si, { approverRoleCode: e.target.value })} style={selectStyle}>
                      <option value="">Select…</option>
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: 16 }}>Pre-activity SOP checklist</h3>
              {stage.sopChecklistItems.map((item, ii) => (
                <div key={item.key} className="form-grid" style={{ alignItems: 'end', marginBottom: 6 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Checklist item</label>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        updateStage(si, {
                          sopChecklistItems: stage.sopChecklistItems.map((it, j) => (j === ii ? { ...it, label: e.target.value } : it)),
                        })
                      }
                    />
                  </div>
                  <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.isMandatory}
                        onChange={(e) =>
                          updateStage(si, {
                            sopChecklistItems: stage.sopChecklistItems.map((it, j) =>
                              j === ii ? { ...it, isMandatory: e.target.checked } : it,
                            ),
                          })
                        }
                      />{' '}
                      Mandatory
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => updateStage(si, { sopChecklistItems: stage.sopChecklistItems.filter((_, j) => j !== ii) })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  updateStage(si, { sopChecklistItems: [...stage.sopChecklistItems, emptySopItem(stage.sopChecklistItems.length)] })
                }
              >
                + Add checklist item
              </button>
            </div>
          ))}

          <div className="panel-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={() => setStages((s) => [...s, emptyStage(s.length)])}>
              + Add stage
            </button>
            {canManage && (
              <button className="btn-primary inline" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save workflow'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
