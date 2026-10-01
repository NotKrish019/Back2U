import Link from "next/link";

export default function Navigation() {
  return (
    <div className="container">
      <h2>BACK2U</h2>
      <ul className="nav">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/search">Search</Link></li>
        <li><Link href="/report/lost">Report Lost</Link></li>
        <li><Link href="/report/found">Report Found</Link></li>
        <li><Link href="/reports">My Reports</Link></li>
        <li><Link href="/matches">Matches</Link></li>
        <li><Link href="/profile">Profile</Link></li>
        <li><Link href="/notifications">Notifications</Link></li>
        <li><Link href="/support">Support</Link></li>
        <li><Link href="/staff">Staff</Link></li>
      </ul>
    </div>
  );
}
