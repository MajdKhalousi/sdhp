'use client';

import { EmployeeProfileDetail } from '@/components/hr/employee-profile-detail';

interface Props {
  params: { id: string };
}

export default function HrEmployeeDetailPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-4xl">
      <EmployeeProfileDetail employeeId={params.id} />
    </div>
  );
}
