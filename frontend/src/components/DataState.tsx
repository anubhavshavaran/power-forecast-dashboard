import { AlertCircle, LoaderCircle, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}

export function DataState({ loading, error, onRetry, children }: DataStateProps) {
  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-panel">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-blue-600" /> Loading Elexon analysis…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-panel">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-sm font-semibold text-amber-950">Analytical data is unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">{error}</p>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              This portal never substitutes fabricated metrics. Load the Elexon cache with the documented ingestion command, then retry.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-950"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Retry connection
            </button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

