"use client";

import React, { useState } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";

export default function UpdatePricePage() {
  const { showToast } = useToast();

  const [selectedBrand, setSelectedBrand] = useState("Maruti Suzuki");
  const [selectedModel, setSelectedModel] = useState("Grand Vitara");
  const [selectedVariant, setSelectedVariant] = useState("Alpha+ Strong Hybrid e-CVT");

  // Dynamic Price Breakdown state
  const [exShowroom, setExShowroom] = useState(1999000);
  const [rtoCharges, setRtoCharges] = useState(199900);
  const [insurance, setInsurance] = useState(68000);
  const [fastagOther, setFastagOther] = useState(2500);

  const totalOnRoad = exShowroom + rtoCharges + insurance + fastagOther;

  const handleExShowroomChange = (val) => {
    const num = parseInt(val, 10) || 0;
    setExShowroom(num);
    setRtoCharges(Math.round(num * 0.1));
    setInsurance(Math.round(num * 0.034));
  };

  const handleSavePrice = (e) => {
    e.preventDefault();
    showToast(
      `Price updated for ${selectedBrand} ${selectedModel} (${selectedVariant})! New On-Road: ₹${totalOnRoad.toLocaleString(
        "en-IN"
      )}`,
      "success"
    );
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <a href="#">Master Data</a>
              </li>
              <li className="breadcrumb-item active">Update Price</li>
            </ul>
            <h1 className="page-title mt-1">Vehicle Price Master & Calculator</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <Link href="/admin/quotation" className="btn btn-outline-custom">
              <i className="bi bi-file-earmark-spreadsheet-fill text-primary"></i>
              <span>Send Quotation</span>
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => showToast("Exporting official price list sheet as CSV...", "info")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export Price Master</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Price Modifier Card */}
        <div className="row g-4 mb-4">
          <div className="col-xl-7">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-1">Update Vehicle Ex-Showroom & Charges</h5>
                <p className="text-muted small mb-0">Select brand, model, variant and revise live rates</p>
              </div>

              <div className="card-body">
                <form onSubmit={handleSavePrice}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Vehicle Brand</label>
                      <select
                        className="form-select"
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                      >
                        <option value="Maruti Suzuki">Maruti Suzuki</option>
                        <option value="Tata Motors">Tata Motors</option>
                        <option value="Mahindra">Mahindra</option>
                        <option value="Hyundai Motor">Hyundai Motor</option>
                        <option value="Toyota Kirloskar">Toyota Kirloskar</option>
                        <option value="Royal Enfield">Royal Enfield</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Model</label>
                      <select
                        className="form-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      >
                        <option value="Grand Vitara">Grand Vitara</option>
                        <option value="Safari">Safari</option>
                        <option value="Creta">Creta</option>
                        <option value="Thar Roxx">Thar Roxx</option>
                        <option value="Fortuner">Fortuner</option>
                        <option value="Classic 350">Classic 350</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Variant</label>
                      <select
                        className="form-select"
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                      >
                        <option value="Alpha+ Strong Hybrid e-CVT">Alpha+ Strong Hybrid e-CVT</option>
                        <option value="ZXi Plus AT">ZXi Plus AT</option>
                        <option value="Adventure Plus Dark Edition">Adventure Plus Dark Edition</option>
                        <option value="SX (O) Turbo DCT">SX (O) Turbo DCT</option>
                        <option value="AX7L 4x4 AT">AX7L 4x4 AT</option>
                        <option value="Legender 4x4 AT">Legender 4x4 AT</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Ex-Showroom Base Price (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={exShowroom}
                          onChange={(e) => handleExShowroomChange(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">RTO & Registration Tax (₹)</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={rtoCharges}
                          onChange={(e) => setRtoCharges(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Comprehensive Insurance (₹)</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={insurance}
                          onChange={(e) => setInsurance(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Fastag / Hypothecation (₹)</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={fastagOther}
                          onChange={(e) => setFastagOther(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div className="col-12 mt-4">
                      <button type="submit" className="btn btn-primary px-4 py-2">
                        <i className="bi bi-check-circle me-1"></i> Update & Publish Price
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Real-Time Price Calculation Summary Box */}
          <div className="col-xl-5">
            <div className="card h-100 shadow-sm" style={{ border: "1px solid #6D7B24" }}>
              <div className="card-header border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                <span className="badge bg-primary-subtle text-primary px-2 py-1 mb-1">Live Calculation</span>
                <h5 className="card-title text-dark mb-0">Estimated On-Road Breakdown</h5>
                <span className="text-muted small">
                  {selectedBrand} • {selectedModel} ({selectedVariant})
                </span>
              </div>

              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between text-secondary small py-1 border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                    <span>Ex-Showroom Price</span>
                    <span className="text-dark fw-bold">₹{exShowroom.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="d-flex justify-content-between text-secondary small py-1 border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                    <span>RTO & Road Tax (~10%)</span>
                    <span className="text-dark fw-bold">₹{rtoCharges.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="d-flex justify-content-between text-secondary small py-1 border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                    <span>Comprehensive Insurance (1+3 Yr)</span>
                    <span className="text-dark fw-bold">₹{insurance.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="d-flex justify-content-between text-secondary small py-1 border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                    <span>Fastag & Logistics</span>
                    <span className="text-dark fw-bold">₹{fastagOther.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="p-3 rounded-3 mt-4" style={{ background: "rgba(88, 99, 42, 0.08)", border: "1px solid var(--border-color)" }}>
                  <span className="text-muted small fw-semibold">Total Estimated On-Road Price:</span>
                  <div className="text-warning fw-bold fs-3 mt-1">₹{totalOnRoad.toLocaleString("en-IN")}</div>
                  <span className="text-success small">
                    <i className="bi bi-shield-check me-1"></i>Official Dealership Certified Price
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Revisions History Table Card */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Recent Price Revisions & Audit Log</h5>
            <span className="text-muted small">Track price changes</span>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th>Revision Date</th>
                  <th>Vehicle Model & Variant</th>
                  <th>Brand</th>
                  <th>Previous Price</th>
                  <th>Revised Ex-Showroom</th>
                  <th>Net Difference</th>
                  <th>Updated By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jan 28, 2026</td>
                  <td>
                    <span className="text-dark fw-semibold small">Adventure Plus Dark Edition</span>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Safari
                    </div>
                  </td>
                  <td>Tata Motors</td>
                  <td className="text-muted">₹25,80,000</td>
                  <td className="text-dark fw-bold">₹26,19,000</td>
                  <td>
                    <span className="text-danger small fw-bold">+₹39,000</span>
                  </td>
                  <td>Alexander Vance</td>
                  <td>
                    <span className="badge-custom badge-active">
                      <span className="badge-dot-indicator"></span>Active
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>Jan 22, 2026</td>
                  <td>
                    <span className="text-dark fw-semibold small">Alpha+ Strong Hybrid</span>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Grand Vitara
                    </div>
                  </td>
                  <td>Maruti Suzuki</td>
                  <td className="text-muted">₹19,75,000</td>
                  <td className="text-dark fw-bold">₹19,99,000</td>
                  <td>
                    <span className="text-danger small fw-bold">+₹24,000</span>
                  </td>
                  <td>Alexander Vance</td>
                  <td>
                    <span className="badge-custom badge-active">
                      <span className="badge-dot-indicator"></span>Active
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>Jan 15, 2026</td>
                  <td>
                    <span className="text-dark fw-semibold small">AX7L 4x4 AT</span>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Thar Roxx
                    </div>
                  </td>
                  <td>Mahindra</td>
                  <td className="text-muted">₹22,10,000</td>
                  <td className="text-dark fw-bold">₹22,49,000</td>
                  <td>
                    <span className="text-danger small fw-bold">+₹39,000</span>
                  </td>
                  <td>Alexander Vance</td>
                  <td>
                    <span className="badge-custom badge-active">
                      <span className="badge-dot-indicator"></span>Active
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>Jan 10, 2026</td>
                  <td>
                    <span className="text-dark fw-semibold small">Legender 4x4 AT</span>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Fortuner
                    </div>
                  </td>
                  <td>Toyota Kirloskar</td>
                  <td className="text-muted">₹47,20,000</td>
                  <td className="text-dark fw-bold">₹48,00,000</td>
                  <td>
                    <span className="text-danger small fw-bold">+₹80,000</span>
                  </td>
                  <td>Alexander Vance</td>
                  <td>
                    <span className="badge-custom badge-active">
                      <span className="badge-dot-indicator"></span>Active
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
