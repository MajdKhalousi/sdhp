const stats = [
  { label: "Today's Patients", value: '0', sub: 'appointments today' },
  { label: 'In Queue', value: '0', sub: 'currently waiting' },
  { label: 'Active Doctors', value: '0', sub: 'on duty now' },
  { label: 'Total Patients', value: '0', sub: 'registered' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to the Syrian Digital Health Platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold">System Status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform initialized. Start by adding your organization, branches, and doctors.
        </p>
      </div>
    </div>
  );
}
