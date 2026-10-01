"use client";

export default function ReportFoundPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Demo only — no backend connected.");
  };

  return (
    <div>
      <h1>REPORT FOUND</h1>
      <form onSubmit={handleSubmit}>
        <label>Item Name</label>
        <input type="text" placeholder="[ placeholder ]" />

        <label>Description</label>
        <textarea placeholder="[ placeholder ]"></textarea>

        <label>Location</label>
        <input type="text" placeholder="[ placeholder ]" />

        <label>Date</label>
        <input type="text" placeholder="[ placeholder ]" />

        <button type="submit">[ Submit ]</button>
      </form>
    </div>
  );
}
