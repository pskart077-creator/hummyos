import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata = { title: "Aceitar convite · Hummy OS" };

export default function AcceptInvitePage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-lg font-semibold text-slate-100">
          Aceitar convite
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Defina seu nome e senha para entrar na equipe Hummy.
        </p>
        <div className="mt-5">
          <Suspense>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
