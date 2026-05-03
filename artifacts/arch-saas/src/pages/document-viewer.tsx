import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { parseApiResponse } from "@/lib/api-response";
import { ArrowRight, Printer } from "lucide-react";

interface ProjectDocument {
  id: number;
  title: string;
  htmlContent: string;
  documentType: "quotation" | "project_report" | "boq";
  createdAt: string;
}

export default function DocumentViewer() {
  const params = useParams();
  const documentId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [document, setDocument] = useState<ProjectDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch(`/api/documents/${documentId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => parseApiResponse<ProjectDocument>(res))
      .then(setDocument)
      .catch((err) => {
        toast({ title: err instanceof Error ? err.message : "تعذر تحميل المستند", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [documentId]);

  const handlePrint = () => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <div className="min-h-screen bg-muted/40" dir="rtl">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{document?.title ?? "المستند"}</h1>
              <p className="text-xs text-muted-foreground">مستند عربي قابل للطباعة</p>
            </div>
          </div>
          <Button className="gap-2" onClick={handlePrint} disabled={!document}>
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {isLoading ? (
          <Skeleton className="h-[75vh] w-full" />
        ) : !document ? (
          <div className="text-center py-20 text-muted-foreground">المستند غير موجود أو ليس لديك صلاحية الوصول</div>
        ) : (
          <iframe
            ref={iframeRef}
            title={document.title}
            srcDoc={document.htmlContent}
            className="w-full min-h-[calc(100vh-110px)] border bg-white rounded-md"
          />
        )}
      </main>
    </div>
  );
}
