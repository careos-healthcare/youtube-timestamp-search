import type { Metadata } from "next";

import { AdminValidationDashboard } from "@/components/admin-validation-dashboard";
import { AdminValidationLogin } from "@/components/admin-validation-login";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { getValidationMetrics } from "@/lib/validation-metrics";

export const metadata: Metadata = {
  title: "Launch validation dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminValidationPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold text-white">Admin dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">
            Set <code className="text-slate-100">ADMIN_SECRET</code> in the deployment environment,
            then reload this page.
          </p>
        </div>
      </main>
    );
  }

  if (!(await isAdminAuthenticated())) {
    return <AdminValidationLogin />;
  }

  const metrics = await getValidationMetrics();
  return <AdminValidationDashboard initialMetrics={metrics} />;
}
