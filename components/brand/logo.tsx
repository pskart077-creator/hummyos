import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  withText = true,
}: {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}) {
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" }[size];
  const text = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-brand font-bold text-black shadow-lg shadow-brand/20",
          dims,
        )}
      >
        H
      </div>
      {withText && (
        <span className={cn("font-semibold tracking-tight text-slate-100", text)}>
          Hummy<span className="text-brand-400"> OS</span>
        </span>
      )}
    </div>
  );
}
