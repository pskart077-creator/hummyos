"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type Result = {
  riskLevel: string;
  issues: { term: string; category: string; explanation: string }[];
  suggestions: string[];
};

export function ComplianceChecker() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/compliance/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.ok) {
      setResult(json.data);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analisar texto de anúncio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole a copy, headline ou roteiro do criativo..."
        />
        <Button onClick={run} loading={loading} disabled={!text.trim()}>
          <ShieldCheck size={16} /> Analisar compliance
        </Button>

        {result && (
          <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-base p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Risco:</span>
              <StatusBadge value={result.riskLevel} />
            </div>
            {result.issues.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-300">
                  Problemas encontrados
                </p>
                <ul className="space-y-1">
                  {result.issues.map((i, idx) => (
                    <li key={idx} className="text-xs text-danger">
                      “{i.term}” — {i.category}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-300">
                Sugestões seguras
              </p>
              <ul className="space-y-1">
                {result.suggestions.map((s, idx) => (
                  <li key={idx} className="text-xs text-slate-400">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
