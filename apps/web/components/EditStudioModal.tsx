"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileText,
  Sparkles,
  Type,
  Image as ImageIcon,
  Stamp,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  UploadCloud,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Move,
  Maximize2,
} from "lucide-react";
import { database, ref, set } from "@/lib/firebase";
import { uploadDocumentInChunks } from "@/lib/clientUploader";

export interface EditableField {
  id: string;
  pageIndex: number; // 0-indexed
  type: "text" | "image";
  title: string;
  defaultValue?: string;
  x: number; // 0 to 100 percentage from left
  y: number; // 0 to 100 percentage from top
  width: number; // percentage width
  height: number; // percentage height
  color: string; // text or accent color
  backgroundColor?: string;
}

interface EditStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  user: any;
  profile: any;
  isVerified: boolean;
  maxFileSizeMb: number;
  onSuccess: (message: string) => void;
}

// Compress avatar/thumbnail
function compressImageTo10Kb(fileOrUrl: File | string, maxDimension = 120): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.7;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > 13500 && quality > 0.15) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => resolve("");
    if (typeof fileOrUrl === "string") {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(fileOrUrl);
    }
  });
}

function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => stripUndefined(v)) as unknown as T;
  }
  if (typeof obj === "object") {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    }
    return clean as unknown as T;
  }
  return obj;
}

