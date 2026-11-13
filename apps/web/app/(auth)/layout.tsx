import { BeltDivider } from "@/components/ui/belt";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-5 py-10">
      <Logo className="text-3xl" />
      <BeltDivider className="mt-4 max-w-40" />
      <main id="conteudo" className="mt-8 w-full max-w-md">
        {children}
      </main>
    </div>
  );
}
