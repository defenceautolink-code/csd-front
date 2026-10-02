"use client";

import React, { useState } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import SalesExecutiveDashboard from "@/app/admin/dashboard/components/SalesExecutiveDashboard";

export default function SalesExecutiveDashboardPage() {
  const { showToast } = useToast();
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // New Lead Form state
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    brand: "Maruti Suzuki",
    model: "Grand Vitara",
    budget: "₹20 - 25 Lakhs",
    priority: "Hot",
    source: "Direct Prospecting",
  });

  const handleAddLeadSubmit = (e) => {
    e.preventDefault();
    showToast(
      `New Lead created for ${newLead.name} (${newLead.brand} ${newLead.model}) with ${newLead.priority} priority!`,
      "success"
    );
    setShowAddLeadModal(false);
    setNewLead({
      name: "",
      phone: "",
      brand: "Maruti Suzuki",
      model: "Grand Vitara",
      budget: "₹20 - 25 Lakhs",
      priority: "Hot",
      source: "Direct Prospecting",
    });
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Sales Executive Dashboard Body */}
        <SalesExecutiveDashboard onAddLead={() => setShowAddLeadModal(true)} />

        {/* Quick Add Lead Modal */}
        {showAddLeadModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddLeadModal(false)}>
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-person-plus-fill text-primary"></i> Add Direct Customer Lead
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddLeadModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddLeadSubmit}>
                <div className="modal-body-custom">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Customer Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Vikram Sharma"
                        required
                        value={newLead.name}
                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        required
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Brand</label>
                      <select
                        className="form-select"
                        value={newLead.brand}
                        onChange={(e) => setNewLead({ ...newLead, brand: e.target.value })}
                      >
                        <option value="Maruti Suzuki">Maruti Suzuki</option>
                        <option value="Tata Motors">Tata Motors</option>
                        <option value="Mahindra">Mahindra</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Royal Enfield">Royal Enfield</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Model & Variant</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Grand Vitara Alpha Hybrid"
                        value={newLead.model}
                        onChange={(e) => setNewLead({ ...newLead, model: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Estimated Budget</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="₹20 - 25 Lakhs"
                        value={newLead.budget}
                        onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Priority Level</label>
                      <div className="d-flex gap-3 pt-2">
                        {["Hot", "Warm", "Cold"].map((p) => (
                          <div className="form-check" key={p}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="seLeadPriority"
                              id={`se-p-${p}`}
                              checked={newLead.priority === p}
                              onChange={() => setNewLead({ ...newLead, priority: p })}
                            />
                            <label className="form-check-label small" htmlFor={`se-p-${p}`}>
                              {p}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowAddLeadModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-circle me-1"></i> Create Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
