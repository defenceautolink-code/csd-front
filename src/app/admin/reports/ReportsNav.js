"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ReportsNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dealership Overview & KPI",
      href: "/admin/reports",
      icon: "bi-bar-chart-line-fill",
      badge: "Analytics",
    },
    {
      label: "Sales & Delivery Register",
      href: "/admin/reports/sales-register",
      icon: "bi-truck",
      badge: "Register",
    },
    {
      label: "Payment & Outstanding Balance",
      href: "/admin/reports/payment-collection",
      icon: "bi-cash-coin",
      badge: "Accounts",
    },
    {
      label: "Insurance Renewal Due",
      href: "/admin/reports/insurance-renewals",
      icon: "bi-shield-check",
      badge: "Alerts",
    },
  ];

  return (
    <div className="card mb-4 border-0 shadow-sm">
      <div className="card-body p-2">
        <ul className="nav nav-pills nav-fill flex-column flex-sm-row gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin/reports"
                ? pathname === "/admin/reports"
                : pathname.startsWith(item.href);

            return (
              <li className="nav-item" key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-link text-start text-sm-center d-flex align-items-center justify-content-between justify-content-sm-center gap-2 py-2 px-3 rounded-3 transition-all ${
                    isActive
                      ? "active bg-primary text-white shadow-sm fw-semibold"
                      : "text-dark bg-light hover-bg-secondary border"
                  }`}
                  style={{ fontSize: "0.875rem" }}
                >
                  <span className="d-inline-flex align-items-center gap-2">
                    <i className={`bi ${item.icon}`}></i>
                    <span>{item.label}</span>
                  </span>
                  <span
                    className={`badge rounded-pill text-xs px-2 py-1 ${
                      isActive ? "bg-white text-primary" : "bg-white text-muted border"
                    }`}
                    style={{ fontSize: "0.7rem" }}
                  >
                    {item.badge}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
