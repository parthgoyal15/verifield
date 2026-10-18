import { Suspense } from "react";
import CertificateView from "./CertificateView";

export default function CertificatePage({ params }: PageProps<"/certificate/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading certificate…</div>}>
      <CertificateView params={params} />
    </Suspense>
  );
}
