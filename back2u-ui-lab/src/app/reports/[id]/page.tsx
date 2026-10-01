import Link from "next/link";

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>REPORT DETAIL</h1>
      <p>Report ID: {params.id}</p>
      <p>This is a placeholder report.</p>
      <p><Link href="/reports">Back to My Reports</Link></p>
      <p><Link href="/matches">View Matches</Link></p>
    </div>
  );
}