export function EditStudioModal({
  isOpen,
  onClose,
  file,
  user,
  profile,
  isVerified,
  maxFileSizeMb,
  onSuccess,
}: EditStudioModalProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 595,
    height: 842,
  });
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(true);

  // Field states
  const [fields, setFields] = useState<EditableField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Watermark
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.18);
  const [watermarkColor, setWatermarkColor] = useState<string>("#000000");

  // Tool Dialogs
  const [toolModalType, setToolModalType] = useState<"input" | "image" | "watermark" | null>(null);
  const [toolInputTitle, setToolInputTitle] = useState<string>("");

  // Publish Dialog
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishTitle, setPublishTitle] = useState<string>("");
  const [publishPassword, setPublishPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [publishError, setPublishError] = useState<string | null>(null);

  // Canvas Refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Initialize title
  useEffect(() => {
    if (file) {
      setPublishTitle(file.name.replace(/\.pdf$/i, ""));
    }
  }, [file]);

  // Load PDF & generate thumbnails
  useEffect(() => {
    if (!isOpen || !file) return;

    let isCancelled = false;
    setLoadingPdf(true);

    const loadPdf = async () => {
      try {
        // Ensure PDF.js is loaded
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById("pdfjs-cdn-script");
            if (existing) {
              if ((window as any).pdfjsLib) return resolve();
              existing.addEventListener("load", () => resolve());
              existing.addEventListener("error", () => reject(new Error("Failed to load PDF.js")));
              return;
            }
            const script = document.createElement("script");
            script.id = "pdfjs-cdn-script";
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF.js"));
            document.head.appendChild(script);
          });
        }

        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) throw new Error("PDF.js unavailable");
        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (isCancelled) return;
        setPdfDoc(doc);

        // Pre-render thumbnails for top slider
        const thumbs: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          if (i === 1) {
            setPageDimensions({ width: unscaledViewport.width, height: unscaledViewport.height });
          }

          const thumbScale = 120 / unscaledViewport.width;
          const thumbViewport = page.getViewport({ scale: thumbScale });
          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = thumbViewport.width;
          thumbCanvas.height = thumbViewport.height;
          const thumbCtx = thumbCanvas.getContext("2d");
          if (thumbCtx) {
            await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
            thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.7));
          }
        }

        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingPdf(false);
        }
      } catch (err: any) {
        console.error("Failed to load PDF in Edit Studio:", err);
        if (!isCancelled) {
          setLoadingPdf(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, file]);

  // Render active page on main canvas
  useEffect(() => {
    if (!pdfDoc || activePageIndex >= pdfDoc.numPages) return;

    let isCancelled = false;

    const renderActivePage = async () => {
      try {
        const page = await pdfDoc.getPage(activePageIndex + 1);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: unscaledViewport.width, height: unscaledViewport.height });

        const canvas = mainCanvasRef.current;
        if (!canvas) return;

        // Render at high resolution (target width around 800px)
        const scale = 800 / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
      }
    };

    renderActivePage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePageIndex]);

  // Handle adding Input Box
  const handleConfirmInputBox = () => {
    const title = toolInputTitle.trim() || "Text Field";
    const newField: EditableField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: activePageIndex,
      type: "text",
      title,
      defaultValue: "Text Here",
      x: 25,
      y: 35,
      width: 40,
      height: 7,
      color: "#111827",
      backgroundColor: "#ffffff",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setToolModalType(null);
    setToolInputTitle("");
  };

  // Handle adding Image Box
  const handleConfirmImageBox = () => {
    const title = toolInputTitle.trim() || "Image Slot";
    const newField: EditableField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: activePageIndex,
      type: "image",
      title,
      x: 35,
      y: 35,
      width: 30,
      height: 18,
      color: "#0c831f",
      backgroundColor: "#f0fdf4",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setToolModalType(null);
    setToolInputTitle("");
  };

  // Handle confirming Watermark
  const handleConfirmWatermark = () => {
    setWatermarkText(toolInputTitle.trim());
    setToolModalType(null);
    setToolInputTitle("");
  };

  // Dragging logic
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);

    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startClientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const startClientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const initialX = field.x;
    const initialY = field.y;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const curClientX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curClientY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaX = ((curClientX - startClientX) / rect.width) * 100;
      const deltaY = ((curClientY - startClientY) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100 - field.width, initialX + deltaX));
      const newY = Math.max(0, Math.min(100 - field.height, initialY + deltaY));

      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId
            ? { ...f, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 }
            : f
        )
      );
    };

    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  // Resizing logic
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, fieldId: string) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);

    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startClientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const startClientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const initialWidth = field.width;
    const initialHeight = field.height;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const curClientX = "touches" in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curClientY = "touches" in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaW = ((curClientX - startClientX) / rect.width) * 100;
      const deltaH = ((curClientY - startClientY) / rect.height) * 100;

      const newWidth = Math.max(12, Math.min(100 - field.x, initialWidth + deltaW));
      const newHeight = Math.max(4, Math.min(100 - field.y, initialHeight + deltaH));

      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                width: Math.round(newWidth * 10) / 10,
                height: Math.round(newHeight * 10) / 10,
              }
            : f
        )
      );
    };

    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  // Change field color
  const handleChangeColor = (fieldId: string, color: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, color } : f)));
  };

  // Submit Publish
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTitle.trim()) {
      setPublishError("Please give this editable template a title.");
      return;
    }

    setUploading(true);
    setPublishError(null);

    try {
      setUploadStatusText("Securing base PDF in cloud vault...");
      const uploadedDoc = await uploadDocumentInChunks({
        file,
        ownerUid: user?.uid || "anonymous",
        maxFileSizeMb,
        onProgress: (p) => {
          setUploadProgress(p.percent);
        },
      });

      const docFileId = String(
        uploadedDoc?.documentId || uploadedDoc?.fileId || uploadedDoc?.id || `file_${Date.now()}`
      );

      // User Avatar
      let uploaderPhoto = profile?.photoURL || user?.photoURL || "";
      if (uploaderPhoto) {
        try {
          uploaderPhoto = await compressImageTo10Kb(uploaderPhoto, 100);
        } catch {}
      }

      const uploaderName =
        profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Campus Student";

      const newDocId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const hasPassword = Boolean(publishPassword.trim());

      const publicDocRecord: Record<string, any> = {
        id: newDocId,
        fileId: docFileId,
        title: publishTitle.trim(),
        isEditable: true,
        editableFields: fields,
        pageCount: pdfDoc?.numPages || 1,
        fileSizeBytes: file.size,
        uploaderUid: user?.uid || "anonymous",
        uploaderName,
        uploaderPhotoURL: uploaderPhoto || "",
        uploaderVerified: Boolean(isVerified),
        thumbnailUrl: pageThumbnails[0] || "",
        hasPassword,
        printCount: 0,
        createdAt: Date.now(),
      };

      if (watermarkText) {
        publicDocRecord.watermarkText = watermarkText;
        publicDocRecord.watermarkOpacity = watermarkOpacity;
        publicDocRecord.watermarkColor = watermarkColor;
      }

      if (hasPassword) {
        publicDocRecord.password = publishPassword.trim();
      }

      const safePayload = stripUndefined(publicDocRecord);
      await set(ref(database, `publicDocuments/${newDocId}`), safePayload);

      onSuccess(`Editable template "${publishTitle.trim()}" published successfully!`);
      onClose();
    } catch (err: any) {
      setPublishError(err.message || "Failed to publish editable document.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const activePageFields = fields.filter((f) => f.pageIndex === activePageIndex);
  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const aspectRatio = pageDimensions.width / pageDimensions.height;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200 select-none">
      {/* ──────────────── Top Navigation Bar ──────────────── */}
      <header className="h-14 bg-white border-b border-neutral-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer shrink-0"
            title="Exit Edit Studio"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                Edit Studio
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-purple-100 text-purple-700 rounded-[3px] border border-purple-200 shrink-0">
                Template Builder
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
              {file.name}
            </p>
          </div>
        </div>

        {/* Action Button: Publish Editable Doc */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="h-9 px-3.5 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Editable Doc</span>
          </button>
        </div>
      </header>

      {/* ──────────────── Top Page Thumbnails Carousel Slider ──────────────── */}
      <div className="bg-neutral-50/95 border-b border-neutral-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider shrink-0 pl-1 hidden sm:inline-block">
          Pages:
        </span>
        <div
          ref={carouselRef}
          className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-none flex-1"
        >
          {pageThumbnails.length > 0 ? (
            pageThumbnails.map((thumb, idx) => {
              const isActive = idx === activePageIndex;
              const pageFieldCount = fields.filter((f) => f.pageIndex === idx).length;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActivePageIndex(idx);
                    setSelectedFieldId(null);
                  }}
                  className={`relative shrink-0 rounded-lg overflow-hidden transition-all cursor-pointer border ${
                    isActive
                      ? "ring-2 ring-[#0c831f] border-[#0c831f] shadow-sm scale-105"
                      : "border-neutral-300/70 hover:border-neutral-400 opacity-75 hover:opacity-100"
                  }`}
                  style={{ width: "48px", height: "64px" }}
                >
                  <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <span
                    className={`absolute bottom-0 inset-x-0 text-[9px] font-bold py-0.5 text-center ${
                      isActive ? "bg-[#0c831f] text-white" : "bg-black/60 text-white"
                    }`}
                  >
                    p.{idx + 1}
                  </span>
                  {pageFieldCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-purple-600 text-white text-[8px] font-bold flex items-center justify-center">
                      {pageFieldCount}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span>Generating page thumbnails...</span>
            </div>
          )}
        </div>

        {/* Page Switcher Counter */}
        <div className="flex items-center gap-1 shrink-0 text-xs text-neutral-600 font-semibold px-2">
          <span>
            {activePageIndex + 1} / {pdfDoc?.numPages || 1}
          </span>
        </div>
      </div>

      {/* ──────────────── Main Canvas & Studio Body ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900/40 relative">
        {/* Floating Tools Toolbar */}
        <div className="absolute top-3 inset-x-0 z-30 flex justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 p-1.5 flex items-center gap-1.5 pointer-events-auto">
            {/* Tool 1: + INPUT BOX */}
            <button
              type="button"
              onClick={() => {
                setToolInputTitle("");
                setToolModalType("input");
              }}
              className="h-8 px-3 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Input Box</span>
            </button>

            {/* Tool 2: + IMAGE BOX */}
            <button
              type="button"
              onClick={() => {
                setToolInputTitle("");
                setToolModalType("image");
              }}
              className="h-8 px-3 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Image Box</span>
            </button>

            {/* Tool 3: WATERMARK */}
            <button
              type="button"
              onClick={() => {
                setToolInputTitle(watermarkText);
                setToolModalType("watermark");
              }}
              className={`h-8 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                watermarkText
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              }`}
            >
              <Stamp className="w-3.5 h-3.5 text-amber-600" />
              <span>{watermarkText ? "Watermark (On)" : "Watermark"}</span>
            </button>
          </div>
        </div>

        {/* Page Render Canvas Area */}
        <div
          onClick={() => setSelectedFieldId(null)}
          className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center"
        >
          {loadingPdf ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold">Loading document canvas...</p>
            </div>
          ) : (
            <div
              ref={canvasContainerRef}
              className="relative bg-white shadow-2xl rounded-sm border border-neutral-300/80 overflow-hidden"
              style={{
                width: "100%",
                maxWidth: pageDimensions.width > pageDimensions.height ? "750px" : "550px",
                aspectRatio: `${aspectRatio}`,
              }}
            >
              {/* Underlying rendered PDF page canvas */}
              <canvas ref={mainCanvasRef} className="w-full h-full object-contain pointer-events-none" />

              {/* Watermark Overlay (Across All Pages) */}
              {watermarkText && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10"
                  style={{ opacity: watermarkOpacity }}
                >
                  <span
                    className="font-black text-center tracking-widest uppercase break-words px-4 leading-none"
                    style={{
                      transform: "rotate(-32deg)",
                      fontSize: "clamp(2rem, 7vw, 4.5rem)",
                      color: watermarkColor,
                    }}
                  >
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* Editable Fields Overlay */}
              {activePageFields.map((field) => {
                const isSelected = field.id === selectedFieldId;
                return (
                  <div
                    key={field.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                    onMouseDown={(e) => handleStartDrag(e, field.id)}
                    onTouchStart={(e) => handleStartDrag(e, field.id)}
                    className={`absolute z-20 cursor-move transition-shadow rounded-sm flex flex-col justify-between select-none ${
                      isSelected
                        ? "ring-2 ring-[#0c831f] shadow-lg border-2 border-[#0c831f] bg-white/95"
                        : "border-2 border-dashed border-neutral-700/70 hover:border-[#0c831f] bg-white/85 shadow-xs"
                    }`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    {/* Header Label Pill & Drag Handle */}
                    <div className="flex items-center justify-between px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-bold leading-none select-none">
                      <span className="truncate pr-1">{field.title}</span>
                      <Move className="w-2.5 h-2.5 opacity-70 shrink-0" />
                    </div>

                    {/* Field Content Preview */}
                    <div className="flex-1 flex items-center justify-center px-1 overflow-hidden pointer-events-none">
                      {field.type === "text" ? (
                        <span
                          className="font-semibold truncate text-[11px] sm:text-xs tracking-tight"
                          style={{ color: field.color }}
                        >
                          {field.defaultValue || "Text Here"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-purple-700 font-bold">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Image Slot</span>
                        </div>
                      )}
                    </div>

                    {/* Floating mini-toolbar when box is selected */}
                    {isSelected && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -top-9 left-0 z-30 bg-neutral-900 text-white rounded-lg px-2 py-1 flex items-center gap-2 shadow-xl text-[10px] whitespace-nowrap animate-in fade-in"
                      >
                        {/* Color Options for text fields */}
                        {field.type === "text" && (
                          <div className="flex items-center gap-1">
                            {["#111827", "#0c831f", "#2563eb", "#dc2626"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleChangeColor(field.id, c)}
                                className={`w-3.5 h-3.5 rounded-full border border-white/60 cursor-pointer ${
                                  field.color === c ? "ring-2 ring-white scale-110" : ""
                                }`}
                                style={{ backgroundColor: c }}
                                title={`Set Color ${c}`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.id)}
                          className="text-rose-400 hover:text-rose-200 cursor-pointer flex items-center gap-0.5"
                          title="Delete Box"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}

                    {/* Resize Handle (Bottom-Right corner) */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => handleStartResize(e, field.id)}
                        onTouchStart={(e) => handleStartResize(e, field.id)}
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0c831f] text-white flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-30"
                        title="Drag to resize box"
                      >
                        <Maximize2 className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── Tool Prompt Modal (Input Box / Image Box / Watermark) ──────────────── */}
      {toolModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center">
                  {toolModalType === "input" && <Type className="w-4 h-4 text-[#0c831f]" />}
                  {toolModalType === "image" && <ImageIcon className="w-4 h-4 text-purple-600" />}
                  {toolModalType === "watermark" && <Stamp className="w-4 h-4 text-amber-600" />}
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {toolModalType === "input" && "Add Text Input Box"}
                  {toolModalType === "image" && "Add Image Slot"}
                  {toolModalType === "watermark" && "Document Watermark"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setToolModalType(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  {toolModalType === "watermark" ? "Watermark Text" : "Title / Label of Box"}
                </label>
                <input
                  type="text"
                  value={toolInputTitle}
                  onChange={(e) => setToolInputTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (toolModalType === "input") handleConfirmInputBox();
                      else if (toolModalType === "image") handleConfirmImageBox();
                      else handleConfirmWatermark();
                    }
                  }}
                  placeholder={
                    toolModalType === "input"
                      ? "e.g. Student Name, Roll No, Date"
                      : toolModalType === "image"
                      ? "e.g. Passport Photo, Signature"
                      : "e.g. CONFIDENTIAL, SAMPLE, PRINTMART"
                  }
                  autoFocus
                  className="w-full h-10 px-3.5 text-xs bg-neutral-50 rounded-xl text-neutral-900 border border-neutral-200 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                />
              </div>

              {/* Quick suggestion tags */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Suggestions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(toolModalType === "input"
                    ? ["Student Name", "Roll No", "Date", "Father's Name", "College Name"]
                    : toolModalType === "image"
                    ? ["Passport Photo", "Signature", "Official Stamp", "ID Card Photo"]
                    : ["CONFIDENTIAL", "SAMPLE", "OFFICIAL", "PRINTMART", "DO NOT COPY"]
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setToolInputTitle(s)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-700 rounded-md border border-neutral-200/60 cursor-pointer transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermark opacity options */}
              {toolModalType === "watermark" && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-neutral-700 block">
                    Watermark Opacity:
                  </span>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Subtle (12%)", val: 0.12 },
                      { label: "Medium (20%)", val: 0.2 },
                      { label: "Bold (35%)", val: 0.35 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setWatermarkOpacity(opt.val)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-colors ${
                          watermarkOpacity === opt.val
                            ? "bg-emerald-50 text-[#0c831f] border-emerald-300"
                            : "bg-white text-neutral-600 border-neutral-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setToolModalType(null)}
                  className="flex-1 h-9 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (toolModalType === "input") handleConfirmInputBox();
                    else if (toolModalType === "image") handleConfirmImageBox();
                    else handleConfirmWatermark();
                  }}
                  className="flex-1 h-9 bg-[#0c831f] hover:bg-[#0a701a] text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── Publish Confirmation Modal ──────────────── */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#0c831f]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Publish Editable Document</h3>
                  <p className="text-[11px] text-neutral-500">
                    Users will fill fields before printing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !uploading && setIsPublishModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {publishError && (
              <div className="p-3 bg-rose-50 border-0 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{publishError}</span>
              </div>
            )}

            <form onSubmit={handlePublishSubmit} className="space-y-3.5">
              {/* Template Summary Pill */}
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Template Configuration:
                </span>
                <p className="text-xs font-semibold text-neutral-800">
                  {fields.length} Fillable Field{fields.length === 1 ? "" : "s"} • {pdfDoc?.numPages || 1} Pages
                  {watermarkText ? ` • Watermark "${watermarkText}"` : ""}
                </p>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. Campus Admission Form 2024, Lab Record Front Page"
                  className="w-full h-10 px-3.5 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  required
                />
              </div>

              {/* Optional Access Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">
                    Access Password (Optional)
                  </label>
                  <span className="text-[10px] text-neutral-400">Leave blank for public</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={publishPassword}
                    onChange={(e) => setPublishPassword(e.target.value)}
                    placeholder="Enter password if restricted"
                    className="w-full h-10 pl-3.5 pr-10 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0c831f]">
                    <span className="truncate pr-2">{uploadStatusText || "Uploading template..."}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#0c831f] h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsPublishModalOpen(false)}
                  className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Back to Editing
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 h-11 bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Confirm & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
