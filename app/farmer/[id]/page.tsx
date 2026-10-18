import { Suspense } from "react";
import FarmerChat from "./FarmerChat";

export default function FarmerPage({ params }: PageProps<"/farmer/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading chat…</div>}>
      <FarmerChat params={params} />
    </Suspense>
  );
}
