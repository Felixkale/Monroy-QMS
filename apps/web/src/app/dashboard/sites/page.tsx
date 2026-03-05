// File: apps/web/src/app/dashboard/sites/page.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/api";
import Navigation from "@/components/Navigation";
import "../dashboard.css";
import "./sites.css";

interface Site {
  id: string;
  client_id: string;
  site_name: string;
  site_code: string;
  location: string;
  status: string;
  created_at: string;
}

interface Client {
  id: string;
  company_name: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: "",
    site_name: "",
    site_code: "",
    location: "",
    status: "active"
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const [sitesData, clientsData] = await Promise.all([
        apiFetch("/api/sites", { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setSites(sitesData.data);
      setClients(clientsData.data);
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
        await apiFetch(`/api/sites/${editingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch("/api/sites", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
      }

      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this site?")) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("No auth token");

      await apiFetch(`/api/sites/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetForm() {
    setFormData({
      client_id: "",
      site_name: "",
      site_code: "",
      location: "",
      status: "active"
    });
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(site: Site) {
    setFormData({
      client_id: site.client_id,
      site_name: site.site_name,
      site_code: site.site_code,
      location: site.location,
      status: site.status
    });
    setEditingId(site.id);
    setShowForm(true);
  }

  function getClientName(clientId: string) {
    return clients.find(c => c.id === clientId)?.company_name || "Unknown";
  }

  return (
    <div className="dashboard-layout">
      <Navigation />

      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-header animate-slide-down">
            <div className="flex justify-between items-center">
              <div>
                <h1>Sites Management</h1>
                <p className="text-gray-600">Manage client sites and locations.</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingId(null);
                  resetForm();
                }}
                className="btn btn-primary"
              >
                + New Site
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {showForm && (
            <form onSubmit={handleSubmit} className="site-form card">
              <h2>{editingId ? "Edit Site" : "New Site"}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Site Name *</label>
                  <input
                    type="text"
                    value={formData.site_name}
                    onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                    required
                    placeholder="Site name"
                  />
                </div>
                <div className="form-group">
                  <label>Site Code</label>
                  <input
                    type="text"
                    value={formData.site_code}
                    onChange={(e) => setFormData({ ...formData, site_code: e.target.value })}
                    placeholder="Site code"
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, Country"
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
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving..." : "Save Site"}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Loading sites...</p>
            </div>
          ) : (
            <div className="table-container card">
              {sites.length === 0 ? (
                <div className="empty-state">
                  <p>No sites registered yet. Add your first site.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Site Name</th>
                      <th>Client</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
                      <tr key={site.id}>
                        <td>
                          <strong>{site.site_name}</strong>
                        </td>
                        <td>{getClientName(site.client_id)}</td>
                        <td>{site.location}</td>
                        <td>
                          <span className={`badge badge-${site.status === "active" ? "success" : "danger"}`}>
                            {site.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-cell">
                            <button
                              onClick={() => handleEdit(site)}
                              className="btn btn-sm btn-secondary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(site.id)}
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
