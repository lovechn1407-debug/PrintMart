"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
} from "@heroui/react";
import {
  FileText,
  Printer,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  RotateCw,
  Minus,
  Plus,
  UploadCloud,
  Lock,
  ArrowRight,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  FileCheck,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { database, ref, onValue } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { AppNavbar } from "@/components/AppNavbar";
import {
  PrintDraftItem,
  UploadedDocumentRecord,
  getStoredDrafts,
  getDraftById,
  saveOrUpdateDraft,
  removeDraftById,
  clearAllDrafts,
  syncDraftsWithCloud,
} from "@/lib/draftStorage";

// Types
type ColorMode = "bw" | "color";
type Orientation = "portrait" | "landscape";

interface PrintJobConfiguration {
  colorMode: ColorMode;
  simplexDuplex: "simplex" | "duplex";
  paperSize: string;
  copies: number;
  pageRange: string;
  selectedPages: number[];
  totalPagesToPrint: number;
}

interface PricingBreakdown {
  baseRatePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  finalPayablePaise: number;
  offerCode?: string | null;
}

/**
 * RealDocumentViewer Component
 * Renders the REAL uploaded PDF (all pages via PDF.js canvas with native iframe fallback)
 * or real uploaded images.
 */
function RealDocumentViewer({
  doc,
  pageIndex,
  colorMode,
  orientation,
}: {
  doc?: UploadedDocumentRecord;
  pageIndex: number;
  colorMode: ColorMode;
  orientation: Orientation;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<boolean>(false);

  const docId = doc?.fileId || (doc as any)?.documentId;
  const permanentApiUrl = docId
    ? `/api/document/preview?documentId=${encodeURIComponent(docId)}`
    : doc?.telegramFileId
    ? `/api/document/preview?fileId=${encodeURIComponent(doc.telegramFileId)}`
    : doc?.originalFilename
    ? `/api/document/preview?filename=${encodeURIComponent(doc.originalFilename)}`
    : "";

  const isImage =
    doc?.mimeType?.startsWith("image/") ||
    (doc?.originalFilename && /\.(jpg|jpeg|png|webp|bmp|svg)$/i.test(doc.originalFilename));

  useEffect(() => {
    // If no document URL is available at all
    if (!doc?.blobUrl && !permanentApiUrl && !doc?.previewUrl) {
      setLoading(false);
      return;
    }

    if (isImage) {
      setLoading(false);
      setRenderError(false);
      return;
    }

    setLoading(true);
    setRenderError(false);
    let cancelled = false;

    const renderPdf = async () => {
      // Prioritize local in-memory blobUrl (fastest, zero-latency)
      // If blobUrl fails or does not exist (e.g. reload or across devices), fall back to permanent server preview API
      let loadUrl = doc?.blobUrl || permanentApiUrl || doc?.previewUrl || "";
      if (!loadUrl) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // Load PDF.js from CDN dynamically if not present
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById("pdfjs-cdn-script");
            if (existingScript) {
              if ((window as any).pdfjsLib) {
                resolve();
              } else {
                existingScript.addEventListener("load", () => resolve());
                existingScript.addEventListener("error", () => reject());
              }
              return;
            }
            const script = document.createElement("script");
            script.id = "pdfjs-cdn-script";
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              try {
                (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                resolve();
              } catch {
                resolve();
              }
            };
            script.onerror = () => reject();
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js unavailable");

        let pdf;
        try {
          const loadingTask = pdfjsLib.getDocument(loadUrl);
          pdf = await loadingTask.promise;
        } catch (firstErr) {
          // If in-memory blob URL was revoked (after page reload), fall back to permanent server preview API without loop
          if (permanentApiUrl && loadUrl !== permanentApiUrl) {
            console.warn("Initial PDF source unavailable, falling back to permanent server preview:", permanentApiUrl);
            loadUrl = permanentApiUrl;
            const retryTask = pdfjsLib.getDocument(permanentApiUrl);
            pdf = await retryTask.promise;
          } else {
            throw firstErr;
          }
        }

        if (cancelled) return;

        const safePageNum = Math.min(Math.max(1, pageIndex), pdf.numPages);
        const page = await pdf.getPage(safePageNum);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = orientation === "portrait" ? 700 : 950;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.warn("PDF render failed, falling back to frame:", err);
        if (!cancelled) {
          setRenderError(true);
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [docId, doc?.blobUrl, permanentApiUrl, pageIndex, orientation, isImage]);

  if (isImage) {
    const imgSrc = doc?.blobUrl || permanentApiUrl || doc?.previewUrl;
    return (
      <div className="w-full h-full flex items-center justify-center p-2 bg-white overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={doc?.originalFilename || "Document preview"}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              if (permanentApiUrl && (e.target as HTMLImageElement).src !== permanentApiUrl) {
                (e.target as HTMLImageElement).src = permanentApiUrl;
              } else {
                setRenderError(true);
              }
            }}
          />
        ) : (
          <div className="text-center p-4 text-xs text-neutral-400">
            Preview unavailable
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-white overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 space-y-2">
          <RotateCw className="w-6 h-6 animate-spin text-[#0c831f]" />
          <span className="text-[11px] font-semibold text-neutral-600">
            Rendering Page {pageIndex}...
          </span>
        </div>
      )}

      {renderError ? (
        permanentApiUrl ? (
          <iframe
            key={`${permanentApiUrl}-${pageIndex}`}
            src={`${permanentApiUrl}#page=${pageIndex}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
            title={doc?.originalFilename || "PDF Preview"}
            className="w-full h-full border-none pointer-events-none"
          />
        ) : (
          <div className="text-center p-4 text-xs text-neutral-400">
            Preview unavailable
          </div>
        )
      ) : (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain shadow-2xs"
        />
      )}
    </div>
  );
}

function UserPrintContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isNewUpload = searchParams.get("new") === "1" || searchParams.get("mode") === "new";
  const requestedDraftId = searchParams.get("draftId");

  // State: Active Draft ID tracking
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // State: Documents & Workflow Step
  const [documents, setDocuments] = useState<UploadedDocumentRecord[]>([]);
  const [step, setStep] = useState<"upload" | "studio">("upload");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State: Print Settings
  const [colorMode, setColorMode] = useState<ColorMode>("bw");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeType, setPageRangeType] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [offerCode, setOfferCode] = useState<string>("");
  const [appliedOffer, setAppliedOffer] = useState<string>("");

  // State: Vending Machines
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("MCH-CAMPUS-01");

  // Fetch registered vending machines from RTDB
  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsub = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Object.entries(val)
          .map(([id, m]: any) => ({
            ...m,
            machineId: id,
          }))
          .filter((m) => m.status !== "DISABLED");
        setMachines(list);
        if (list.length > 0) {
          setSelectedMachineId((prev) => {
            if (!prev || prev === "kiosk_lib_01") return list[0].machineId;
            const stillExists = list.some((m) => m.machineId === prev);
            return stillExists ? prev : list[0].machineId;
          });
        }
      }
    });
    return () => unsub();
  }, []);

  // State: Page Preview
  const [previewDocIndex, setPreviewDocIndex] = useState<number>(0);
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(1);

  // Floating Pay Button Visibility via IntersectionObserver
  const [isInPagePayVisible, setIsInPagePayVisible] = useState<boolean>(false);
  const inPagePayButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = inPagePayButtonRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInPagePayVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [step, documents.length]);

  // Live Pricing Breakdown
  const [pricing, setPricing] = useState<PricingBreakdown>({
    baseRatePaise: 150,
    subtotalPaise: 150,
    discountPaise: 0,
    taxPaise: 0,
    finalPayablePaise: 150,
    offerCode: null,
  });
  const [calculatingPrice, setCalculatingPrice] = useState<boolean>(false);

  // Payment & OTP
  const [paying, setPaying] = useState<boolean>(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cross-device cloud sync: keep drafts in sync while in Print Studio
  useEffect(() => {
    let unsubscribe = () => {};
    if (user?.uid) {
      unsubscribe = syncDraftsWithCloud(user.uid);
    }
    return () => unsubscribe();
  }, [user?.uid]);

  // Restore draft or initialize clean upload based on URL query
  useEffect(() => {
    // Requirement 1: If user clicked "Upload Files" on homepage (isNewUpload),
    // NEVER load draft files into print studio; show clean upload panel!
    if (isNewUpload) {
      setDocuments([]);
      setStep("upload");
      setActiveDraftId(null);
      return;
    }

    // If a specific draft was chosen from the cart popup
    if (requestedDraftId) {
      const draft = getDraftById(requestedDraftId);
      if (draft && draft.documents && draft.documents.length > 0) {
        setDocuments(draft.documents);
        setActiveDraftId(draft.id);
        if (draft.config) {
          setColorMode(draft.config.colorMode || "bw");
          setOrientation(draft.config.orientation || "portrait");
          setCopies(draft.config.copies || 1);
          setPageRangeType(draft.config.pageRangeType || "all");
          setCustomRange(draft.config.customRange || "");
        }
        setStep("studio");
        return;
      }
    }

    // Default: clean upload panel to preserve draft cart intact
    setDocuments([]);
    setStep("upload");
    setActiveDraftId(null);
  }, [isNewUpload, requestedDraftId]);

  // Listener to auto-load requested draft if it was populated via cloud sync
  useEffect(() => {
    if (!requestedDraftId || isNewUpload) return;
    const handleSyncUpdate = () => {
      if (documents.length === 0) {
        const draft = getDraftById(requestedDraftId);
        if (draft && draft.documents && draft.documents.length > 0) {
          setDocuments(draft.documents);
          setActiveDraftId(draft.id);
          if (draft.config) {
            setColorMode(draft.config.colorMode || "bw");
            setOrientation(draft.config.orientation || "portrait");
            setCopies(draft.config.copies || 1);
            setPageRangeType(draft.config.pageRangeType || "all");
            setCustomRange(draft.config.customRange || "");
          }
          setStep("studio");
        }
      }
    };
    window.addEventListener("printmart_drafts_updated", handleSyncUpdate);
    return () => window.removeEventListener("printmart_drafts_updated", handleSyncUpdate);
  }, [requestedDraftId, isNewUpload, documents.length]);

  // Save Draft to multi-draft storage
  const saveDraft = (
    docs: UploadedDocumentRecord[],
    overrideConfig?: {
      colorMode?: ColorMode;
      orientation?: Orientation;
      copies?: number;
      pageRangeType?: "all" | "custom";
      customRange?: string;
    }
  ) => {
    try {
      if (docs.length > 0) {
        const totalPages = docs.reduce((acc, d) => acc + (d.pageCount || 1), 0);
        const title =
          docs.length === 1
            ? docs[0].originalFilename
            : `${docs[0].originalFilename} (+${docs.length - 1} more)`;

        const currentId =
          activeDraftId ||
          `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        if (!activeDraftId) {
          setActiveDraftId(currentId);
        }

        const draftItem: PrintDraftItem = {
          id: currentId,
          title,
          documents: docs,
          pageCount: totalPages,
          previewUrl: docs[0].previewUrl,
          mimeType: docs[0].mimeType,
          createdAt: Date.now(),
          config: {
            colorMode: overrideConfig?.colorMode ?? colorMode,
            orientation: overrideConfig?.orientation ?? orientation,
            copies: overrideConfig?.copies ?? copies,
            pageRangeType: overrideConfig?.pageRangeType ?? pageRangeType,
            customRange: overrideConfig?.customRange ?? customRange,
          },
        };

        saveOrUpdateDraft(draftItem, user?.uid);
      } else if (activeDraftId) {
        removeDraftById(activeDraftId, user?.uid);
        setActiveDraftId(null);
      }
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  };

  // Sync draft options automatically when configurations change in studio
  useEffect(() => {
    if (documents.length > 0 && activeDraftId) {
      saveDraft(documents);
    }
  }, [colorMode, orientation, copies, pageRangeType, customRange]);

  // Upload Multiple Files
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    setUploading(true);
    setErrorMessage(null);
    const newDocs: UploadedDocumentRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatusText(`Uploading ${file.name} (${i + 1}/${files.length})...`);
      setUploadProgress(Math.round(((i + 1) / files.length) * 85));

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (user?.uid) {
          formData.append("ownerUid", user.uid);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.document) {
          throw new Error(data.error || `Failed to process ${file.name}`);
        }

        // Generate blob URL for instant current-session rendering
        const blobUrl = URL.createObjectURL(file);
        const docId = data.document.documentId || data.document.fileId;
        const permanentPreview = `/api/document/preview?documentId=${docId}`;

        newDocs.push({
          ...data.document,
          fileId: docId,
          blobUrl,
          previewUrl: permanentPreview,
        });
      } catch (err: any) {
        console.error("Upload error:", err);
        setErrorMessage(err.message || `Failed to upload ${file.name}`);
        break;
      }
    }

    setUploadProgress(100);
    setUploadStatusText("All files processed!");

    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");

      if (newDocs.length > 0) {
        setDocuments((prev) => {
          const updated = [...prev, ...newDocs];
          saveDraft(updated);
          return updated;
        });
      }
    }, 350);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove single document
  const handleRemoveDocument = (indexToRemove: number) => {
    setDocuments((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      saveDraft(updated);
      if (updated.length === 0) {
        if (activeDraftId) {
          removeDraftById(activeDraftId);
          setActiveDraftId(null);
        }
        setStep("upload");
      }
      return updated;
    });

    if (previewDocIndex >= indexToRemove && previewDocIndex > 0) {
      setPreviewDocIndex((prev) => Math.max(0, prev - 1));
      setPreviewPageIndex(1);
    }
  };

  // Clear all documents
  const handleClearAll = () => {
    if (activeDraftId) {
      removeDraftById(activeDraftId);
      setActiveDraftId(null);
    }
    setDocuments([]);
    setStep("upload");
    setPreviewDocIndex(0);
    setPreviewPageIndex(1);
  };

  // Total pages across all documents
  const totalAllPages = documents.reduce((sum, d) => sum + (d.pageCount || 1), 0);

  // Helper: Get list of selected page numbers (1-indexed) taking custom range into account
  const getSelectedPagesList = (): number[] => {
    if (documents.length === 1 && pageRangeType === "custom") {
      try {
        const totalPagesInDoc = documents[0].pageCount || 1;
        const parts = customRange.split(",");
        const set = new Set<number>();
        for (const p of parts) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.max(1, start); i <= Math.min(totalPagesInDoc, end); i++) {
                set.add(i);
              }
            }
          } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= totalPagesInDoc) {
              set.add(num);
            }
          }
        }
        const selected = Array.from(set).sort((a, b) => a - b);
        return selected.length > 0 ? selected : [1];
      } catch {
        return [1];
      }
    }
    return Array.from({ length: totalAllPages }, (_, i) => i + 1);
  };

  // Helper: Effective count of pages to print per copy
  const getEffectivePagesCount = (): number => {
    if (documents.length === 1 && pageRangeType === "custom") {
      return getSelectedPagesList().length;
    }
    return totalAllPages;
  };

  // Recalculate Dynamic Price
  useEffect(() => {
    if (documents.length === 0) return;

    const selectedPages = getSelectedPagesList();
    const totalPrintPages = selectedPages.length;

    const config: PrintJobConfiguration = {
      colorMode,
      simplexDuplex: "simplex",
      paperSize: "A4",
      copies: Math.max(1, copies),
      pageRange: documents.length === 1 && pageRangeType === "custom" ? customRange : `1-${totalPrintPages}`,
      selectedPages,
      totalPagesToPrint: totalPrintPages,
    };

    const fetchPrice = async () => {
      try {
        setCalculatingPrice(true);
        const res = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            machineId: "kiosk_lib_01",
            offerCode: appliedOffer || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.pricing) {
            setPricing(data.pricing);
          }
        }
      } catch (e) {
        console.warn("Pricing calculation error:", e);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timer = setTimeout(fetchPrice, 120);
    return () => clearTimeout(timer);
  }, [documents, colorMode, copies, pageRangeType, customRange, appliedOffer, totalAllPages]);

  const formatRupees = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const handleProceedToPayment = async () => {
    if (documents.length === 0) {
      setErrorMessage("Please upload at least one document before proceeding.");
      return;
    }

    try {
      setPaying(true);
      setErrorMessage(null);

      const selectedPages = getSelectedPagesList();
      const totalPrintPages = selectedPages.length;

      const config: PrintJobConfiguration = {
        colorMode,
        simplexDuplex: "simplex",
        paperSize: "A4",
        copies: Math.max(1, copies),
        pageRange: documents.length === 1 && pageRangeType === "custom" ? customRange : `1-${totalPrintPages}`,
        selectedPages,
        totalPagesToPrint: totalPrintPages,
      };

      const docTitle =
        documents.length === 1
          ? documents[0].originalFilename
          : `${documents[0].originalFilename} (+${documents.length - 1} more files)`;

      const targetMachine = selectedMachineId || (machines[0]?.machineId || "MCH-CAMPUS-01");

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest_user",
          machineId: targetMachine,
          documentId: documents[0].fileId,
          documentTitle: docTitle,
          configuration: config,
          offerCode: appliedOffer || undefined,
          customerPhone: "9999999999",
          customerName: user?.displayName || "Customer",
          customerEmail: user?.email || "user@printmart.com",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const simRes = await fetch("/api/payment/simulate-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: orderData.jobId }),
      });

      const simData = await simRes.json();
      if (simData.success && simData.otp) {
        setGeneratedOtp(simData.otp);
        setIsOtpModalOpen(true);
        if (activeDraftId) {
          removeDraftById(activeDraftId);
          setActiveDraftId(null);
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Failed to process payment");
    } finally {
      setPaying(false);
    }
  };

  const copyOtpToClipboard = () => {
    if (!generatedOtp) return;
    navigator.clipboard.writeText(generatedOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Current preview document & safe page bounds
  const currentPreviewDoc = documents[previewDocIndex] || documents[0];
  const currentDocTotalPages = currentPreviewDoc?.pageCount || 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 pb-32 lg:pb-16 relative overflow-x-hidden">
      <AppNavbar />

      {/* Top Aura & Fine Guilloché Wavy Contour Texture */}
      <div className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#fde047]/40 via-[#fef08a]/15 to-transparent" />
        <svg
          className="absolute -top-6 -left-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`left-arc-${i}`}
              d={`M -20 ${20 + i * 16} C 120 ${10 + i * 16}, 210 ${90 + i * 16}, 260 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>
        <svg
          className="absolute -top-6 -right-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`right-arc-${i}`}
              d={`M 340 ${20 + i * 16} C 200 ${10 + i * 16}, 110 ${90 + i * 16}, 60 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 z-10 relative">
        {/* Error Popup Modal with "Okay" Button */}
        {errorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1.5">
                Notice
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-5">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all active:scale-98 shadow-xs"
              >
                Okay
              </button>
            </div>
          </div>
        )}

        {/* Hidden Multiple File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />

        {/* ─────────────────────────────────────────────────────────────
            STAGE 1: UPLOAD & MULTI-FILE QUEUE
            ───────────────────────────────────────────────────────────── */}
        {step === "upload" ? (
          <div className="max-w-xl mx-auto space-y-5 pt-3">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Upload Documents
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto">
                Select your files to print. You can upload multiple files and configure settings next.
              </p>
            </div>

            {/* If NO documents uploaded yet: Main Dropzone */}
            {documents.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
                {uploading ? (
                  <div className="border border-dashed border-emerald-400 rounded-2xl p-8 flex flex-col items-center justify-center bg-emerald-50/30 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center animate-pulse">
                      <UploadCloud className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="space-y-1 text-center w-full max-w-sm">
                      <h3 className="font-bold text-sm text-neutral-900">
                        {uploadStatusText || "Uploading files..."}
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Encrypting into cloud vault & calculating page specifications
                      </p>
                    </div>
                    <div className="w-full max-w-sm pt-1 space-y-1.5">
                      <Progress value={uploadProgress} color="success" className="w-full" />
                      <span className="text-xs font-bold text-[#0c831f] block text-right">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-neutral-300 hover:border-[#0c831f] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-all bg-neutral-50/50 hover:bg-emerald-50/20 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0c831f] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1">
                      Click to upload or drag & drop
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-xs text-center mb-5">
                      PDF, Word (.docx), PowerPoint (.pptx), or Images up to 25 MB
                    </p>
                    <button
                      type="button"
                      className="bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-semibold rounded-xl px-5 py-2.5 shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Select Files from Device</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* If AT LEAST ONE document is uploaded: Files List with "Upload More" & "Continue" */
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div>
                      <h2 className="font-bold text-base text-neutral-900">
                        Selected Files ({documents.length})
                      </h2>
                      <p className="text-xs text-neutral-500">
                        Total {totalAllPages} {totalAllPages === 1 ? "page" : "pages"} across {documents.length} {documents.length === 1 ? "document" : "documents"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Upload Progress Bar if adding more files */}
                  {uploading && (
                    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#0c831f]">
                        <span className="flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          {uploadStatusText}
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} color="success" size="sm" className="w-full" />
                    </div>
                  )}

                  {/* List of uploaded files */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {documents.map((doc, idx) => (
                      <div
                        key={doc.fileId || idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/80 hover:bg-neutral-100/70 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100/70 text-[#0c831f] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-neutral-900 truncate">
                              {doc.originalFilename}
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {doc.pageCount} {doc.pageCount === 1 ? "Page" : "Pages"} • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          className="w-8 h-8 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions: Upload More Files & Continue */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-[#0c831f]" />
                      <span>Upload More Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("studio")}
                      disabled={uploading}
                      className="flex-1 py-2.5 px-5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <span>Continue to Print</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              STAGE 2: SLEEK PRINT STUDIO (With Real Document Page Preview)
              ───────────────────────────────────────────────────────────── */
          <div className="space-y-5">
            {/* Studio Header with Return to Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  Print Studio
                </h1>
                <p className="text-xs text-neutral-500">
                  Preview your real document pages with live config adjustments and release at any campus kiosk.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep("upload")}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
              >
                <Layers className="w-3.5 h-3.5 text-[#0c831f]" />
                <span>Files ({documents.length}) • Add More</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (7 cols): Real Document Page Preview & Configuration */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* 1. REAL DOCUMENT PAGE PREVIEW CARD */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <Eye className="w-4 h-4 text-[#0c831f] shrink-0" />
                      <span className="font-bold text-sm text-neutral-900 truncate">
                        {currentPreviewDoc?.originalFilename || "Real Document Preview"}
                      </span>
                    </div>

                    {/* Page navigation controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-neutral-600">
                        Page {previewPageIndex} of {currentDocTotalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={previewPageIndex <= 1}
                          onClick={() => setPreviewPageIndex((p) => Math.max(1, p - 1))}
                          className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition-colors"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={previewPageIndex >= currentDocTotalPages}
                          onClick={() => setPreviewPageIndex((p) => Math.min(currentDocTotalPages, p + 1))}
                          className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition-colors"
                          title="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multiple files document switcher pills */}
                  {documents.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                      {documents.map((doc, idx) => (
                        <button
                          key={doc.fileId || idx}
                          type="button"
                          onClick={() => {
                            setPreviewDocIndex(idx);
                            setPreviewPageIndex(1);
                          }}
                          className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 transition-all ${
                            previewDocIndex === idx
                              ? "bg-[#0c831f] text-white shadow-xs"
                              : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                          }`}
                        >
                          {doc.originalFilename.length > 20
                            ? `${doc.originalFilename.slice(0, 18)}...`
                            : doc.originalFilename}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* The Paper Sheet Display Canvas with Live Config Filters */}
                  <div className="bg-neutral-100/70 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] overflow-hidden border border-neutral-200/50 relative">
                    {/* Live Config Overlay Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-neutral-800 shadow-2xs border border-neutral-200/60 uppercase">
                        {colorMode === "bw" ? "⚫ B&W" : "🎨 Color"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-neutral-800 shadow-2xs border border-neutral-200/60 uppercase">
                        {orientation === "portrait" ? "Portrait" : "Landscape"}
                      </span>
                    </div>

                    {/* Responsive Simulated Sheet that Renders the Real Document Pages */}
                    <div
                      style={{
                        filter: colorMode === "bw" ? "grayscale(100%) contrast(105%)" : "none",
                        transition: "all 250ms ease-in-out",
                      }}
                      className={`bg-white border border-neutral-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-sm overflow-hidden flex items-center justify-center ${
                        orientation === "portrait"
                          ? "w-full max-w-[280px] sm:max-w-[320px] aspect-[210/297]"
                          : "w-full max-w-[400px] sm:max-w-[480px] aspect-[297/210]"
                      }`}
                    >
                      <RealDocumentViewer
                        doc={currentPreviewDoc}
                        pageIndex={previewPageIndex}
                        colorMode={colorMode}
                        orientation={orientation}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. PRINT CONFIGURATION CARD */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Sparkles className="w-4 h-4 text-[#0c831f]" />
                    <span className="font-bold text-sm text-neutral-900">Print Options</span>
                  </div>

                  {/* Color Mode Option */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                      Color Mode
                    </label>
                    <div className="segmented-track">
                      <button
                        type="button"
                        data-active={colorMode === "bw"}
                        onClick={() => setColorMode("bw")}
                        className="segmented-btn"
                      >
                        <span>Black & White</span>
                        <span className="subtext">₹1.50 per page</span>
                      </button>
                      <button
                        type="button"
                        data-active={colorMode === "color"}
                        onClick={() => setColorMode("color")}
                        className="segmented-btn"
                      >
                        <span>Full Color</span>
                        <span className="subtext">₹5.00 per page</span>
                      </button>
                    </div>
                  </div>

                  {/* Orientation Option (Without bracket contents) */}
                  <div className="pt-1">
                    <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                      Page Orientation
                    </label>
                    <div className="segmented-track">
                      <button
                        type="button"
                        data-active={orientation === "portrait"}
                        onClick={() => setOrientation("portrait")}
                        className="segmented-btn"
                      >
                        <span>Portrait</span>
                        <span className="subtext">Standard layout</span>
                      </button>
                      <button
                        type="button"
                        data-active={orientation === "landscape"}
                        onClick={() => setOrientation("landscape")}
                        className="segmented-btn"
                      >
                        <span>Landscape</span>
                        <span className="subtext">Wide layout</span>
                      </button>
                    </div>
                  </div>

                  {/* Number of Copies (Full Width - Zero space left on right) */}
                  <div className="pt-1">
                    <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                      Number of Copies
                    </label>
                    <div className="flex items-center gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        className="w-12 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors font-bold text-base shrink-0 active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center font-bold text-base text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 shadow-2xs">
                        {copies} {copies === 1 ? "Copy" : "Copies"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.min(50, c + 1))}
                        className="w-12 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors font-bold text-base shrink-0 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pages to Print (Shown ONLY if 1 document is uploaded) */}
                  {documents.length === 1 ? (
                    <div className="pt-1">
                      <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                        Pages to Print
                      </label>
                      <div className="segmented-track">
                        <button
                          type="button"
                          data-active={pageRangeType === "all"}
                          onClick={() => setPageRangeType("all")}
                          className="segmented-btn"
                        >
                          All Pages ({documents[0].pageCount || 1})
                        </button>
                        <button
                          type="button"
                          data-active={pageRangeType === "custom"}
                          onClick={() => setPageRangeType("custom")}
                          className="segmented-btn"
                        >
                          Custom Range
                        </button>
                      </div>
                      {pageRangeType === "custom" && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="text"
                            placeholder="e.g. 1-3, 5"
                            value={customRange}
                            onChange={(e) => setCustomRange(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:border-[#0c831f] bg-white"
                          />
                          <p className="text-[11px] text-neutral-500">
                            Printing {getEffectivePagesCount()} of {documents[0].pageCount || 1} pages
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-neutral-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0c831f] shrink-0" />
                      <span>
                        Printing all <strong>{totalAllPages} pages</strong> across all <strong>{documents.length} uploaded files</strong>.
                      </span>
                    </div>
                  )}

                  {/* Pickup Vending Machine Selection */}
                  <div className="pt-2 border-t border-neutral-100">
                    <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0c831f]" />
                        <span>Pickup Vending Machine</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 normal-case">
                        Universal Campus Release
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedMachineId}
                        onChange={(e) => setSelectedMachineId(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-300 rounded-xl focus:outline-none focus:border-[#0c831f] text-neutral-900 cursor-pointer appearance-none pr-8 transition-colors"
                      >
                        {machines.length > 0 ? (
                          machines.map((m) => (
                            <option key={m.machineId} value={m.machineId}>
                              {m.name || m.machineId} — {m.location || "Campus Kiosk"}
                            </option>
                          ))
                        ) : (
                          <option value="MCH-CAMPUS-01">Central Library Kiosk A — Ground Floor, Central Library</option>
                        )}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column (5 cols): Receipt Summary & Universal OTP Info */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                    <CreditCard className="w-4 h-4 text-[#0c831f]" />
                    <span className="font-bold text-sm text-neutral-900">Payment Summary</span>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between text-neutral-500">
                      <span>Documents:</span>
                      <span className="font-semibold text-neutral-900">
                        {documents.length} {documents.length === 1 ? "File" : "Files"}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Total Pages to Print:</span>
                      <span className="font-semibold text-neutral-900">
                        {getEffectivePagesCount() * Math.max(1, copies)} {getEffectivePagesCount() * Math.max(1, copies) === 1 ? "page" : "pages"}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Color Mode:</span>
                      <span className="font-semibold text-neutral-900">
                        {colorMode === "bw" ? "Black & White" : "Full Color"}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Orientation:</span>
                      <span className="font-semibold text-neutral-900 capitalize">
                        {orientation}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Base Rate:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.baseRatePaise)} / page
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.subtotalPaise)}
                      </span>
                    </div>

                    {pricing.discountPaise > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount:</span>
                        <span>-{formatRupees(pricing.discountPaise)}</span>
                      </div>
                    )}
                  </div>

                  {/* Promo Code Input */}
                  <div className="pt-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={offerCode}
                        onChange={(e) => setOfferCode(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#0c831f] bg-neutral-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setAppliedOffer(offerCode.trim())}
                        className="px-3.5 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedOffer && (
                      <span className="inline-block mt-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Applied: {appliedOffer}
                      </span>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-neutral-100 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-neutral-600">Total Payable</span>
                    <span className="text-2xl font-bold text-[#0c831f]">
                      {formatRupees(pricing.finalPayablePaise)}
                    </span>
                  </div>

                  {/* In-Page Pay Button (Monitored by IntersectionObserver) */}
                  <button
                    ref={inPagePayButtonRef}
                    type="button"
                    disabled={paying || calculatingPrice}
                    onClick={handleProceedToPayment}
                    className="w-full bg-[#0c831f] hover:bg-[#0a6e1a] disabled:opacity-50 text-white font-bold rounded-xl py-3 px-4 shadow-md text-sm mt-3 transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    {paying || calculatingPrice ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span>Pay {formatRupees(pricing.finalPayablePaise)} & Get OTP</span>
                    )}
                  </button>
                </div>

                {/* Universal OTP Campus Info Note (Clean unboxed style without yellow container) */}
                <div className="pt-2 px-1 space-y-1.5 text-xs text-neutral-600">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <Lock className="w-3.5 h-3.5 text-[#0c831f]" />
                    <span>Universal Campus OTP</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600">
                    1. Pay securely via Cashfree Sandbox.<br />
                    2. Receive a universal 6-digit release OTP.<br />
                    3. Walk up to <strong>any</strong> PrintMart kiosk on campus, enter OTP, and collect your prints instantly!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            FLOATING BOTTOM PAY BAR
            Smoothly auto-hides when in-page Pay button is visible in viewport!
            ───────────────────────────────────────────────────────────── */}
        {step === "studio" && documents.length > 0 && (
          <div
            className={`fixed bottom-16 sm:bottom-6 inset-x-4 max-w-sm mx-auto bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between z-40 shadow-xl transition-all duration-300 ease-in-out ${
              !isInPagePayVisible
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-6 pointer-events-none"
            }`}
          >
            <div>
              <span className="text-[11px] text-neutral-500 block leading-tight">Payable</span>
              <span className="text-lg font-bold text-[#0c831f]">
                {formatRupees(pricing.finalPayablePaise)}
              </span>
            </div>
            <button
              type="button"
              disabled={paying || calculatingPrice}
              onClick={handleProceedToPayment}
              className="bg-[#0c831f] hover:bg-[#0a6e1a] disabled:opacity-50 text-white font-bold px-5 h-9 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {paying ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Pay & Get OTP</span>
            </button>
          </div>
        )}

        {/* Modal: OTP Release Dialog (Universal Kiosk) */}
        <Modal isOpen={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
          <ModalContent>
            <ModalHeader className="text-center items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
              <h2 className="text-lg font-bold text-neutral-900">Print Order Authorized!</h2>
              <p className="text-xs text-neutral-500">
                Documents are preloaded & ready at <strong>Any Campus Kiosk</strong>
              </p>
            </ModalHeader>
            <ModalBody className="text-center py-5">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                Your 6-Digit Universal OTP
              </span>
              <div className="my-3 py-3 px-6 bg-emerald-50 rounded-xl flex items-center justify-center gap-3 border border-emerald-200">
                <span className="text-3xl font-extrabold tracking-widest text-[#0c831f] font-mono">
                  {generatedOtp}
                </span>
              </div>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Walk up to <span className="font-semibold text-neutral-800">any kiosk screen</span> on campus, tap <span className="font-semibold text-neutral-800">"Enter OTP"</span>, and your print job will release immediately.
              </p>
            </ModalBody>
            <ModalFooter className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="w-full font-semibold rounded-xl text-xs h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 flex items-center justify-center gap-2 transition-colors"
                onClick={copyOtpToClipboard}
              >
                {copiedOtp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedOtp ? "Copied OTP!" : "Copy OTP"}</span>
              </button>
              <Link
                href="/user/history"
                onClick={() => setIsOtpModalOpen(false)}
                className="w-full font-bold rounded-xl text-xs h-10 bg-[#0c831f] hover:bg-[#0a6e1a] text-white flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                View in My Print Jobs
              </Link>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}

export default function UserPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8 text-xs text-slate-400">
          Loading Print Studio...
        </div>
      }
    >
      <UserPrintContent />
    </Suspense>
  );
}
