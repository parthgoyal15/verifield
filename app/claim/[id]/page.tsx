import { Suspense } from "react";
import ClaimView from "./ClaimView";

export default function ClaimPage({ params }: PageProps<"/claim/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading claim…</div>}>
      <ClaimView params={params} />
    </Suspense>
  );
}
