"use client";

import React from "react";
import AdminLayout from "@/app/components/AdminLayout";
import AccountantDashboard from "@/app/admin/dashboard/components/AccountantDashboard";

export default function AccountantDashboardPage() {
  return (
    <AdminLayout>
      <div className="page-body">
        <AccountantDashboard />
      </div>
    </AdminLayout>
  );
}
