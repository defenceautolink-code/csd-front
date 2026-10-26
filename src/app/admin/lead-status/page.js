"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";

export default function LeadStatusPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/leads");
  }, [router]);

  return (
    <AdminLayout>
      <div className="p-4 text-center text-muted">
        Redirecting to Leads Pipeline...
      </div>
    </AdminLayout>
  );
}
