"use client";

import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

export function ExportPdfButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print-hidden">
      <Printer className="h-4 w-4" aria-hidden="true" />
      Export as PDF
    </Button>
  );
}
