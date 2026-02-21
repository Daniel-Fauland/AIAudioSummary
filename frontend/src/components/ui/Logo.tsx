import { AudioLines } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <AudioLines className="h-5 w-5 text-primary" />
      <span className="text-xl tracking-tight">
        <span className="font-bold text-primary">AI</span>
        <span className="font-semibold text-foreground hidden sm:inline"> Audio Summary</span>
      </span>
    </div>
  );
}
