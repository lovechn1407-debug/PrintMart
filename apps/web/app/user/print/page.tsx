"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Arc } from "@/components/loading-ui/arc";
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
  X,
  Type,
  Edit3,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { AppNavbar } from "@/components/AppNavbar";
import { database, ref, onValue, get } from "@/lib/firebase";
import { uploadDocumentInChunks } from "@/lib/clientUploader";
import { EditableField } from "@/components/EditStudioModal";
import { calculatePrintPrice, DEFAULT_GLOBAL_PRICING } from "@printmart/shared";
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
 * Renders the REAL uploaded PDF (with smart window pre-rendering for pages [page-10..page+10],
 * instant 0ms cached display, and automatic page-count detection).
 */
function RealDocumentViewer({
  doc,
  pageIndex,
  colorMode,
  orientation,
  onTotalPagesDetected,
}: {
  doc?: UploadedDocumentRecord;
  pageIndex: number;
  colorMode: ColorMode;
  orientation: Orientation;
  onTotalPagesDetected?: (pages: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<boolean>(false);

  // Cached PDF Document & Rendered Page Images
  const pdfDocRef = useRef<any>(null);
  const loadedDocKeyRef = useRef<string | null>(null);
  const pageCacheRef = useRef<Map<number, string>>(new Map());
  const preRenderingSetRef = useRef<Set<number>>(new Set());
  const isPreRenderingRef = useRef<boolean>(false);

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

  const currentDocKey = `${docId || doc?.originalFilename || "doc"}-${orientation}`;

  // Reset cache if document or orientation changes
  useEffect(() => {
    if (loadedDocKeyRef.current !== currentDocKey) {
      pageCacheRef.current.clear();
      preRenderingSetRef.current.clear();
      pdfDocRef.current = null;
      loadedDocKeyRef.current = currentDocKey;
    }
  }, [currentDocKey]);

  useEffect(() => {
    if (!doc?.blobUrl && !permanentApiUrl && !doc?.previewUrl) {
      setLoading(false);
      return;
    }

    if (isImage) {
      setLoading(false);
      setRenderError(false);
      return;
    }

    let cancelled = false;

    // Helper: Draw cached image dataUrl to canvas
    const drawCachedToCanvas = (dataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        setLoading(false);
      };
      img.src = dataUrl;
    };

    // Pre-render window [centerPage - 10, centerPage + 10]
    const startBgPreRendering = async (pdf: any, centerPage: number, total: number) => {
      if (isPreRenderingRef.current) return;
      isPreRenderingRef.current = true;

      try {
        const minPage = Math.max(1, centerPage - 10);
        const maxPage = Math.min(total, centerPage + 10);

        // Build priority order: closest adjacent pages first (+1, -1, +2, -2...)
        const pagesToPreRender: number[] = [];
        for (let offset = 1; offset <= 10; offset++) {
          const nextP = centerPage + offset;
          const prevP = centerPage - offset;
          if (nextP <= maxPage && !pageCacheRef.current.has(nextP) && !preRenderingSetRef.current.has(nextP)) {
            pagesToPreRender.push(nextP);
          }
          if (prevP >= minPage && !pageCacheRef.current.has(prevP) && !preRenderingSetRef.current.has(prevP)) {
            pagesToPreRender.push(prevP);
          }
        }

        for (const pNum of pagesToPreRender) {
          if (cancelled || loadedDocKeyRef.current !== currentDocKey) break;
          preRenderingSetRef.current.add(pNum);
          try {
            const p = await pdf.getPage(pNum);
            const unscaledViewport = p.getViewport({ scale: 1.0 });
            const targetWidth = orientation === "portrait" ? 700 : 950;
            const scale = targetWidth / unscaledViewport.width;
            const viewport = p.getViewport({ scale });

            const offCanvas = document.createElement("canvas");
            offCanvas.width = viewport.width;
            offCanvas.height = viewport.height;
            const offCtx = offCanvas.getContext("2d");
            if (offCtx) {
              await p.render({ canvasContext: offCtx, viewport }).promise;
              pageCacheRef.current.set(pNum, offCanvas.toDataURL("image/jpeg", 0.85));
            }
          } catch {
            // Ignore single page pre-render error
          } finally {
            preRenderingSetRef.current.delete(pNum);
          }
        }
      } finally {
        isPreRenderingRef.current = false;
      }
    };

    // Fast-path: If the page was already pre-rendered, draw immediately with 0 delay!
    if (pageCacheRef.current.has(pageIndex)) {
      drawCachedToCanvas(pageCacheRef.current.get(pageIndex)!);
      if (pdfDocRef.current) {
        startBgPreRendering(pdfDocRef.current, pageIndex, pdfDocRef.current.numPages);
      }
      return;
    }

    setLoading(true);
    setRenderError(false);

    const renderPdf = async () => {
      let loadUrl = doc?.blobUrl || permanentApiUrl || doc?.previewUrl || "";
      if (!loadUrl) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // Ensure PDF.js is loaded
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

        let pdf = pdfDocRef.current;
        if (!pdf) {
          try {
            const loadingTask = pdfjsLib.getDocument(loadUrl);
            pdf = await loadingTask.promise;
            pdfDocRef.current = pdf;
          } catch (firstErr) {
            if (permanentApiUrl && loadUrl !== permanentApiUrl) {
              console.warn("Initial PDF source unavailable, falling back to permanent server preview:", permanentApiUrl);
              loadUrl = permanentApiUrl;
              const retryTask = pdfjsLib.getDocument(permanentApiUrl);
              pdf = await retryTask.promise;
              pdfDocRef.current = pdf;
            } else {
              throw firstErr;
            }
          }
        }

        if (cancelled) return;

        // Immediately communicate actual PDF page count to unlock all pages
        if (pdf?.numPages && pdf.numPages > 0) {
          onTotalPagesDetected?.(pdf.numPages);
        }

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
          pageCacheRef.current.set(safePageNum, canvas.toDataURL("image/jpeg", 0.85));
          setLoading(false);
          // Pre-render surrounding 10 pages ahead and behind
          startBgPreRendering(pdf, safePageNum, pdf.numPages);
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
  }, [docId, doc?.blobUrl, permanentApiUrl, pageIndex, orientation, isImage, currentDocKey]);

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
      {/* 1px Render Progress Line at the very top */}
      {loading && !pageCacheRef.current.has(pageIndex) && (
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-emerald-100/70 z-30 overflow-hidden">
          <div className="h-full bg-[#0c831f] animate-render-progress" />
        </div>
      )}

      {/* Centered Rendering Buffer Indicator without background box */}
      {loading && !pageCacheRef.current.has(pageIndex) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-all">
          <div className="flex flex-col items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-[#0c831f]" />
            <span className="text-xs font-medium text-neutral-600 tracking-tight">
              Rendering Page {pageIndex}...
            </span>
          </div>
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
          className="max-w-full max-h-full object-contain shadow-2xs transition-opacity duration-150"
        />
      )}
    </div>
  );
}

