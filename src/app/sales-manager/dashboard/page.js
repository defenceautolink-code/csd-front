"use client";

import React from "react";
import AdminLayout from "@/app/components/AdminLayout";
import SalesManagerDashboard from "@/app/admin/dashboard/components/SalesManagerDashboard";

export default function SalesManagerDashboardPage() {
  return (
    <AdminLayout>
      <div className="page-body">
        <SalesManagerDashboard />
      </div>
    </AdminLayout>
  );
}
