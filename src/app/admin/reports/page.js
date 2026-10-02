"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  const can = (permission) => hasPermission(permission, currentUser);
  const [dateRange, setDateRange] = useState("this_quarter");

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
              <li className="breadcrumb-item active">Reports & Analytics</li>
            </ul>
            <h1 className="page-title mt-1">Dealership Analytics & Performance Reports</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="this_month">This Month (August 2026)</option>
              <option value="this_quarter">Current Financial Quarter (Q2)</option>
              <option value="last_quarter">Previous Quarter (Q1)</option>
              <option value="year_to_date">Financial Year to Date (FY26-27)</option>
            </select>

            {can("reports.export_pdf") && <button
              className="btn btn-outline-custom"
              onClick={() => showToast("Exporting comprehensive audit report as PDF...", "info")}
            >
              <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
              <span>Export PDF</span>
            </button>}

            {can("reports.export_csv") && <button
              className="btn btn-primary"
              onClick={() => showToast("Exporting raw analytics data to CSV...", "success")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export Excel / CSV</span>
            </button>}
          </div>
        </div>

        {/* Revenue & Conversion KPI Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Vehicle Sales Revenue</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-currency-rupee"></i>
                </div>
              </div>
              <div className="stat-card-value">₹18.45 Cr</div>
              <div className="stat-change positive">
                <i className="bi bi-arrow-up-short"></i>
                <span>+22.4% vs last quarter</span>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Dealership Gross Margin</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-pie-chart-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">₹2.18 Cr</div>
              <span className="text-primary small fw-semibold">11.8% Average Margin</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Pipeline Conversion Rate</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
              </div>
              <div className="stat-card-value">34.8%</div>
              <div className="stat-change positive">
                <i className="bi bi-arrow-up-short"></i>
                <span>+4.2% higher closing rate</span>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Average Deal Ticket Size</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-tag-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">₹28.8 Lakhs</div>
              <span className="text-info small fw-semibold">SUV & Hybrid driven</span>
            </div>
          </div>
        </div>

        {/* Funnel Breakdown & Lead Source Performance */}
        <div className="row g-4 mb-4">
          {/* Sales Conversion Funnel */}
          <div className="col-xl-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-1">Sales Conversion Funnel</h5>
                <p className="text-muted small mb-0">Progression from initial customer inquiry to car delivery</p>
              </div>

              <div className="card-body">
                <div className="d-flex flex-column gap-3">
                  <div>
                    <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                      <span>1. Total Inquiries Captured</span>
                      <span>1,284 Inquiries (100%)</span>
                    </div>
                    <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                      <div
                        className="progress-bar"
                        style={{ width: "100%", background: "#3F4912", borderRadius: "4px" }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                      <span>2. Contacted & Validated</span>
                      <span>898 Leads (70.0%)</span>
                    </div>
                    <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                      <div
                        className="progress-bar"
                        style={{ width: "70%", background: "#4B5028", borderRadius: "4px" }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                      <span>3. Test Drives Completed</span>
                      <span>385 Drivers (30.0%)</span>
                    </div>
                    <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                      <div
                        className="progress-bar"
                        style={{ width: "30%", background: "#D99A00", borderRadius: "4px" }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                      <span>4. Official Quotations Sent</span>
                      <span>246 Quotes (19.2%)</span>
                    </div>
                    <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                      <div
                        className="progress-bar"
                        style={{ width: "19.2%", background: "#EE6800", borderRadius: "4px" }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                      <span>5. Final Closed Deliveries (Won)</span>
                      <span>64 Bookings (5.0%)</span>
                    </div>
                    <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                      <div
                        className="progress-bar"
                        style={{ width: "5%", background: "#008318", borderRadius: "4px" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Source Acquisition Performance */}
          <div className="col-xl-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-1">Lead Source Attribution</h5>
                <p className="text-muted small mb-0">Inquiry volume, conversion efficiency, and revenue contribution</p>
              </div>

              <div className="table-responsive">
                <table className="table table-custom">
                  <thead>
                    <tr>
                      <th>Acquisition Channel</th>
                      <th>Total Leads</th>
                      <th>Won Deals</th>
                      <th>Conversion</th>
                      <th>Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="text-dark fw-semibold small">Showroom Walk-in</span>
                      </td>
                      <td>420</td>
                      <td>28</td>
                      <td>
                        <span className="badge bg-success-subtle text-success">6.67%</span>
                      </td>
                      <td className="text-dark fw-bold small">₹8.95 Cr</td>
                    </tr>

                    <tr>
                      <td>
                        <span className="text-dark fw-semibold small">Meta Ads (FB/Insta)</span>
                      </td>
                      <td>380</td>
                      <td>16</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">4.21%</span>
                      </td>
                      <td className="text-dark fw-bold small">₹4.20 Cr</td>
                    </tr>

                    <tr>
                      <td>
                        <span className="text-dark fw-semibold small">Website Inquiry</span>
                      </td>
                      <td>245</td>
                      <td>11</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">4.49%</span>
                      </td>
                      <td className="text-dark fw-bold small">₹2.85 Cr</td>
                    </tr>

                    <tr>
                      <td>
                        <span className="text-dark fw-semibold small">Customer Referral</span>
                      </td>
                      <td>115</td>
                      <td>7</td>
                      <td>
                        <span className="badge bg-success-subtle text-success">6.08%</span>
                      </td>
                      <td className="text-dark fw-bold small">₹1.85 Cr</td>
                    </tr>

                    <tr>
                      <td>
                        <span className="text-dark fw-semibold small">CarDekho / CarWale</span>
                      </td>
                      <td>124</td>
                      <td>2</td>
                      <td>
                        <span className="badge bg-secondary text-white">1.61%</span>
                      </td>
                      <td className="text-dark fw-bold small">₹0.60 Cr</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Team Leaderboard Performance */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Sales Executive Performance Leaderboard</h5>
            <span className="text-muted small">Target achievements & gross bookings</span>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th>Rank & Rep</th>
                  <th>Branch</th>
                  <th>Leads Assigned</th>
                  <th>Test Drives</th>
                  <th>Deals Closed</th>
                  <th>Target Achieved</th>
                  <th>Total Sales Volume</th>
                  <th className="text-end">Performance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-warning text-dark fw-bold rounded-circle p-2">#1</span>
                      <img src="/image/avatar-1.svg" alt="Vikram" className="avatar" />
                      <div>
                        <div className="text-dark fw-bold small">Vikram Singh</div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Senior Sales Consultant
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>Main Showroom (Delhi)</td>
                  <td>310</td>
                  <td>112</td>
                  <td className="text-dark fw-bold">24 Units</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: "6px", width: "80px", background: "#E2E8F0" }}>
                        <div className="progress-bar bg-success" style={{ width: "94%" }}></div>
                      </div>
                      <span className="text-success small fw-bold">94%</span>
                    </div>
                  </td>
                  <td className="text-dark fw-bold">₹7.15 Cr</td>
                  <td className="text-end">
                    <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill">
                      Outstanding
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary text-white fw-bold rounded-circle p-2">#2</span>
                      <img src="/image/avatar-2.svg" alt="Ananya" className="avatar" />
                      <div>
                        <div className="text-dark fw-bold small">Ananya Roy</div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Automotive Advisor
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>South City Branch</td>
                  <td>280</td>
                  <td>94</td>
                  <td className="text-dark fw-bold">19 Units</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: "6px", width: "80px", background: "#E2E8F0" }}>
                        <div className="progress-bar bg-success" style={{ width: "88%" }}></div>
                      </div>
                      <span className="text-success small fw-bold">88%</span>
                    </div>
                  </td>
                  <td className="text-dark fw-bold">₹4.85 Cr</td>
                  <td className="text-end">
                    <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill">
                      Exceeding
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary text-white fw-bold rounded-circle p-2">#3</span>
                      <img src="/image/avatar-3.svg" alt="Rohan" className="avatar" />
                      <div>
                        <div className="text-dark fw-bold small">Rohan Mehta</div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Sales Executive
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>West Hub (Gurgaon)</td>
                  <td>240</td>
                  <td>78</td>
                  <td className="text-dark fw-bold">15 Units</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: "6px", width: "80px", background: "#E2E8F0" }}>
                        <div className="progress-bar bg-primary" style={{ width: "82%" }}></div>
                      </div>
                      <span className="text-primary small fw-bold">82%</span>
                    </div>
                  </td>
                  <td className="text-dark fw-bold">₹3.90 Cr</td>
                  <td className="text-end">
                    <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill">
                      On Track
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary text-white fw-bold rounded-circle p-2">#4</span>
                      <img src="/image/avatar-4.svg" alt="Sneha" className="avatar" />
                      <div>
                        <div className="text-dark fw-bold small">Sneha Joshi</div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Relationship Manager
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>Main Showroom (Delhi)</td>
                  <td>190</td>
                  <td>62</td>
                  <td className="text-dark fw-bold">12 Units</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: "6px", width: "80px", background: "#E2E8F0" }}>
                        <div className="progress-bar bg-warning" style={{ width: "75%" }}></div>
                      </div>
                      <span className="text-warning small fw-bold">75%</span>
                    </div>
                  </td>
                  <td className="text-dark fw-bold">₹2.55 Cr</td>
                  <td className="text-end">
                    <span className="badge bg-warning-subtle text-warning px-3 py-1 rounded-pill">
                      Satisfactory
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
