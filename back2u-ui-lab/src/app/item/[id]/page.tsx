import Link from "next/link";

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>ITEM DETAIL</h1>
      <p>Item ID: {params.id}</p>
      <p>This is a placeholder item detail page.</p>
      <Link href="/search/results">Back to Search Results</Link>
    </div>
  );
}