/**
 * Safely removes any injected Cashfree modal overlays and iframes from the DOM
 */
function cleanupCashfreeDom() {
  if (typeof document === "undefined") return;
  try {
    const selectors = [
      'iframe[src*="cashfree"]',
      'iframe[id*="cf-"]',
      'iframe[id*="cashfree"]',
      'div[id*="cf-"]',
      'div[id*="cashfree"]',
      'div[class*="cf-modal"]',
      'div[class*="cashfree"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        try {
          const parent = el.parentElement;
          if (
            parent &&
            parent !== document.body &&
            parent !== document.documentElement &&
            (parent.style.position === "fixed" ||
              Number(parent.style.zIndex || 0) > 1000 ||
              parent.getAttribute("id")?.includes("cf") ||
              parent.className?.includes?.("cf"))
          ) {
            parent.remove();
          } else {
            el.remove();
          }
        } catch {}
      });
    });
  } catch (e) {
    console.warn("Cashfree DOM cleanup error:", e);
  }
}

function UserPrintContent() {
  const { user, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const isNewUpload = searchParams.get("new") === "1" || searchParams.get("mode") === "new";
  const requestedDraftId = searchParams.get("draftId");
  const requestedDocId = searchParams.get("docId") || searchParams.get("publicDocId");
  const requestedTitle = searchParams.get("title") || "Public Document.pdf";
  const requestedPages = parseInt(searchParams.get("pages") || "1", 10);

  // State: Checkout active tracking for back navigation interception
  const isCheckoutActiveRef = useRef<boolean>(false);

  // State: Active Draft ID tracking
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // State: Documents & Workflow Step
  const [documents, setDocuments] = useState<UploadedDocumentRecord[]>([]);
  const [step, setStep] = useState<"upload" | "studio" | "confirmed">("upload");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load configured max file size limit from systemSettings
  useEffect(() => {
    const settingsRef = ref(database, "systemSettings/maxFileSizeBytes");
    const unsub = onValue(settingsRef, (snap) => {
      if (snap.exists()) {
        const mb = Number(snap.val());
        if (mb > 0) setMaxFileSizeMb(Math.min(100, mb));
      }
    });
    return () => unsub();
  }, []);

  // Handle return redirect from Cashfree (e.g. mobile 3DS / UPI intent returns)
  useEffect(() => {
    const returnOrderId = searchParams.get("order_id");
    const returnStatus = searchParams.get("status");
    if (returnOrderId) {
      if (
        returnStatus &&
        ["FAILED", "CANCELLED", "USER_DROPPED"].includes(returnStatus.toUpperCase())
      ) {
        setErrorMessage("Payment was cancelled or failed. Please try again.");
        window.history.replaceState({}, "", "/user/print");
        return;
      }
      const jobId = returnOrderId.replace(/^CF_/, "");
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, orderId: returnOrderId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.paid && data.otp) {
            setGeneratedOtp(data.otp);
            setIsOtpModalOpen(true);
            setStep("confirmed");
            if (activeDraftId) {
              removeDraftById(activeDraftId);
              setActiveDraftId(null);
            }
          } else {
            setErrorMessage("Payment was not completed or failed. Please try again.");
          }
          window.history.replaceState({}, "", "/user/print");
        })
        .catch(() => {
          setErrorMessage("Failed to verify payment status. Please try again.");
          window.history.replaceState({}, "", "/user/print");
        });
    }
  }, [searchParams, activeDraftId]);

  // State: Print Settings
  const [colorMode, setColorMode] = useState<ColorMode>("bw");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeType, setPageRangeType] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [offerCode, setOfferCode] = useState<string>("");
  const [appliedOffer, setAppliedOffer] = useState<string>("");

  // State: Page Preview
  const [previewDocIndex, setPreviewDocIndex] = useState<number>(0);
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(1);

  // State: Editable PDF Fields & Customization
  const [isEditableDoc, setIsEditableDoc] = useState<boolean>(false);
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.18);
  const [watermarkColor, setWatermarkColor] = useState<string>("#000000");
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [isEditableConfirmed, setIsEditableConfirmed] = useState<boolean>(false);

  const handleImageFieldChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFilledValues((prev) => ({ ...prev, [fieldId]: dataUrl }));
      setIsEditableConfirmed(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // State: Minimal Page Turn Animation & Touch Slide Gestures
  const [pageTurnAnim, setPageTurnAnim] = useState<"next" | "prev" | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDragX, setTouchDragX] = useState<number>(0);
  const [isDraggingPage, setIsDraggingPage] = useState<boolean>(false);

  useEffect(() => {
    if (pageTurnAnim) {
      const timer = setTimeout(() => setPageTurnAnim(null), 300);
      return () => clearTimeout(timer);
    }
  }, [pageTurnAnim, previewPageIndex]);

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
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when OTP modal is open
  useEffect(() => {
    if (isOtpModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOtpModalOpen]);

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
    // 0. If a document was clicked from the Public tab, load it directly into Print Studio
    if (requestedDocId) {
      // 0a. Check if a multi-document bundle was prepared in sessionStorage
      let bundleLoaded = false;
      try {
        const storedBundle = sessionStorage.getItem("printmart_public_bundle");
        if (storedBundle) {
          const parsed = JSON.parse(storedBundle);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDocuments(parsed);
            setStep("studio");
            setActiveDraftId(null);
            bundleLoaded = true;
          }
        }
      } catch (e) {
        console.warn("Could not load bundle from sessionStorage:", e);
      }

      // 0b. Check if this document is an editable template
      try {
        const storedConfig = sessionStorage.getItem("printmart_editable_config");
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig);
          if (parsed.isEditable) {
            setIsEditableDoc(true);
            setEditableFields(parsed.editableFields || []);
            setWatermarkText(parsed.watermarkText || "");
            setWatermarkOpacity(parsed.watermarkOpacity ?? 0.18);
            setWatermarkColor(parsed.watermarkColor || "#000000");
          }
        }
      } catch (e) {
        console.warn("Could not load editable config from sessionStorage:", e);
      }

      if (!bundleLoaded) {
        const publicDocRecord: UploadedDocumentRecord = {
          fileId: requestedDocId,
          originalFilename: requestedTitle,
          fileSizeBytes: 0,
          mimeType: "application/pdf",
          pageCount: Math.max(1, requestedPages),
          isColorDocument: false,
          telegramFileId: requestedDocId,
          previewUrl: `/api/document/preview?documentId=${encodeURIComponent(requestedDocId)}`,
          blobUrl: `/api/document/preview?documentId=${encodeURIComponent(requestedDocId)}`,
        };
        setDocuments([publicDocRecord]);
        setStep("studio");
        setActiveDraftId(null);
      }

      // 0c. Also check if this publicDocId has multiple files or editable config in Firebase RTDB
      const targetPublicId =
        searchParams.get("publicDocId") ||
        (requestedDocId.startsWith("pub_") ? requestedDocId : null);

      if (targetPublicId) {
        get(ref(database, `publicDocuments/${targetPublicId}`))
          .then((snap) => {
            if (snap.exists()) {
              const val = snap.val();
              if (Array.isArray(val.files) && val.files.length > 0 && !bundleLoaded) {
                const multiDocs: UploadedDocumentRecord[] = val.files.map(
                  (f: any, idx: number) => ({
                    fileId: f.fileId,
                    originalFilename: f.title
                      ? f.title.toLowerCase().endsWith(".pdf")
                        ? f.title
                        : `${f.title}.pdf`
                      : `Document ${idx + 1}.pdf`,
                    fileSizeBytes: Number(f.fileSizeBytes) || 0,
                    mimeType: "application/pdf",
                    pageCount: Math.max(1, Number(f.pageCount) || 1),
                    isColorDocument: false,
                    telegramFileId: f.fileId,
                    previewUrl: `/api/document/preview?documentId=${encodeURIComponent(f.fileId)}`,
                    blobUrl: `/api/document/preview?documentId=${encodeURIComponent(f.fileId)}`,
                  })
                );
                setDocuments(multiDocs);
              }

              if (val.isEditable) {
                setIsEditableDoc(true);
                if (Array.isArray(val.editableFields)) {
                  setEditableFields(val.editableFields);
                }
                if (val.watermarkText) {
                  setWatermarkText(val.watermarkText);
                  setWatermarkOpacity(val.watermarkOpacity ?? 0.18);
                  setWatermarkColor(val.watermarkColor || "#000000");
                }
              }
            }
          })
          .catch(() => {});
      }
      return;
    }

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
  }, [isNewUpload, requestedDraftId, requestedDocId, requestedTitle, requestedPages]);

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

  // Real-time synchronization of true page counts detected from viewer
  const handleTotalPagesDetected = useCallback(
    (detectedPages: number) => {
      if (!detectedPages || detectedPages < 1) return;
      setDocuments((prevDocs) => {
        if (!prevDocs[previewDocIndex]) return prevDocs;
        if (prevDocs[previewDocIndex].pageCount === detectedPages) return prevDocs;
        const updated = [...prevDocs];
        updated[previewDocIndex] = {
          ...updated[previewDocIndex],
          pageCount: detectedPages,
        };
        saveDraft(updated);
        return updated;
      });
    },
    [previewDocIndex, activeDraftId, user?.uid, colorMode, orientation, copies, pageRangeType, customRange]
  );

  // Sync draft options automatically when configurations change in studio
  useEffect(() => {
    if (documents.length > 0 && activeDraftId) {
      saveDraft(documents);
    }
  }, [colorMode, orientation, copies, pageRangeType, customRange]);

  // Safe upload trigger requiring authentication
  const handleUploadAreaClick = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error("Sign in failed:", err);
      }
      return;
    }
    fileInputRef.current?.click();
  };

  // Upload Multiple Files with Automatic 20MB Chunking into Telegram Vault (Supports up to 100MB)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error("Sign in failed:", err);
      }
      return;
    }
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    setUploading(true);
    setErrorMessage(null);
    const newDocs: UploadedDocumentRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const uploadedDoc = await uploadDocumentInChunks({
          file,
          ownerUid: user?.uid || "anonymous",
          maxFileSizeMb,
          onProgress: (p) => {
            const fraction = p.percent / 100;
            const overall = Math.round(((i + fraction) / files.length) * 100);
            setUploadProgress(Math.min(99, overall));
            if (files.length > 1) {
              setUploadStatusText(`[${i + 1}/${files.length}] ${p.statusText}`);
            } else {
              setUploadStatusText(p.statusText);
            }
          },
        });

        // Generate local blob URL for instant current-session rendering
        const blobUrl = URL.createObjectURL(file);
        const docId = uploadedDoc.documentId || uploadedDoc.fileId;
        const permanentPreview = `/api/document/preview?documentId=${docId}`;

        newDocs.push({
          ...uploadedDoc,
          pageCount: Math.max(uploadedDoc.pageCount || 1, 1),
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

  // Recalculate Dynamic Price — computed synchronously client-side (no API round-trip)
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

    // Look up applied offer object from local state if present
    // For now we pass null offer (offer validation happens on the server at payment time)
    const breakdown = calculatePrintPrice({
      config,
      pricing: DEFAULT_GLOBAL_PRICING,
      offer: null,
    });

    setPricing(breakdown);
  }, [documents, colorMode, copies, pageRangeType, customRange, appliedOffer, totalAllPages]);

  const formatRupees = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const handleProceedToPayment = async () => {
    if (documents.length === 0) {
      setErrorMessage("Please upload at least one document before proceeding.");
      return;
    }

    if (isEditableDoc && !isEditableConfirmed) {
      setErrorMessage(
        "Please fill in all editable fields and click 'Confirm & Finalize Document' before proceeding to payment."
      );
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

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest_user",
          machineId: "UNIVERSAL",
          documentId: documents[0].fileId,
          documentTitle: docTitle,
          documents: documents.map((d) => ({
            documentId: d.fileId,
            documentName: d.originalFilename,
            pageCount: d.pageCount,
            fileSizeBytes: d.fileSizeBytes,
          })),
          configuration: config,
          offerCode: appliedOffer || undefined,
          customerPhone: "9999999999",
          customerName: user?.displayName || "Customer",
          customerEmail: user?.email || "user@printmart.com",
          metadata: isEditableDoc
            ? {
                isEditable: true,
                watermarkText: watermarkText || undefined,
                watermarkOpacity,
                filledValues,
              }
            : undefined,
        }),
      });

      let orderData: any;
      const orderContentType = orderRes.headers.get("content-type") || "";
      if (orderContentType.includes("application/json")) {
        orderData = await orderRes.json();
      } else {
        const text = await orderRes.text();
        throw new Error(`Order creation server response error (${orderRes.status}): ${text.slice(0, 150)}`);
      }

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Check if Cashfree Session ID is available for live checkout
      if (orderData.paymentSessionId && !orderData.paymentSessionId.startsWith("session_mock_")) {
        // Load Cashfree v3 Web SDK dynamically
        if (!(window as any).Cashfree) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Cashfree Payment Gateway"));
            document.head.appendChild(script);
          });
        }

        const isProd =
          process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ||
          !orderData.paymentSessionId.includes("sandbox");

        const cashfree = (window as any).Cashfree({
          mode: isProd ? "production" : "sandbox",
        });

        // 1. Push checkout state to history so clicking the browser's Back button closes modal instead of exiting the site
        window.history.pushState({ modal: "cashfree_checkout", orderId: orderData.orderId }, "");
        isCheckoutActiveRef.current = true;

        const handlePopState = () => {
          if (isCheckoutActiveRef.current) {
            isCheckoutActiveRef.current = false;
            cleanupCashfreeDom();
            setPaying(false);
            setErrorMessage("Payment was cancelled. You can try again whenever you're ready.");
          }
        };

        window.addEventListener("popstate", handlePopState, { once: true });

        // 2. Launch Cashfree checkout popup / modal
        let checkoutResult: any = null;
        try {
          checkoutResult = await cashfree.checkout({
            paymentSessionId: orderData.paymentSessionId,
            redirectTarget: "_modal",
          });
        } catch (checkoutErr: any) {
          console.warn("Cashfree checkout error:", checkoutErr);
          checkoutResult = { error: { message: checkoutErr?.message || "Payment modal closed" } };
        } finally {
          window.removeEventListener("popstate", handlePopState);
          // If modal closed via internal Leave/Cancel button rather than browser back button, cleanly pop the history state
          if (isCheckoutActiveRef.current) {
            isCheckoutActiveRef.current = false;
            if (window.history.state?.modal === "cashfree_checkout") {
              window.history.back();
            }
          }
        }

        // 3. If user cancelled, closed modal, or payment failed:
        if (checkoutResult?.error) {
          // Do a fast 1-time verification just in case money was debited right before closing
          const quickVerify = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: orderData.jobId, orderId: orderData.orderId }),
          })
            .then((r) => r.json())
            .catch(() => null);

          if (quickVerify?.success && quickVerify?.paid && quickVerify?.otp) {
            setGeneratedOtp(quickVerify.otp);
            setIsOtpModalOpen(true);
            setStep("confirmed");
            if (activeDraftId) {
              removeDraftById(activeDraftId);
              setActiveDraftId(null);
            }
          } else {
            // Immediately stop buffering & show cancellation/failed notice
            setPaying(false);
            setErrorMessage(
              checkoutResult.error?.message ||
                "Payment was cancelled or failed. Please try again."
            );
            return;
          }
        } else {
          // 4. Modal completed normally or redirected - poll server for verification
          let verified = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            await new Promise((res) => setTimeout(res, 1200));
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: orderData.jobId, orderId: orderData.orderId }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success && verifyData.paid && verifyData.otp) {
              setGeneratedOtp(verifyData.otp);
              setIsOtpModalOpen(true);
              setStep("confirmed");
              if (activeDraftId) {
                removeDraftById(activeDraftId);
                setActiveDraftId(null);
              }
              verified = true;
              break;
            }
          }

          if (!verified) {
            throw new Error("Payment was not completed or failed. If money was debited, it will be refunded or please contact support.");
          }
        }
      } else {
        // Fallback for simulation / mock order if no live session returned
        const simRes = await fetch("/api/payment/simulate-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: orderData.jobId }),
        });
        const simData = await simRes.json();
        if (simData.success && simData.otp) {
          setGeneratedOtp(simData.otp);
          setIsOtpModalOpen(true);
          setStep("confirmed");
          if (activeDraftId) {
            removeDraftById(activeDraftId);
            setActiveDraftId(null);
          }
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      if (isCheckoutActiveRef.current) {
        isCheckoutActiveRef.current = false;
        cleanupCashfreeDom();
        if (typeof window !== "undefined" && window.history.state?.modal === "cashfree_checkout") {
          window.history.back();
        }
      }
      setErrorMessage(err.message || "Failed to process payment");
    } finally {
      setPaying(false);
      isCheckoutActiveRef.current = false;
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

  // Page Turn & Slide Gesture Actions
  const handleNextPage = () => {
    if (previewPageIndex < currentDocTotalPages) {
      setPageTurnAnim("next");
      setPreviewPageIndex((p) => Math.min(currentDocTotalPages, p + 1));
    }
  };

  const handlePrevPage = () => {
    if (previewPageIndex > 1) {
      setPageTurnAnim("prev");
      setPreviewPageIndex((p) => Math.max(1, p - 1));
    }
  };

  const handlePageTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setTouchStartX(clientX);
    setTouchDragX(0);
    setIsDraggingPage(true);
  };

  const handlePageTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isDraggingPage) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - touchStartX;
    setTouchDragX(Math.max(-80, Math.min(80, diff)));
  };

  const handlePageTouchEnd = () => {
    if (touchStartX === null || !isDraggingPage) return;
    if (touchDragX < -35) {
      handleNextPage();
    } else if (touchDragX > 35) {
      handlePrevPage();
    }
    setTouchStartX(null);
    setTouchDragX(0);
    setIsDraggingPage(false);
  };

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
                {errorMessage.toLowerCase().includes("cancel")
                  ? "Payment Cancelled"
                  : errorMessage.toLowerCase().includes("payment") || errorMessage.toLowerCase().includes("failed")
                  ? "Payment Failed"
                  : "Notice"}
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
        {step === "upload" && (
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
                    onClick={handleUploadAreaClick}
                    className="border border-dashed border-neutral-300 hover:border-[#0c831f] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-all bg-neutral-50/50 hover:bg-emerald-50/20 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0c831f] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      {user ? <UploadCloud className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1">
                      {user ? "Click to upload or drag & drop" : "Sign in to Upload Files"}
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-xs text-center mb-5">
                      {user
                        ? `PDF, Word (.docx), PowerPoint (.pptx), or Images up to ${maxFileSizeMb} MB (chunked upload)`
                        : "Sign in with your campus account to select files, configure print options, and release at any kiosk."}
                    </p>
                    <button
                      type="button"
                      onClick={handleUploadAreaClick}
                      className="bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-semibold rounded-xl px-5 py-2.5 shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm"
                    >
                      {user ? (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Select Files from Device</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Sign in with Google to Upload</span>
                        </>
                      )}
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
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base text-neutral-900">
                          Selected Files
                        </h2>
                        <span className="w-5 h-5 rounded-full bg-[#0c831f] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {documents.length}
                        </span>
                      </div>
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
                      onClick={handleUploadAreaClick}
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
        )}

        {/* ─────────────────────────────────────────────────────────────
            STAGE 2: SLEEK PRINT STUDIO (With Real Document Page Preview)
            ───────────────────────────────────────────────────────────── */}
        {step === "studio" && (
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
                          onClick={handlePrevPage}
                          className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={previewPageIndex >= currentDocTotalPages}
                          onClick={handleNextPage}
                          className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
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
                            setPageTurnAnim(null);
                          }}
                          className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
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

                  {/* The Paper Sheet Display Canvas with Touch Slide & Page Turn Animation */}
                  <div
                    className="bg-neutral-100/70 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center min-h-[360px] sm:min-h-[420px] overflow-hidden border border-neutral-200/50 relative select-none"
                    onTouchStart={handlePageTouchStart}
                    onTouchMove={handlePageTouchMove}
                    onTouchEnd={handlePageTouchEnd}
                    onMouseDown={handlePageTouchStart}
                    onMouseMove={handlePageTouchMove}
                    onMouseUp={handlePageTouchEnd}
                    onMouseLeave={handlePageTouchEnd}
                  >
                    {/* Live Config Overlay Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-neutral-800 shadow-2xs border border-neutral-200/60 uppercase">
                        {colorMode === "bw" ? "⚫ B&W" : "🎨 Color"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-neutral-800 shadow-2xs border border-neutral-200/60 uppercase">
                        {orientation === "portrait" ? "Portrait" : "Landscape"}
                      </span>
                    </div>

                    {/* Responsive Simulated Sheet with Minimal 3D Page Turn & Slide Transition */}
                    <div
                      key={`preview-doc-${previewDocIndex}`}
                      style={{
                        filter: colorMode === "bw" ? "grayscale(100%) contrast(105%)" : "none",
                        transform:
                          isDraggingPage && touchDragX !== 0
                            ? `perspective(1200px) translateX(${touchDragX * 0.4}px) rotateY(${touchDragX * 0.08}deg)`
                            : undefined,
                        transition: isDraggingPage ? "none" : "filter 250ms ease-in-out, transform 250ms ease-out",
                      }}
                      className={`bg-white border border-neutral-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-sm overflow-hidden flex items-center justify-center select-none touch-pan-y relative ${
                        currentDocTotalPages > 1 ? "cursor-grab active:cursor-grabbing" : ""
                      } ${
                        pageTurnAnim === "next"
                          ? "animate-page-turn-next"
                          : pageTurnAnim === "prev"
                          ? "animate-page-turn-prev"
                          : ""
                      } ${
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
                        onTotalPagesDetected={handleTotalPagesDetected}
                      />

                      {/* Editable Template Overlay (Live Watermark & Field Values) */}
                      {isEditableDoc && (
                        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
                          {/* Watermark across all pages */}
                          {watermarkText && (
                            <div
                              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                              style={{ opacity: watermarkOpacity }}
                            >
                              <span
                                className="text-xl sm:text-2xl font-black uppercase tracking-widest -rotate-45 whitespace-nowrap"
                                style={{ color: watermarkColor || "#000000" }}
                              >
                                {watermarkText}
                              </span>
                            </div>
                          )}

                          {/* Fields for current active preview page */}
                          {editableFields
                            .filter((f) => f.pageIndex === previewPageIndex - 1)
                            .map((field) => {
                              const val = filledValues[field.id];
                              if (field.type === "text") {
                                return (
                                  <div
                                    key={field.id}
                                    style={{
                                      left: `${field.x}%`,
                                      top: `${field.y}%`,
                                      width: `${field.width}%`,
                                      height: `${field.height}%`,
                                      color: field.color || "#0c831f",
                                    }}
                                    className="absolute flex items-center justify-center p-0.5 text-center leading-tight overflow-hidden break-words font-semibold text-[10px] sm:text-xs"
                                  >
                                    <span className="truncate w-full">
                                      {val !== undefined && val !== "" ? val : (field.defaultValue || field.title)}
                                    </span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div
                                    key={field.id}
                                    style={{
                                      left: `${field.x}%`,
                                      top: `${field.y}%`,
                                      width: `${field.width}%`,
                                      height: `${field.height}%`,
                                    }}
                                    className="absolute flex items-center justify-center overflow-hidden p-0.5"
                                  >
                                    {val ? (
                                      <img
                                        src={val}
                                        alt={field.title}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <div className="w-full h-full border border-dashed border-neutral-300 rounded flex flex-col items-center justify-center text-[8px] text-neutral-400 bg-neutral-50/40">
                                        <ImageIcon className="w-3 h-3 text-neutral-400" />
                                        <span className="truncate max-w-full px-0.5">{field.title}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })}
                        </div>
                      )}
                    </div>

                    {/* Minimal Slide to Turn Page Hint */}
                    {currentDocTotalPages > 1 && (
                      <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-neutral-400 select-none pointer-events-none">
                        <span>← Slide to turn page →</span>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      EDITABLE DOCUMENT FIELDS PANEL (Sectioned by Page Number)
                      ───────────────────────────────────────────────────────────── */}
                  {isEditableDoc && editableFields.length > 0 && (
                    <div className="pt-3 border-t border-neutral-100 space-y-3.5">
                      {/* Section Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                            <Edit3 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                              Fill Document Fields
                            </h4>
                            <p className="text-[10px] text-neutral-500">
                              Fill details below before printing. Live changes show on the sheet above.
                            </p>
                          </div>
                        </div>

                        {/* Confirmation Status Pill */}
                        {isEditableConfirmed ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-[#0c831f] border border-emerald-200 rounded-full flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-[#0c831f]" />
                            Finalized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Pending Confirm
                          </span>
                        )}
                      </div>

                      {/* Sections by Page Number */}
                      <div className="space-y-3">
                        {Array.from(new Set(editableFields.map((f) => f.pageIndex)))
                          .sort((a, b) => a - b)
                          .map((pIndex) => {
                            const pageFields = editableFields.filter((f) => f.pageIndex === pIndex);
                            const isCurrentActive = previewPageIndex === pIndex + 1;

                            return (
                              <div
                                key={pIndex}
                                className={`rounded-xl p-3 sm:p-3.5 border transition-all ${
                                  isCurrentActive
                                    ? "bg-purple-50/25 border-purple-200 shadow-2xs"
                                    : "bg-neutral-50/50 border-neutral-200/80"
                                }`}
                              >
                                {/* Page Section Header */}
                                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-neutral-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                                      {pIndex + 1}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-800">
                                      Page {pIndex + 1} Fields
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-medium">
                                      ({pageFields.length} {pageFields.length === 1 ? "input" : "inputs"})
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setPreviewPageIndex(pIndex + 1)}
                                    className="text-[11px] font-semibold text-[#0c831f] hover:underline cursor-pointer"
                                  >
                                    View Page {pIndex + 1} →
                                  </button>
                                </div>

                                {/* Inputs Grid on this Page */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {pageFields.map((field) => (
                                    <div key={field.id} className="space-y-1">
                                      <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1.5">
                                        {field.type === "image" ? (
                                          <ImageIcon className="w-3 h-3 text-purple-600 shrink-0" />
                                        ) : (
                                          <Type className="w-3 h-3 text-[#0c831f] shrink-0" />
                                        )}
                                        <span className="truncate">{field.title}</span>
                                      </label>

                                      {field.type === "text" ? (
                                        <input
                                          type="text"
                                          value={filledValues[field.id] ?? ""}
                                          placeholder={field.defaultValue || "Type text here..."}
                                          onChange={(e) => {
                                            setFilledValues((prev) => ({
                                              ...prev,
                                              [field.id]: e.target.value,
                                            }));
                                            setIsEditableConfirmed(false);
                                          }}
                                          onFocus={() => {
                                            if (previewPageIndex !== field.pageIndex + 1) {
                                              setPreviewPageIndex(field.pageIndex + 1);
                                            }
                                          }}
                                          className="w-full h-9 px-3 text-xs bg-white rounded-lg text-neutral-900 border border-neutral-200/90 focus:ring-2 focus:ring-[#0c831f] focus:border-transparent transition-all"
                                        />
                                      ) : (
                                        /* Image Field Uploader */
                                        <div className="bg-white border border-neutral-200/90 rounded-lg p-2">
                                          {filledValues[field.id] ? (
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <img
                                                  src={filledValues[field.id]}
                                                  alt={field.title}
                                                  className="w-8 h-8 rounded object-cover border border-neutral-200 shrink-0"
                                                />
                                                <span className="text-[11px] text-neutral-600 truncate font-medium">
                                                  Image attached
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <label className="text-[10px] font-bold text-[#0c831f] hover:underline cursor-pointer">
                                                  Replace
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageFieldChange(field.id, e)}
                                                  />
                                                </label>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setFilledValues((prev) => {
                                                      const updated = { ...prev };
                                                      delete updated[field.id];
                                                      return updated;
                                                    });
                                                    setIsEditableConfirmed(false);
                                                  }}
                                                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                                >
                                                  Clear
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-neutral-50 hover:bg-emerald-50/30 border border-dashed border-neutral-300 hover:border-[#0c831f] rounded text-[11px] font-semibold text-neutral-600 cursor-pointer transition-colors">
                                              <UploadCloud className="w-3.5 h-3.5 text-neutral-400" />
                                              <span>Upload {field.title}</span>
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageFieldChange(field.id, e)}
                                              />
                                            </label>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Confirm & Finalize Button */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-[11px] text-neutral-500">
                          {isEditableConfirmed ? (
                            <span className="text-[#0c831f] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0c831f]" />
                              Document finalized! Pay button is now enabled.
                            </span>
                          ) : (
                            <span>Confirm changes to finalize document and enable payment.</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsEditableConfirmed(true);
                          }}
                          className={`w-full sm:w-auto h-9 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            isEditableConfirmed
                              ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                              : "bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isEditableConfirmed
                              ? "Re-confirm Changes"
                              : "Confirm & Finalize Document"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
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

                  {isEditableDoc && !isEditableConfirmed && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs p-2.5 rounded-xl flex items-center gap-2 mt-3">
                      <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Please fill the editable fields above and click &quot;Confirm &amp; Finalize Document&quot; before paying.</span>
                    </div>
                  )}

                  {/* In-Page Pay Button (Monitored by IntersectionObserver) */}
                  <button
                    ref={inPagePayButtonRef}
                    type="button"
                    disabled={paying || calculatingPrice || (isEditableDoc && !isEditableConfirmed)}
                    onClick={handleProceedToPayment}
                    className="w-full bg-[#0c831f] hover:bg-[#0a6e1a] disabled:opacity-50 text-white font-bold rounded-xl py-3 px-4 shadow-md text-sm mt-3 transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    {paying || calculatingPrice ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : isEditableDoc && !isEditableConfirmed ? (
                      <span>Confirm Fields to Enable Pay</span>
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
                    1. Pay securely via Cashfree (UPI, Cards, NetBanking).<br />
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
              disabled={paying || calculatingPrice || (isEditableDoc && !isEditableConfirmed)}
              onClick={handleProceedToPayment}
              className="bg-[#0c831f] hover:bg-[#0a6e1a] disabled:opacity-50 text-white font-bold px-5 h-9 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {paying ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>
                {isEditableDoc && !isEditableConfirmed
                  ? "Confirm Fields First"
                  : "Pay & Get OTP"}
              </span>
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CONFIRMED / SUCCESS OVERVIEW (BEHIND THE OTP POPUP)
            Studio is replaced so user doesn't see unpaid configuration
            ───────────────────────────────────────────────────────────── */}
        {step === "confirmed" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-center my-6 max-w-md mx-auto flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-[#eefaf0] flex items-center justify-center text-[#0c831f] mb-3 shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#1c1c1c] tracking-tight">
              Print Order Confirmed!
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
              Your documents have been processed and are ready to release at any campus kiosk.
            </p>

            {generatedOtp && (
              <div className="w-full my-4 p-3.5 bg-[#eefaf0] rounded-xl flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                    Campus Kiosk OTP
                  </span>
                  <span className="text-2xl font-black font-mono tracking-widest text-[#0c831f] shimmer-otp-text">
                    {generatedOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 flex items-center gap-1 transition-all"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-3">
              <button
                type="button"
                onClick={() => {
                  setDocuments([]);
                  setGeneratedOtp(null);
                  setIsOtpModalOpen(false);
                  setActiveDraftId(null);
                  setColorMode("bw");
                  setOrientation("portrait");
                  setCopies(1);
                  setPageRangeType("all");
                  setCustomRange("");
                  setAppliedOffer("");
                  setStep("upload");
                  if (typeof window !== "undefined") {
                    window.history.replaceState({}, "", "/user/print");
                  }
                }}
                className="w-full sm:flex-1 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Print Another File</span>
              </button>
              <Link
                href="/user/history"
                className="w-full sm:flex-1 h-11 rounded-xl bg-[#0c831f] hover:bg-[#0a6e1a] active:scale-98 text-white text-xs sm:text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span>My Print Jobs</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM NOTIFICATION PANEL: OTP RELEASE SHEET (Universal Kiosk)
          Rendered via Portal directly into document.body at z-[99999]
          with stopPropagation to guarantee 100% interactive touch/clicks
          ───────────────────────────────────────────────────────────── */}
      {mounted && isOtpModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center pointer-events-auto overflow-hidden"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOtpModalOpen(false);
            }
          }}
        >
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto"
            onClick={() => setIsOtpModalOpen(false)}
          />

          {/* Bottom-to-Up Panel (Zero gaps on left/right on phone screen) */}
          <div
            className="relative z-10 w-full sm:max-w-md bg-white rounded-t-[26px] sm:rounded-2xl border-t sm:border border-neutral-200/90 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] p-5 pb-8 sm:p-6 sm:pb-6 animate-in slide-in-from-bottom duration-300 ease-out pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Top drag handle indicator for mobile notification style */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-3 sm:hidden" />

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOtpModalOpen(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center pt-1 pb-1">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-[#0c831f] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#1c1c1c] tracking-tight">
                Print Order Confirmed!
              </h2>
            </div>

            {/* OTP Box: slightly reduced corner radius (rounded-lg) and NO border */}
            <div className="text-center">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                Your 6-Digit Universal OTP
              </span>
              <div className="my-3 py-3.5 px-6 bg-[#eefaf0] rounded-lg flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] font-mono shimmer-otp-text select-all">
                  {generatedOtp}
                </span>
              </div>
            </div>

            {/* How to use OTP - Yellow box with NO border as requested */}
            <div className="bg-[#fbf9f3] rounded-xl p-3.5 my-3 text-left">
              <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block mb-2">
                How to release your print
              </span>
              <ul className="space-y-1.5 text-xs text-neutral-600 font-normal">
                <li className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Walk up to <strong>any campus kiosk</strong> touchscreen</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Tap on <strong>"Enter OTP"</strong> on the main screen</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Enter this 6-digit code to immediately release prints</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Universal code valid for 60 minutes across all kiosks</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                type="button"
                className="w-full font-semibold rounded-xl text-xs h-11 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  copyOtpToClipboard();
                }}
              >
                {copiedOtp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedOtp ? "Copied OTP!" : "Copy OTP"}</span>
              </button>
              <Link
                href="/user/history"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOtpModalOpen(false);
                }}
                className="w-full font-bold rounded-xl text-xs h-11 bg-[#0c831f] hover:bg-[#0a6e1a] active:scale-98 text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                View in My Print Jobs
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
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
