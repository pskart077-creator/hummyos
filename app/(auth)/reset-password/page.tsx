import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Redefinir senha · Hummy OS" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-lg font-semibold text-slate-100">
          Redefinir senha
        </h1>
        <p className="mt-1 text-xs text-slate-400">Escolha uma nova senha.</p>
        <div className="mt-5">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
