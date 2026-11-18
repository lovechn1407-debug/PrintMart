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
  AlignLeft,
  AlignCenter,
  AlignRight,
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
  fontWeight?: string; // "normal" | "medium" | "semibold" | "bold" | "800"
  textAlign?: "left" | "center" | "right";
  fontSize?: number;
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

          // Thumbnail render scale
          const thumbScale = 120 / unscaledViewport.width;
          const thumbViewport = page.getViewport({ scale: thumbScale });
          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = thumbViewport.width;
          thumbCanvas.height = thumbViewport.height;
          const thumbCtx = thumbCanvas.getContext("2d");
          if (thumbCtx) {
            await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
            thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.75));
          }
        }
        if (!isCancelled) {
          setPageThumbnails(thumbs);
          setLoadingPdf(false);
        }
      } catch (err: any) {
        console.error("Error loading PDF in Edit Studio:", err);
        if (!isCancelled) setLoadingPdf(false);
      }
    };

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, file]);

  // Render active page on main canvas
  useEffect(() => {
    if (!pdfDoc || activePageIndex < 0 || activePageIndex >= pdfDoc.numPages) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(activePageIndex + 1);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageDimensions({ width: unscaledViewport.width, height: unscaledViewport.height });

        const canvas = mainCanvasRef.current;
        if (!canvas) return;

        // Render at high resolution
        const renderScale = 1.8;
        const viewport = page.getViewport({ scale: renderScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error("Failed to render active page canvas:", err);
      }
    };

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePageIndex]);

  // Direct ribbon tool: Add Input Box
  const handleAddInputBoxDirect = () => {
    const textFieldsCount = fields.filter((f) => f.type === "text").length;
    const defaultLabels = ["Student Name", "Roll No", "Date", "Subject", "Signature", "Designation"];
    const label = defaultLabels[textFieldsCount % defaultLabels.length] || `Input ${textFieldsCount + 1}`;
    const newField: EditableField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: activePageIndex,
      type: "text",
      title: label,
      defaultValue: "Text Here",
      x: 35,
      y: 35 + (fields.length % 5) * 5,
      width: 30,
      height: 5.5,
      color: "#0c831f",
      fontWeight: "bold",
      textAlign: "center",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Direct ribbon tool: Add Image Box
  const handleAddImageBoxDirect = () => {
    const imgFieldsCount = fields.filter((f) => f.type === "image").length;
    const defaultLabels = ["Passport Photo", "Signature", "Official Stamp", "ID Card Photo"];
    const label = defaultLabels[imgFieldsCount % defaultLabels.length] || `Image ${imgFieldsCount + 1}`;
    const newField: EditableField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageIndex: activePageIndex,
      type: "image",
      title: label,
      x: 35,
      y: 35 + (fields.length % 4) * 6,
      width: 25,
      height: 16,
      color: "#0c831f",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateFieldTitle = (fieldId: string, title: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, title } : f)));
  };

  const handleUpdateFieldWeight = (fieldId: string, fontWeight: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, fontWeight } : f)));
  };

  const handleUpdateFieldAlign = (fieldId: string, textAlign: "left" | "center" | "right") => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, textAlign } : f)));
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

  // Resizing logic — proportional font size scales with box height
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

      const deltaX = ((curClientX - startClientX) / rect.width) * 100;
      const deltaY = ((curClientY - startClientY) / rect.height) * 100;

      const newWidth = Math.max(5, Math.min(100 - field.x, initialWidth + deltaX));
      const newHeight = Math.max(2, Math.min(100 - field.y, initialHeight + deltaY));

      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                width: Math.round(newWidth * 10) / 10,
                height: Math.round(newHeight * 10) / 10,
                fontSize: Math.round(newHeight * 0.65 * (pageDimensions.height / 100)),
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

      // Generate page 1 thumbnail
      let thumbnailUrl = "";
      if (pageThumbnails.length > 0) {
        thumbnailUrl = await compressImageTo10Kb(pageThumbnails[0]);
      }

      setUploadStatusText("Registering editable template in campus library...");
      const newDocId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const hasPassword = Boolean(publishPassword.trim());

      const uploaderPhoto = profile?.photoURL || user?.photoURL || "";
      const compressedPhoto = uploaderPhoto
        ? await compressImageTo10Kb(uploaderPhoto).catch(() => "")
        : "";

      const publicDocRecord: any = {
        id: newDocId,
        fileId: docFileId,
        title: publishTitle.trim(),
        mainTitle: publishTitle.trim(),
        originalFilename: file.name,
        fileSizeBytes: Number(file.size) || 0,
        pageCount: pdfDoc?.numPages || 1,
        uploaderUid: user?.uid || "anonymous",
        uploaderName: profile?.displayName || user?.displayName || "Campus Student",
        uploaderPhotoURL: compressedPhoto || undefined,
        uploaderVerified: isVerified,
        thumbnailUrl: thumbnailUrl || undefined,
        isEditable: true,
        editableFields: fields,
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
      {/* ──────────────── Top Navigation Bar (Matched to Print Studio UI) ──────────────── */}
      <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Exit Edit Studio"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight leading-tight truncate">
              Edit Studio
            </h1>
            <p className="text-[11px] text-neutral-500 truncate max-w-[200px] sm:max-w-md">
              {file.name}
            </p>
          </div>
        </div>

        {/* Action Button: Publish Editable Doc */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="h-9 px-4 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Editable Doc</span>
          </button>
        </div>
      </header>

      {/* ──────────────── Top Page Thumbnails Carousel Slider ──────────────── */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-neutral-500 shrink-0 pl-1 hidden sm:inline-block">
          Pages:
        </span>
        <div
          ref={carouselRef}
          className="flex items-center gap-2 overflow-x-auto py-0.5 px-0.5 scrollbar-none flex-1"
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
                  className={`relative shrink-0 rounded-[4px] overflow-hidden transition-all cursor-pointer ${
                    isActive
                      ? "border border-[#0c831f] shadow-2xs"
                      : "border border-neutral-300/80 hover:border-neutral-400 opacity-80 hover:opacity-100"
                  }`}
                  style={{ width: "42px", height: "56px" }}
                >
                  <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <span
                    className={`absolute bottom-0 inset-x-0 text-[9px] font-bold py-0.5 text-center leading-none ${
                      isActive ? "bg-[#0c831f] text-white" : "bg-black/60 text-white"
                    }`}
                  >
                    {idx + 1}
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
            <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span>Generating page thumbnails...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-xs text-neutral-600 font-semibold px-2">
          <span>
            {activePageIndex + 1} / {pdfDoc?.numPages || 1}
          </span>
        </div>
      </div>

      {/* ──────────────── TOOLS RIBBON (Row 1: Actions & Watermark) ──────────────── */}
      <div className="w-full bg-white border-b border-neutral-200 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5 overflow-x-auto shrink-0 select-none">
        {/* Left: Tool buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tool: Add Input Box */}
          <button
            type="button"
            onClick={handleAddInputBoxDirect}
            className="h-7 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-normal rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Add text input box to active page"
          >
            <Type className="w-3 h-3 text-emerald-400" />
            <span>+ Input Box</span>
          </button>

          {/* Tool: Add Image Box */}
          <button
            type="button"
            onClick={handleAddImageBoxDirect}
            className="h-7 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-normal rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Add image box to active page"
          >
            <ImageIcon className="w-3 h-3 text-purple-400" />
            <span>+ Image Box</span>
          </button>
        </div>

        {/* Right: Watermark inline control */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-neutral-200">
          <Stamp className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="text-[10px] text-neutral-400 font-normal hidden sm:inline">Watermark:</span>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Type watermark..."
            className="h-6 px-2 text-[11px] font-normal border border-neutral-300 rounded-[3px] w-28 sm:w-36 bg-neutral-50 focus:bg-white focus:border-[#0c831f] outline-none"
          />
          {watermarkText && (
            <select
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
              className="h-6 px-1 text-[11px] font-normal border border-neutral-300 rounded-[3px] bg-neutral-50 outline-none cursor-pointer"
            >
              <option value="0.10">10%</option>
              <option value="0.18">18%</option>
              <option value="0.25">25%</option>
              <option value="0.40">40%</option>
            </select>
          )}
        </div>
      </div>

      {/* ──────────────── ACTIVE FIELD CONFIGURATIONS RIBBON (Row 2: Dedicated row when a box is selected) ──────────────── */}
      {selectedField && (
        <div className="w-full bg-neutral-50/95 border-b border-neutral-200 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2.5 overflow-x-auto shrink-0 select-none animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Title / Label input */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-neutral-500 font-medium">Label:</span>
              <input
                type="text"
                value={selectedField.title}
                onChange={(e) => handleUpdateFieldTitle(selectedField.id, e.target.value)}
                className="h-6 px-1.5 text-[11px] font-normal border border-neutral-300 rounded-[3px] w-28 sm:w-36 bg-white focus:border-[#0c831f] outline-none"
                placeholder="Field label..."
              />
            </div>

            {/* Text specific controls: Weight, Align, Color */}
            {selectedField.type === "text" && (
              <>
                <div className="w-px h-4 bg-neutral-200 shrink-0" />

                {/* Font Weight */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-neutral-500 font-medium">Weight:</span>
                  <select
                    value={selectedField.fontWeight || "bold"}
                    onChange={(e) => handleUpdateFieldWeight(selectedField.id, e.target.value)}
                    className="h-6 px-1 text-[11px] font-normal border border-neutral-300 rounded-[3px] bg-white outline-none cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semi-Bold</option>
                    <option value="bold">Bold</option>
                    <option value="800">Extra Bold</option>
                  </select>
                </div>

                <div className="w-px h-4 bg-neutral-200 shrink-0" />

                {/* Text Alignment */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-neutral-500 font-medium">Align:</span>
                  <div className="flex items-center gap-0.5 border border-neutral-300 rounded-[3px] p-0.5 bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateFieldAlign(selectedField.id, "left")}
                      className={`p-1 rounded-[2px] transition-colors cursor-pointer ${
                        (selectedField.textAlign || "center") === "left"
                          ? "bg-emerald-50 text-[#0c831f] ring-1 ring-[#0c831f]/30"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateFieldAlign(selectedField.id, "center")}
                      className={`p-1 rounded-[2px] transition-colors cursor-pointer ${
                        (selectedField.textAlign || "center") === "center"
                          ? "bg-emerald-50 text-[#0c831f] ring-1 ring-[#0c831f]/30"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateFieldAlign(selectedField.id, "right")}
                      className={`p-1 rounded-[2px] transition-colors cursor-pointer ${
                        (selectedField.textAlign || "center") === "right"
                          ? "bg-emerald-50 text-[#0c831f] ring-1 ring-[#0c831f]/30"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title="Align Right"
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="w-px h-4 bg-neutral-200 shrink-0" />

                {/* Color Palette */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-neutral-500 font-medium">Color:</span>
                  <div className="flex items-center gap-1">
                    {["#111827", "#0c831f", "#2563eb", "#dc2626", "#7c3aed"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleChangeColor(selectedField.id, c)}
                        className={`w-4 h-4 rounded-[3px] border border-neutral-300 cursor-pointer transition-transform ${
                          selectedField.color === c ? "ring-2 ring-[#0c831f] ring-offset-1 scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                        title={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Delete Box Button */}
          <button
            type="button"
            onClick={() => handleDeleteField(selectedField.id)}
            className="h-6 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-normal rounded-[3px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-auto"
            title="Delete this box"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Box</span>
          </button>
        </div>
      )}

      {/* ──────────────── Main Canvas & Studio Body ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900/40 relative">
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
                    className={`absolute cursor-move select-none transition-shadow ${
                      isSelected
                        ? "border border-[#0c831f] bg-white/70 shadow-2xs z-30"
                        : "border border-dashed border-neutral-400/80 hover:border-neutral-600 bg-white/40 z-20"
                    }`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    {/* Content preview with container query: font size scales dynamically with box height */}
                    <div
                      className={`w-full h-full flex items-center p-0.5 overflow-hidden pointer-events-none ${
                        field.textAlign === "left"
                          ? "justify-start"
                          : field.textAlign === "right"
                          ? "justify-end"
                          : "justify-center"
                      }`}
                      style={{
                        containerType: "size",
                      }}
                    >
                      {field.type === "text" ? (
                        <span
                          style={{
                            color: field.color,
                            fontWeight: field.fontWeight || "bold",
                            fontSize: "58cqh",
                            lineHeight: "1.1",
                            textAlign: field.textAlign || "center",
                          }}
                          className={`truncate block max-w-full ${
                            field.textAlign === "left"
                              ? "text-left pl-0.5"
                              : field.textAlign === "right"
                              ? "text-right pr-0.5"
                              : "text-center"
                          }`}
                        >
                          {field.defaultValue || "Text Here"}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-purple-700">
                          <ImageIcon className="w-3.5 h-3.5 opacity-80" />
                          <span style={{ fontSize: "28cqh" }} className="leading-tight opacity-80">
                            Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Resize Handle (Bottom-Right corner) */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => handleStartResize(e, field.id)}
                        onTouchStart={(e) => handleStartResize(e, field.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#0c831f] text-white rounded-[2px] cursor-nwse-resize shadow-xs hover:scale-125 transition-transform z-40"
                        title="Drag to resize box"
                      />
                    )}

                    {/* Move Handle (Arrow in circle slightly below the input box) */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => handleStartDrag(e, field.id)}
                        onTouchStart={(e) => handleStartDrag(e, field.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-neutral-300 shadow-md flex items-center justify-center cursor-move text-neutral-700 hover:text-[#0c831f] hover:border-[#0c831f] transition-colors z-40 active:scale-95"
                        title="Drag to move box"
                      >
                        <Move className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── Publish Confirmation Dialog ──────────────── */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#0c831f]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Publish Editable Document</h3>
                  <p className="text-[11px] text-neutral-500">
                    Campus students can fill your fields &amp; print
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

            <form onSubmit={handlePublishSubmit} className="space-y-3.5">
              {publishError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Template Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. Physics Assignment Cover, Admission Form"
                  required
                  className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl text-neutral-900 border border-neutral-200 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                />
              </div>

              {/* Password Protection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">Access Password</label>
                  <span className="text-[10px] text-neutral-400">Optional</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={publishPassword}
                    onChange={(e) => setPublishPassword(e.target.value)}
                    placeholder="Leave blank for public access"
                    className="w-full h-10 pl-3 pr-10 text-xs bg-neutral-50 rounded-xl text-neutral-900 border border-neutral-200 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="p-3 bg-neutral-50 rounded-xl text-xs space-y-1 text-neutral-600 border border-neutral-100">
                <div className="flex justify-between">
                  <span>Total Pages:</span>
                  <span className="font-bold text-neutral-900">{pdfDoc?.numPages || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interactive Fields:</span>
                  <span className="font-bold text-neutral-900">{fields.length}</span>
                </div>
                {watermarkText && (
                  <div className="flex justify-between">
                    <span>Watermark:</span>
                    <span className="font-bold text-neutral-900 truncate max-w-[150px]">
                      &quot;{watermarkText}&quot; ({Math.round(watermarkOpacity * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0c831f]">
                    <span>{uploadStatusText}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0c831f] h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsPublishModalOpen(false)}
                  className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 h-10 bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  {uploading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
