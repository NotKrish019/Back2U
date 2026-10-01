import Link from "next/link";

export default function ReportsPage() {
  return (
    <div>
      <h1>MY REPORTS</h1>
      <p><Link href="/reports/1">[ Lost Report Placeholder ]</Link></p>
      <p><Link href="/reports/2">[ Found Report Placeholder ]</Link></p>
    </div>
  );
}
