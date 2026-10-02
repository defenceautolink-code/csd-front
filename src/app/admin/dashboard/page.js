"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";

// 5 Dedicated Role Dashboards
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import SalesManagerDashboard from "./components/SalesManagerDashboard";
import SalesExecutiveDashboard from "./components/SalesExecutiveDashboard";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import AccountantDashboard from "./components/AccountantDashboard";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Super Admin");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // New Lead Form state
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    brand: "Maruti Suzuki",
    model: "Grand Vitara",
    budget: "₹20 - 25 Lakhs",
    priority: "Hot",
    source: "Website",
  });

  // Load current user and set default role
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          if (user?.role) {
            const roleName = typeof user.role === "object" ? (user.role.title || user.role.name) : user.role;
            if (roleName) {
              setSelectedRole(roleName);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    showToast(`Switched view to "${role}" Dashboard`, "info");
  };

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
      source: "Website",
    });
  };

  const getDashboardTitle = () => {
    switch (selectedRole) {
      case "Sales Manager":
        return "Sales Manager & Team Leadership Dashboard";
      case "Sales Executive":
        return "Sales Executive Conversion & Call Desk";
      case "Receptionist":
        return "Showroom Front-Desk & Visitor Concierge";
      case "Accountant":
        return "Finance, Invoicing & Loan Sanctions Dashboard";
      case "Super Admin":
      default:
        return "Dealership Super Admin Executive Dashboard";
    }
  };

  const getDashboardSubtitle = () => {
    switch (selectedRole) {
      case "Sales Manager":
        return "Team quota achievement, lead re-allocation queue & quotation discount approvals";
      case "Sales Executive":
        return "Personal assigned inquiries, today's priority call queue & test drive bookings";
      case "Receptionist":
        return "Live showroom walk-ins, customer token management & executive availability matrix";
      case "Accountant":
        return "Payment receipt clearances, bank loan disbursements & commercial quotation audits";
      case "Super Admin":
      default:
        return "Global dealership performance, multi-brand fleet volume & system master controls";
    }
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        {selectedRole !== "Accountant" && selectedRole !== "Sales Executive" && selectedRole !== "Super Admin" && selectedRole !== "Receptionist" && selectedRole !== "Sales Manager" && (
          <div className="page-header-wrapper">
            <div>
              <ul className="breadcrumb-custom">
                <li className="breadcrumb-item">
                  <Link href="/admin/dashboard">Home</Link>
                </li>
                <li className="breadcrumb-item active">Role-Wise Dashboard</li>
              </ul>
              <h1 className="page-title mt-1">{getDashboardTitle()}</h1>
              <p className="text-muted small mb-0 mt-1">{getDashboardSubtitle()}</p>
            </div>

            <div className="page-header-actions d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-custom"
                onClick={() => showToast(`Exporting ${selectedRole} dashboard summary as CSV...`, "info")}
              >
                <i className="bi bi-file-earmark-arrow-down"></i>
                <span>Export CSV</span>
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddLeadModal(true)}>
                <i className="bi bi-plus-circle"></i>
                <span>Add New Lead</span>
              </button>
            </div>
          </div>
        )}



        {/* Dynamic Role Dashboard Rendering */}
        {selectedRole === "Super Admin" && <SuperAdminDashboard onAddLead={() => setShowAddLeadModal(true)} />}
        {selectedRole === "Sales Manager" && <SalesManagerDashboard />}
        {selectedRole === "Sales Executive" && <SalesExecutiveDashboard />}
        {selectedRole === "Receptionist" && <ReceptionistDashboard />}
        {selectedRole === "Accountant" && <AccountantDashboard />}

        {/* Quick Add Lead Modal */}
        {showAddLeadModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddLeadModal(false)}>
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-person-plus-fill text-primary"></i> Add New Lead & Inquiry
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
                        <option value="Toyota">Toyota</option>
                        <option value="Royal Enfield">Royal Enfield</option>
                        <option value="Honda">Honda</option>
                        <option value="TVS">TVS</option>
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
                      <label className="form-label fw-semibold small">Lead Source</label>
                      <select
                        className="form-select"
                        value={newLead.source}
                        onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                      >
                        <option value="Website">Website Inquiry</option>
                        <option value="Walk-in">Showroom Walk-in</option>
                        <option value="Meta Ads">Facebook / Instagram Ads</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Referral">Customer Referral</option>
                        <option value="CarDekho">CarDekho / CarWale</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small">Priority Level</label>
                      <div className="d-flex gap-4">
                        {["Hot", "Warm", "Cold"].map((p) => (
                          <div className="form-check" key={p}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="leadPriority"
                              id={`dash-p-${p}`}
                              checked={newLead.priority === p}
                              onChange={() => setNewLead({ ...newLead, priority: p })}
                            />
                            <label className="form-check-label small" htmlFor={`dash-p-${p}`}>
                              {p === "Hot" && <i className="bi bi-fire text-danger me-1"></i>}
                              {p === "Warm" && <i className="bi bi-sun-fill text-warning me-1"></i>}
                              {p === "Cold" && <i className="bi bi-snow text-info me-1"></i>}
                              {p} Priority
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
