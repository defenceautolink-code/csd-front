"use client";

import React from "react";
import AdminLayout from "@/app/components/AdminLayout";
import ReceptionistDashboard from "@/app/admin/dashboard/components/ReceptionistDashboard";

export default function ReceptionistDashboardPage() {
  return (
    <AdminLayout>
      <div className="page-body">
        <ReceptionistDashboard />
      </div>
    </AdminLayout>
  );
}
