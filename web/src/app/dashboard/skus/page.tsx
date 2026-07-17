'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignSkuResponse, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

// Campaign SKU Master (report-format-library §3): the per-campaign product list that sales/stock
// forms bind their per-SKU questions to. Editing here + "Sync SKU fields" on a form draft is the
// mid-campaign SKU-change flow.

interface SkuFormState {
  skuCode: string;
  name: string;
  variantLabel: string;
  category: string;
  mrp: string;
  sellingPrice: string;
  packSize: string;
}

const EMPTY_FORM: SkuFormState = {
  skuCode: '',
  name: '',
  variantLabel: '',
  category: '',
  mrp: '',
  sellingPrice: '',
  packSize: '',
};

function toRequest(form: SkuFormState) {
  return {
    skuCode: form.skuCode.trim(),
    name: form.name.trim(),
    variantLabel: form.variantLabel.trim() || undefined,
    category: form.category.trim() || undefined,
    mrp: form.mrp === '' ? undefined : Number(form.mrp),
    sellingPrice: form.sellingPrice === '' ? undefined : Number(form.sellingPrice),
    packSize: form.packSize.trim() || undefined,
  };
}

export default function SkusPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [skus, setSkus] = useState<CampaignSkuResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<SkuFormState>(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SkuFormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const canManage = access?.permissions.includes('manage_forms') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadSkus = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api
      .skus.list(selectedCampaignId, true)
      .then(setSkus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load SKUs'));
  };

  useEffect(() => {
    loadSkus();
    setCreating(false);
    setEditingId(null);
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

  const startEdit = (sku: CampaignSkuResponse) => {
    setEditingId(sku.id);
    setEditForm({
      skuCode: sku.skuCode,
      name: sku.name,
      variantLabel: sku.variantLabel ?? '',
      category: sku.category ?? '',
      mrp: sku.mrp === null ? '' : String(sku.mrp),
      sellingPrice: sku.sellingPrice === null ? '' : String(sku.sellingPrice),
      packSize: sku.packSize ?? '',
    });
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setCreateSaving(true);
    setError(null);
    try {
      await api.skus.create(selectedCampaignId, toRequest(createForm));
      setCreating(false);
      setCreateForm(EMPTY_FORM);
      loadSkus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create SKU');
    } finally {
      setCreateSaving(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !editingId) return;
    setEditSaving(true);
    setError(null);
    try {
      await api.skus.update(selectedCampaignId, editingId, toRequest(editForm));
      setEditingId(null);
      loadSkus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save SKU');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (sku: CampaignSkuResponse) => {
    if (!selectedCampaignId) return;
    setError(null);
    try {
      await api.skus.update(selectedCampaignId, sku.id, { isActive: !sku.isActive });
      loadSkus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update SKU');
    }
  };

  const fields = (form: SkuFormState, setForm: React.Dispatch<React.SetStateAction<SkuFormState>>) => (
    <div className="form-grid">
      <div className="field">
        <label>SKU code</label>
        <input
          required
          maxLength={40}
          placeholder="e.g. SHK-SOAP-75"
          value={form.skuCode}
          onChange={(e) => setForm((f) => ({ ...f, skuCode: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Product name</label>
        <input
          required
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Variant (size / pack)</label>
        <input
          maxLength={60}
          placeholder="e.g. 75g"
          value={form.variantLabel}
          onChange={(e) => setForm((f) => ({ ...f, variantLabel: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Category</label>
        <input
          maxLength={80}
          placeholder="e.g. Personal Care"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>MRP (₹)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.mrp}
          onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Selling price (₹)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.sellingPrice}
          onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Pack size</label>
        <input
          maxLength={60}
          placeholder="e.g. 72 Pcs in 1 Case"
          value={form.packSize}
          onChange={(e) => setForm((f) => ({ ...f, packSize: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="toolbar">
        <h1>SKU Master {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New SKU
          </button>
        )}
      </div>

      <p className="subtitle">
        The product list this campaign reports sales and stock against. Sales/stock forms build one
        question group per active SKU — after changing this list, open the form and use “Sync SKU
        fields” to update its current draft.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New SKU</h2>
          {fields(createForm, setCreateForm)}
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create SKU'}
            </button>
            <button className="btn-secondary inline" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingId && (
        <form className="panel" onSubmit={submitEdit}>
          <h2>Edit SKU</h2>
          {fields(editForm, setEditForm)}
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn-secondary inline" type="button" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!skus ? (
        <p className="subtitle">Loading…</p>
      ) : skus.length === 0 ? (
        <p className="subtitle">No SKUs yet — add the products this campaign reports against.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Variant</th>
              <th>Category</th>
              <th>MRP</th>
              <th>Selling price</th>
              <th>Pack size</th>
              <th>Status</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <tr key={sku.id} style={sku.isActive ? undefined : { opacity: 0.55 }}>
                <td>{sku.skuCode}</td>
                <td>{sku.name}</td>
                <td>{sku.variantLabel ?? '—'}</td>
                <td>{sku.category ?? '—'}</td>
                <td>{sku.mrp !== null ? `₹${sku.mrp}` : '—'}</td>
                <td>{sku.sellingPrice !== null ? `₹${sku.sellingPrice}` : '—'}</td>
                <td>{sku.packSize ?? '—'}</td>
                <td>
                  <span className={`badge ${sku.isActive ? 'status-active' : 'status-inactive'}`}>
                    {sku.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <button className="btn-secondary inline" onClick={() => startEdit(sku)}>
                      Edit
                    </button>{' '}
                    <button className="btn-secondary inline" onClick={() => toggleActive(sku)}>
                      {sku.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
