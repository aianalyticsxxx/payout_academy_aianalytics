// ==========================================
// CRM LAYOUT
// ==========================================

import React from 'react';
import { CRMSidebar } from '@/components/crm/CRMSidebar';

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-dark">
      <CRMSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
