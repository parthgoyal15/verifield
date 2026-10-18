import Link from "next/link";
import { Logo } from "@/components/ui";
import FarmerPicker from "./FarmerPicker";

export default function FarmerIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href="/">
        <Logo className="text-lg" />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Choose a farmer</h1>
      <p className="mt-1 text-sm text-slate-600">
        Each farmer chats with the Verifield agent in their own language. Open one on your phone to film or photograph the field.
      </p>
      <FarmerPicker />
    </main>
  );
}
