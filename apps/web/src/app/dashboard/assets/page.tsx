// File: apps/web/src/app/dashboard/assets/page.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/api";
import Navigation from "@/components/Navigation";
import "../dashboard.css";
import "./assets.css";

interface Asset {
  id: string;
  asset_name: string;
  asset_tag: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  year_of_make: number;
  status: string;
  risk_class: string;
  next_due_date: string;
  nameplate?: any;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNameplate, setShowNameplate] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    asset_name: "",
    asset_tag: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    year_of_make: new Date().getFullYear(),
    status: "active",
    risk_class: "medium"
  });

  const [nameplatData, setNameplateData] = useState({
    design_code: "",
    mawp: "",
    design_pressure: "",
    test_pressure: "",
    design_temp_min: "",
    design_temp_max: "",
    material: "",
    corrosion_allowance: "",
    capacity: "",
    joint_efficiency: "",
    relief_valve_pressure: ""
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const data = await apiFetch("/api/assets", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAssets(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("No auth token");

      if (editingId) {
        await apiFetch(`/api/assets/${editingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...formData,
            year_of_make: parseInt(String(formData.year_of_make))
          })
        });
      } else {
        await apiFetch("/api/assets", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...formData,
            year_of_make: parseInt(String(formData.year_of_make)),
            client_id: "default-client-id"
          })
        });
      }

      resetForm();
      await fetchAssets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleNameplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssetId) return;

    setFormLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("No auth token");

      await apiFetch(`/api/assets/${selectedAssetId}/nameplate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(nameplatData)
      });

      setShowNameplate(false);
      setSelectedAssetId(null);
      await fetchAssets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset?")) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("No auth token");

      await apiFetch(`/api/assets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchAssets();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetForm() {
    setFormData({
      asset_name: "",
      asset_tag: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      year_of_make: new Date().getFullYear(),
      status: "active",
      risk_class: "medium"
    });
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(asset: Asset) {
    setFormData({
      asset_name: asset.asset_name,
      asset_tag: asset.asset_tag,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serial_number: asset.serial_number,
      year_of_make: asset.year_of_make,
      status: asset.status,
      risk_class: asset.risk_class
    });
    setEditingId(asset.id);
    setShowForm(true);
  }

  function handleNameplateEdit(assetId: string, nameplate?: any) {
    setSelectedAssetId(assetId);
    if (nameplate) {
      setNameplateData(nameplate);
    }
    setShowNameplate(true);
  }

  return (
    <div className="dashboard-layout">
      <Navigation />

      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-header animate-slide-down">
            <div className="flex justify-between items-center">
              <div>
                <h1>Equipment Registry</h1>
                <p className="text-gray-600">Manage all equipment and assets.</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingId(null);
                  resetForm();
                }}
                className="btn btn-primary"
              >
                + New Asset
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {showForm && (
            <form onSubmit={handleSubmit} className="asset-form card">
              <h2>{editingId ? "Edit Asset" : "New Asset"}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Asset Name *</label>
                  <input
                    type="text"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    required
                    placeholder="e.g., Pressure Vessel PV-001"
                  />
                </div>
                <div className="form-group">
                  <label>Asset Tag</label>
                  <input
                    type="text"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="Tag number"
                  />
                </div>
                <div className="form-group">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Manufacturer name"
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model number"
                  />
                </div>
                <div className="form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Serial number"
                  />
                </div>
                <div className="form-group">
                  <label>Year of Make</label>
                  <input
                    type="number"
                    value={formData.year_of_make}
                    onChange={(e) => setFormData({ ...formData, year_of_make: parseInt(e.target.value) })}
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Risk Class</label>
                  <select
                    value={formData.risk_class}
                    onChange={(e) => setFormData({ ...formData, risk_class: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving..." : "Save Asset"}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {showNameplate && (
            <form onSubmit={handleNameplateSubmit} className="nameplate-form card">
              <h2>Equipment Nameplate Data</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Design Code</label>
                  <input
                    type="text"
                    value={nameplatData.design_code}
                    onChange={(e) => setNameplateData({ ...nameplatData, design_code: e.target.value })}
                    placeholder="e.g., ASME VIII Div 1"
                  />
                </div>
                <div className="form-group">
                  <label>MAWP (MPa)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nameplatData.mawp}
                    onChange={(e) => setNameplateData({ ...nameplatData, mawp: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Design Pressure (MPa)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nameplatData.design_pressure}
                    onChange={(e) => setNameplateData({ ...nameplatData, design_pressure: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Test Pressure (MPa)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nameplatData.test_pressure}
                    onChange={(e) => setNameplateData({ ...nameplatData, test_pressure: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Design Temp Min (°C)</label>
                  <input
                    type="number"
                    value={nameplatData.design_temp_min}
                    onChange={(e) => setNameplateData({ ...nameplatData, design_temp_min: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Design Temp Max (°C)</label>
                  <input
                    type="number"
                    value={nameplatData.design_temp_max}
                    onChange={(e) => setNameplateData({ ...nameplatData, design_temp_max: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={nameplatData.material}
                    onChange={(e) => setNameplateData({ ...nameplatData, material: e.target.value })}
                    placeholder="e.g., Carbon Steel"
                  />
                </div>
                <div className="form-group">
                  <label>Corrosion Allowance (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nameplatData.corrosion_allowance}
                    onChange={(e) => setNameplateData({ ...nameplatData, corrosion_allowance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nameplatData.capacity}
                    onChange={(e) => setNameplateData({ ...nameplatData, capacity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Joint Efficiency</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nameplatData.joint_efficiency}
                    onChange={(e) => setNameplateData({ ...nameplatData, joint_efficiency: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Relief Valve Pressure (MPa)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nameplatData.relief_valve_pressure}
                    onChange={(e) => setNameplateData({ ...nameplatData, relief_valve_pressure: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving..." : "Save Nameplate"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNameplate(false);
                    setSelectedAssetId(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Loading assets...</p>
            </div>
          ) : (
            <div className="table-container card">
              {assets.length === 0 ? (
                <div className="empty-state">
                  <p>No assets registered yet. Add your first asset.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Asset Name</th>
                      <th>Manufacturer</th>
                      <th>Model</th>
                      <th>Serial Number</th>
                      <th>Status</th>
                      <th>Risk Class</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id}>
                        <td><strong>{asset.asset_name}</strong></td>
                        <td>{asset.manufacturer}</td>
                        <td>{asset.model}</td>
                        <td>{asset.serial_number}</td>
                        <td>
                          <span className={`badge badge-${asset.status === "active" ? "success" : "danger"}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${asset.risk_class === "high" ? "danger" : asset.risk_class === "medium" ? "warning" : "success"}`}>
                            {asset.risk_class}
                          </span>
                        </td>
                        <td>
                          <div className="action-cell">
                            <button
                              onClick={() => handleEdit(asset)}
                              className="btn btn-sm btn-secondary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleNameplateEdit(asset.id, asset.nameplate)}
                              className="btn btn-sm btn-secondary"
                            >
                              Nameplate
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="btn btn-sm btn-danger"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
