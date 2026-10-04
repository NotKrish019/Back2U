'use client';
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import { PageTop, Button } from "@/app/report/lost/ManusUILab";
import { ResultCard } from "@/components/ResultCard";
import "@/app/report/lost/report.css";
import { ArrowLeft, ShieldCheck } from "lucide-react";

function MatchesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get("report_id");
  
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("No report ID provided.");
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        const data = await api.getReportMatches(reportId);
        setMatches(data);
      } catch (err: any) {
        setError(err.message || "Failed to load matches");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [reportId]);

  if (loading) {
    return (
      <div className="page-shell results-page flex items-center justify-center min-h-[600px]">
        <GlobalMeshBackground />
        <div className="searching-orbit">
          <div className="radar-sweep" />
          <div className="radar-sweep" style={{ animationDelay: '2s' }} />
        </div>
        <h2>Loading matches...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell results-page p-12">
        <GlobalMeshBackground />
        <h2>Error Loading Matches</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <Button onClick={() => router.push("/reports")} variant="outline" icon={<ArrowLeft size={16} />}>Back to My Reports</Button>
      </div>
    );
  }

  return (
    <div className="page-shell results-page">
      <GlobalMeshBackground />
      <PageTop 
        eyebrow="Candidate Matches" 
        title={<>A few things<br /><em>look familiar.</em></>} 
        intro="The system found these reports that might match yours. Check the details closely before claiming." 
        action={<Button onClick={() => router.push('/reports')} variant="outline" icon={<ArrowLeft size={16} />}>Back to My Reports</Button>} 
      />
      <section className="results-controls container-wide">
        <div className="results-count"><span className="live-dot" />{matches.length} possible matches found</div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono container-wide mt-6 mb-16">
        {matches.length > 0 ? (
          matches.map((m, index) => {
            const item = {
              item_instance_id: m.match_id,
              similarity_score: m.similarity_score,
              rank: index + 1,
              report_id: m.report.report_id,
              item_category: m.report.item_category,
              description: m.report.description,
              location: m.report.location,
              image_reference: m.report.image_reference
            };
            return (
              <ResultCard 
                key={m.match_id} 
                item={item} 
                primary={index === 0} 
                onClick={() => router.push(`/item/${item.report_id}`)} 
              />
            );
          })
        ) : (
          <div className="empty-state">
            <span>NO MATCHES YET</span>
            <h2>We've got your back.</h2>
            <p>We haven't found any matches for your report yet. We're keeping an active lookout and will instantly notify you the second a match appears on campus.</p>
          </div>
        )}
      </section>
      <div className="results-foot container-wide"><ShieldCheck size={17} /><span>Match language is a helpful signal, not a guarantee. Always check the details before making contact.</span></div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="page-shell">Loading...</div>}>
      <MatchesContent />
    </Suspense>
  );
}
