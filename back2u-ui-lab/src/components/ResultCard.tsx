import { ArrowUpRight } from 'lucide-react';
import React from 'react';

export function ResultCard({ item, primary = false, onClick }: { item: any; primary?: boolean; onClick: () => void }) {
  // Extracting data from the search/match item format
  const itemCategory = item.item_category || item.item_instance_id || "Untitled Item";
  const description = item.description || "No description provided.";
  const location = item.location?.split('(')[0]?.trim() || "Unknown Location";
  const score = item.similarity_score ? (item.similarity_score * 100).toFixed(0) + "% MATCH" : "POSSIBLE MATCH";
  const isHighMatch = item.similarity_score > 0.8;
  const badgeColor = isHighMatch ? 'bg-[#FF3E72] text-white' : 'bg-[#FFD700]';

  return (
    <div
      onClick={onClick}
      className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-pointer relative font-mono text-left"
    >
      <div>
        <div className="bg-window-bar-gray px-3 py-1.5 border-b-2 border-retro-border flex items-center justify-between text-[11px]">
          <span className="font-bold text-retro-charcoal uppercase tracking-widest">
            {primary ? "TOP MATCH" : "CANDIDATE"}
          </span>
          {score && (
            <span className={`px-2 py-0.5 border border-retro-border font-bold text-retro-charcoal ${badgeColor}`}>
              {score}
            </span>
          )}
        </div>
        
        {/* Image Block */}
        <div className="w-full h-48 border-b-2 border-retro-border bg-surface-warm-grey relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] mix-blend-overlay pointer-events-none z-10"></div>
          {item.image_url || item.image_reference ? (
            <img 
              src={
                item.image_url || 
                (item.image_reference ? (item.image_reference.match(/^(http|blob:|data:)/) ? item.image_reference : `http://127.0.0.1:8000${item.image_reference.startsWith('/') ? '' : '/'}${item.image_reference}`) : "")
              } 
              alt="Result" 
              className="w-full h-full object-cover relative z-0" 
            />
          ) : (
            <div className="font-mono text-sm text-retro-charcoal/50 uppercase tracking-widest">[ NO_IMAGE_DATA ]</div>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-[20px] font-bold text-retro-charcoal mb-2 leading-tight">
            {itemCategory}
          </h3>
          <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed h-10 overflow-hidden line-clamp-2">
            {description}
          </p>
          <div className="space-y-2 pt-4 border-t border-retro-border/40 text-[11px]">
            <div className="flex items-center gap-2 text-retro-charcoal">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              <span className="font-bold uppercase tracking-wider">{location}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 bg-surface-canvas border-t-2 border-retro-border flex justify-between items-center text-[10px] text-retro-charcoal font-bold tracking-widest uppercase">
        <span>SYS: FOUND</span>
        <ArrowUpRight size={14} className="opacity-50" />
      </div>
    </div>
  );
}
