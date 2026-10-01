import Link from "next/link";

export default function SearchResultsPage() {
  return (
    <div>
      <h1>SEARCH RESULTS</h1>
      <p>Results will appear here.</p>
      <ul>
        <li><Link href="/item/1">Item 1</Link></li>
        <li><Link href="/item/2">Item 2</Link></li>
        <li><Link href="/item/3">Item 3</Link></li>
      </ul>
    </div>
  );
}
