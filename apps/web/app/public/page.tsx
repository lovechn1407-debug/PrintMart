"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Search,
  Printer,
  Download,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  FolderUser,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Globe,
  LayoutGrid,
  List,
  Tag,
  Sparkles,
  Layers,
  Edit3,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { database, ref, onValue, set, update, remove } from "@/lib/firebase";
import { uploadDocumentInChunks, estimatePdfPageCount } from "@/lib/clientUploader";
import { EditStudioModal, EditableField } from "@/components/EditStudioModal";

export interface PublicDocument {
  id: string;
  fileId: string;
  title: string;
  mainTitle?: string;
  titles?: string[];
  documentsCount?: number;
  files?: {
    fileId: string;
    title: string;
    pageCount: number;
    fileSizeBytes: number;
  }[];
  originalFilename: string;
  fileSizeBytes: number;
  pageCount: number;
  uploaderUid: string;
  uploaderName: string;
  uploaderPhotoURL?: string;
  uploaderVerified?: boolean;
  thumbnailUrl?: string;
  manualThumbnailUrl?: string;
  tags?: string[];
  isImportant?: boolean;
  isPriority?: boolean;
  hasPassword?: boolean;
  password?: string;
  printCount: number;
  createdAt: number;
  isEditable?: boolean;
  editableFields?: EditableField[];
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: string;
}

function formatBytes(bytes: number = 0): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

async function ensurePdfJs(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

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
    script.onerror = () => reject(new Error("Failed to load PDF.js script"));
    document.head.appendChild(script);
  });
  return (window as any).pdfjsLib;
}

async function getAccuratePdfPageCount(file: File): Promise<number> {
  try {
    const pdfjs = await ensurePdfJs();
    if (pdfjs) {
      const buffer = await file.slice(0, Math.min(file.size, 35 * 1024 * 1024)).arrayBuffer();
      const p = await pdfjs.getDocument({ data: buffer }).promise;
      if (p?.numPages > 0) {
        return p.numPages;
      }
    }
  } catch (err) {
    console.warn("PDF.js page count failed, using estimate:", err);
  }
  return await estimatePdfPageCount(file);
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "Recently";
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// Compress any image or avatar to <= 10 KB (approx 13,500 base64 chars)
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

// Generate Page 1 PDF thumbnail compressed to <= 10 KB with optional baked pixel blur
async function generatePdfThumbnail(file: File, isProtected: boolean = false): Promise<string> {
  try {
    if (typeof window === "undefined") return "";

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
        script.onload = () => {
          try {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          } catch (e) {}
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return "";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    await page.render({ canvasContext: ctx, viewport }).promise;

    let targetCanvas = canvas;

    // If protected, bake the blur directly into the image pixel data before exporting to cloud
    if (isProtected) {
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = canvas.width;
      blurCanvas.height = canvas.height;
      const bCtx = blurCanvas.getContext("2d");
      if (bCtx) {
        // Step 1: Low-res downscale pass to destroy small font glyph details
        const lowResCanvas = document.createElement("canvas");
        lowResCanvas.width = Math.max(16, Math.round(canvas.width / 6));
        lowResCanvas.height = Math.max(20, Math.round(canvas.height / 6));
        const lowCtx = lowResCanvas.getContext("2d");
        if (lowCtx) {
          lowCtx.imageSmoothingEnabled = true;
          lowCtx.drawImage(canvas, 0, 0, lowResCanvas.width, lowResCanvas.height);

          // Step 2: Draw low-res back with blur filter onto blurCanvas
          bCtx.filter = "blur(6px)";
          bCtx.drawImage(lowResCanvas, 0, 0, blurCanvas.width, blurCanvas.height);
          targetCanvas = blurCanvas;
        } else {
          bCtx.filter = "blur(12px)";
          bCtx.drawImage(canvas, 0, 0);
          targetCanvas = blurCanvas;
        }
      }
    }

    let quality = 0.65;
    let dataUrl = targetCanvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > 13500 && quality > 0.15) {
      quality -= 0.1;
      dataUrl = targetCanvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  } catch (err) {
    console.warn("Could not generate PDF thumbnail:", err);
    return "";
  }
}

/**
 * Single-line filename component with automatic back-and-forth marquee when text overflows
 */
function MarqueeTitle({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState<number>(0);

  useEffect(() => {
    const updateOverflow = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        setOverflowDistance(diff > 2 ? diff : 0);
      }
    };

    updateOverflow();
    window.addEventListener("resize", updateOverflow);
    return () => window.removeEventListener("resize", updateOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap relative">
      <span
        ref={textRef}
        title={text}
        style={
          overflowDistance > 0
            ? ({
                "--marquee-distance": `-${overflowDistance + 8}px`,
              } as React.CSSProperties)
            : undefined
        }
        className={`inline-block text-sm font-bold text-neutral-900 group-hover:text-[#0c831f] transition-colors leading-snug ${
          overflowDistance > 0 ? "animate-marquee-bounce" : ""
        }`}
      >
        {text}
      </span>
    </div>
  );
}

function RotatingTitle({
  titles,
  defaultTitle,
}: {
  titles?: string[];
  defaultTitle: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const list = titles && titles.length > 0 ? titles : [defaultTitle];

  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [list.length]);

  if (list.length <= 1) {
    return <MarqueeTitle text={defaultTitle} />;
  }

  return (
    <div className="relative h-5 overflow-hidden w-full">
      {list.map((t, idx) => {
        const isCurrent = idx === currentIndex;
        const isPrev = idx === (currentIndex - 1 + list.length) % list.length;
        return (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center transition-all duration-500 ease-out ${
              isCurrent
                ? "translate-y-0 opacity-100 pointer-events-auto"
                : isPrev
                ? "-translate-y-full opacity-0 pointer-events-none"
                : "translate-y-full opacity-0 pointer-events-none"
            }`}
          >
            <span className="text-xs sm:text-[13px] font-bold text-neutral-900 truncate block group-hover:text-[#0c831f] transition-colors">
              {t}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PublicDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth();

  // Document List State
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMyUploadsOnly, setShowMyUploadsOnly] = useState<boolean>(false);

  // Filter & Sort State
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "protected" | "free">("all");
  const [sortBy, setSortBy] = useState<"newest" | "prints">("newest");
  const filterRef = useRef<HTMLDivElement>(null);

  // View mode: 'list' (default) or 'grid' (2 box per row)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Verified creators lookup map
  const [verifiedUserMap, setVerifiedUserMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const map: Record<string, boolean> = {};
        Object.entries(snap.val()).forEach(([uid, val]: [string, any]) => {
          if (val.isVerified) {
            map[uid] = true;
          }
        });
        setVerifiedUserMap(map);
      }
    });
    return () => unsub();
  }, []);

  const isCurrentVerified = Boolean(
    profile?.isVerified || (user?.uid && verifiedUserMap[user.uid])
  );

  // Upload Choice Modal & Edit Studio States
  const [isUploadChoiceOpen, setIsUploadChoiceOpen] = useState<boolean>(false);
  const [isEditStudioOpen, setIsEditStudioOpen] = useState<boolean>(false);
  const [editStudioFile, setEditStudioFile] = useState<File | null>(null);
  const editableFileInputRef = useRef<HTMLInputElement>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titleInput, setTitleInput] = useState<string>("");
  const [mainTitleInput, setMainTitleInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(100);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verified creator upload states
  const [manualThumbnailFile, setManualThumbnailFile] = useState<File | null>(null);
  const [manualThumbnailPreview, setManualThumbnailPreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isImportant, setIsImportant] = useState<boolean>(false);
  const [isPriority, setIsPriority] = useState<boolean>(false);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Bundle Info Modal State (when user clicks dotted underlined title)
  const [selectedBundleDoc, setSelectedBundleDoc] = useState<PublicDocument | null>(null);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleManualThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setManualThumbnailFile(file);
    try {
      const compressed = await compressImageTo10Kb(file, 200);
      setManualThumbnailPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setManualThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    setAdditionalFiles(files);
    if (files.length > 0 && !mainTitleInput) {
      const base = selectedFile ? selectedFile.name.replace(/\.pdf$/i, "") : "Document";
      setMainTitleInput(`${base} Bundle`);
    }
  };

  const handleRemoveAdditionalFile = (idxToRemove: number) => {
    setAdditionalFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

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

  // Delete Confirmation State
  const [docToDelete, setDocToDelete] = useState<PublicDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Password Unlock Modal State
  const [passwordModalDoc, setPasswordModalDoc] = useState<PublicDocument | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>("");
  const [showEnteredPassword, setShowEnteredPassword] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  // Success Notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown]);

  // Prevent background scroll when modal open
  useEffect(() => {
    if (
      isUploadChoiceOpen ||
      isEditStudioOpen ||
      isUploadModalOpen ||
      passwordModalDoc ||
      docToDelete ||
      selectedBundleDoc
    ) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [
    isUploadChoiceOpen,
    isEditStudioOpen,
    isUploadModalOpen,
    passwordModalDoc,
    docToDelete,
    selectedBundleDoc,
  ]);

  // Load Public Documents in Real-Time
  useEffect(() => {
    const pubRef = ref(database, "publicDocuments");
    const unsub = onValue(
      pubRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const list = Object.values(raw) as PublicDocument[];
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setDocuments(list);
        } else {
          setDocuments([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load public docs:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Filtered & Sorted Documents
  const filteredDocs = documents
    .filter((doc) => {
      // My Uploads filter
      if (showMyUploadsOnly) {
        if (!user || doc.uploaderUid !== user.uid) return false;
      }
      // Protected / Free filter
      if (activeFilter === "protected" && !doc.hasPassword) return false;
      if (activeFilter === "free" && doc.hasPassword) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.originalFilename.toLowerCase().includes(q) ||
        doc.uploaderName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // 1. Priority pin: Priority documents always show on top
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      // 2. Sort by prints or newest
      if (sortBy === "prints") {
        return (b.printCount || 0) - (a.printCount || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const myUploadsCount = user
    ? documents.filter((d) => d.uploaderUid === user.uid).length
    : 0;

  // Handle Editable File Pick -> opens Edit Studio
  const handleEditableFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Editable files only support PDF format.");
      return;
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setUploadError(`File exceeds maximum allowed size of ${maxFileSizeMb}MB.`);
      return;
    }
    setEditStudioFile(file);
    setIsUploadChoiceOpen(false);
    setIsEditStudioOpen(true);
    e.target.value = "";
  };

  // Handle File Pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents are supported for public sharing.");
      return;
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setUploadError(`File exceeds maximum allowed size of ${maxFileSizeMb}MB.`);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    const baseName = file.name.replace(/\.pdf$/i, "");
    setTitleInput(baseName);
    if (additionalFiles.length > 0 && !mainTitleInput) {
      setMainTitleInput(`${baseName} Bundle`);
    }
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a PDF document to upload.");
      return;
    }

    const allFiles = [selectedFile, ...additionalFiles].filter(Boolean) as File[];
    const isMultiDoc = allFiles.length > 1;

    if (isMultiDoc && !mainTitleInput.trim() && !titleInput.trim()) {
      setUploadError("Please enter a Main Title for this document bundle.");
      return;
    }

    if (!titleInput.trim() && !mainTitleInput.trim()) {
      setUploadError("Please give this document a title or name.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Preload PDF.js before uploading so page counting is accurate
      await ensurePdfJs().catch(() => {});

      const primaryBundleTitle = isMultiDoc
        ? (mainTitleInput.trim() || titleInput.trim() || selectedFile.name.replace(/\.pdf$/i, ""))
        : (titleInput.trim() || selectedFile.name.replace(/\.pdf$/i, ""));

      const titles = [
        titleInput.trim() || selectedFile.name.replace(/\.pdf$/i, ""),
        ...additionalFiles.map((f) => f.name.replace(/\.pdf$/i, "")),
      ];

      let totalBytes = 0;
      let totalPages = 0;
      const uploadedFileRecords: {
        fileId: string;
        title: string;
        pageCount: number;
        fileSizeBytes: number;
      }[] = [];

      for (let i = 0; i < allFiles.length; i++) {
        const fileToUpload = allFiles[i];
        totalBytes += Number(fileToUpload.size) || 0;

        // Accurate page count using PDF.js
        const accuratePages = await getAccuratePdfPageCount(fileToUpload);
        totalPages += accuratePages;

        setUploadStatusText(
          allFiles.length > 1
            ? `Uploading document ${i + 1} of ${allFiles.length}: ${fileToUpload.name}`
            : "Encrypting into cloud vault..."
        );

        const uploadedDoc = await uploadDocumentInChunks({
          file: fileToUpload,
          ownerUid: user?.uid || "anonymous",
          maxFileSizeMb,
          onProgress: (p) => {
            const fraction = p.percent / 100;
            const overall = Math.round(((i + fraction) / allFiles.length) * 100);
            setUploadProgress(overall);
          },
        });

        const docFileId = String(
          uploadedDoc?.documentId ||
          uploadedDoc?.fileId ||
          uploadedDoc?.id ||
          `DOC_${Date.now()}_${i}`
        );

        uploadedFileRecords.push({
          fileId: docFileId,
          title: String(titles[i] || fileToUpload.name.replace(/\.pdf$/i, "") || `Document ${i + 1}`),
          pageCount: accuratePages,
          fileSizeBytes: Number(fileToUpload.size) || 0,
        });
      }

      const primaryDocFileId = String(
        uploadedFileRecords[0]?.fileId || `pub_${Date.now()}`
      );
      const hasPassword = Boolean(passwordInput.trim());

      // 2. Custom thumbnail or auto-generated Page 1 PDF thumbnail
      let finalThumbnail = manualThumbnailPreview || "";
      if (!finalThumbnail) {
        try {
          finalThumbnail = await generatePdfThumbnail(selectedFile, hasPassword);
        } catch (thumbErr) {
          console.warn("Thumbnail generation skipped:", thumbErr);
        }
      }

      // 3. User Avatar re-compressed to <= 10 KB
      let uploaderPhoto = profile?.photoURL || user?.photoURL || "";
      if (uploaderPhoto) {
        try {
          uploaderPhoto = await compressImageTo10Kb(uploaderPhoto, 100);
        } catch (e) {
          // Fallback if cross-origin canvas is blocked
        }
      }

      const uploaderName =
        profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Campus Student";

      // 4. Prepare Public Document Record
      const newDocId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const publicDocRecord: Record<string, any> = {
        id: newDocId,
        fileId: primaryDocFileId,
        title: primaryBundleTitle,
        documentsCount: allFiles.length,
        files: uploadedFileRecords,
        originalFilename: selectedFile.name || "document.pdf",
        fileSizeBytes: totalBytes,
        pageCount: totalPages,
        uploaderUid: user?.uid || "anonymous",
        uploaderName: uploaderName || "Campus Student",
        uploaderPhotoURL: uploaderPhoto || "",
        uploaderVerified: Boolean(isCurrentVerified),
        thumbnailUrl: finalThumbnail || "",
        hasPassword: Boolean(hasPassword),
        printCount: 0,
        createdAt: Date.now(),
      };

      if (isMultiDoc) {
        publicDocRecord.mainTitle = primaryBundleTitle;
      }
      if (titles.length > 1) {
        publicDocRecord.titles = titles.filter(Boolean);
      }
      if (manualThumbnailPreview) {
        publicDocRecord.manualThumbnailUrl = manualThumbnailPreview;
      }
      if (tags.length > 0) {
        publicDocRecord.tags = tags.filter(Boolean);
      }
      if (isImportant) {
        publicDocRecord.isImportant = true;
      }
      if (isPriority) {
        publicDocRecord.isPriority = true;
      }

      // Only attach password key if user specified one (avoids Firebase "value argument contains undefined" error)
      if (hasPassword && passwordInput.trim()) {
        publicDocRecord.password = passwordInput.trim();
      }

      // 5. Clean all undefined values before saving to Firebase Realtime Database
      const safeRecord = stripUndefined(publicDocRecord);
      await set(ref(database, `publicDocuments/${newDocId}`), safeRecord);

      // Clean up & Close Modal
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setAdditionalFiles([]);
      setManualThumbnailFile(null);
      setManualThumbnailPreview(null);
      setTags([]);
      setIsImportant(false);
      setIsPriority(false);
      setTitleInput("");
      setMainTitleInput("");
      setPasswordInput("");
      setSuccessMessage("Document shared to Public Library successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please check your network and try again.");
    } finally {
      setUploading(false);
    }
  };

  // Delete Document Confirmation & Execution
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await remove(ref(database, `publicDocuments/${docToDelete.id}`));
      setSuccessMessage(`"${docToDelete.title}" deleted from Public library.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setDocToDelete(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to delete file.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger Print on Document
  const handlePrintClick = (doc: PublicDocument) => {
    if (doc.hasPassword && doc.password) {
      setPasswordModalDoc(doc);
      setEnteredPassword("");
      setUnlockError(null);
    } else {
      proceedToPrintStudio(doc);
    }
  };

  // Verify Password & Proceed
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalDoc) return;

    if (enteredPassword.trim() !== (passwordModalDoc.password || "").trim()) {
      setUnlockError("Incorrect password. Please try again.");
      return;
    }

    setIsUnlocking(true);
    const targetDoc = passwordModalDoc;
    setPasswordModalDoc(null);
    setEnteredPassword("");
    setUnlockError(null);
    setIsUnlocking(false);

    proceedToPrintStudio(targetDoc);
  };

  // Increment Counter & Route to Print Studio
  const proceedToPrintStudio = async (doc: PublicDocument) => {
    try {
      const currentPrints = doc.printCount || 0;
      await update(ref(database, `publicDocuments/${doc.id}`), {
        printCount: currentPrints + 1,
      }).catch(() => {});
    } catch (e) {
      // Non-blocking
    }

    // Save bundle records in sessionStorage for Print Studio
    if (doc.files && doc.files.length > 0) {
      const bundleRecords = doc.files.map((f, idx) => ({
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
      }));
      try {
        sessionStorage.setItem("printmart_public_bundle", JSON.stringify(bundleRecords));
      } catch (err) {
        console.warn("Could not save bundle to sessionStorage:", err);
      }
    } else {
      try {
        sessionStorage.removeItem("printmart_public_bundle");
      } catch {}
    }

    // Save editable config in sessionStorage for Print Studio
    if (doc.isEditable) {
      try {
        sessionStorage.setItem(
          "printmart_editable_config",
          JSON.stringify({
            isEditable: true,
            editableFields: doc.editableFields || [],
            watermarkText: doc.watermarkText || "",
            watermarkOpacity: doc.watermarkOpacity ?? 0.18,
            watermarkColor: doc.watermarkColor || "#000000",
          })
        );
      } catch (err) {
        console.warn("Could not save editable config to sessionStorage:", err);
      }
    } else {
      try {
        sessionStorage.removeItem("printmart_editable_config");
      } catch {}
    }

    const printUrl = `/user/print?publicDocId=${encodeURIComponent(doc.id)}&docId=${encodeURIComponent(
      doc.fileId
    )}&title=${encodeURIComponent(doc.mainTitle || doc.title)}&pages=${doc.pageCount}&isEditable=${
      doc.isEditable ? "1" : "0"
    }`;
    router.push(printUrl);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f3f4f7] text-neutral-900 pb-20 select-none">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin mb-3" />
          <p className="text-xs font-medium text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f3f4f7] text-neutral-900 pb-28 select-none relative overflow-x-hidden">
        <AppNavbar />

        {/* Golden Hero Banner */}
        <div className="bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] pt-8 pb-12 px-4 w-full text-center">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white flex items-center justify-center text-[#0c831f] mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1c1c] tracking-tight">
              Public Documents
            </h1>
            <p className="text-xs sm:text-sm text-neutral-700 mt-1 max-w-sm leading-relaxed">
              Browse shared notes, previous question papers, assignments, or upload your own for campus access.
            </p>
          </div>
        </div>

        {/* Sign In Required Box */}
        <main className="max-w-sm mx-auto px-4 -mt-4 w-full flex-1 flex flex-col items-center">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-center w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#1c1c1c] tracking-tight">
                Sign in to view Public Docs
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                You must be signed in with your campus account to view, download, and print public documents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full h-11 bg-neutral-950 hover:bg-neutral-800 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
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
              <span>Sign in with Google</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f7] text-neutral-900 pb-24 select-none">
      <AppNavbar />

      {/* Success Notification Snackbar */}
      {successMessage && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center pointer-events-none px-4 animate-in slide-in-from-top duration-200">
          <div className="bg-[#0c831f] text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold pointer-events-auto">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. WARM GOLDEN HERO BANNER (Matches Homepage & More aesthetic)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] pt-4 pb-6 px-4 w-full">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1c1c] tracking-tight">
                Public Documents
              </h1>
              <p className="text-xs sm:text-sm text-neutral-700 mt-0.5 max-w-lg leading-relaxed">
                Browse shared notes, previous question papers, assignments, or upload your own for campus access.
              </p>
            </div>

            {/* Action Buttons: My Uploads & Upload File on the right */}
            <div className="flex items-center gap-2 sm:ml-auto shrink-0 justify-end">
              {user && (
                <button
                  type="button"
                  onClick={() => setShowMyUploadsOnly((prev) => !prev)}
                  className={`h-10 px-3.5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer ${
                    showMyUploadsOnly
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-800 border border-neutral-200/90 hover:bg-neutral-50"
                  }`}
                  title="View your uploaded documents"
                >
                  <FolderUser className="w-4 h-4" />
                  <span>My Uploads</span>
                  {myUploadsCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#0c831f] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {myUploadsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Upload File Button on the right with slightly decreased corner radius (rounded-lg) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setTitleInput("");
                  setPasswordInput("");
                  setUploadError(null);
                  setIsUploadChoiceOpen(true);
                }}
                className="h-10 px-4 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* Search Bar with Filter Button (Reduced Corner Radius) */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by document title, notes, subject, or author..."
                className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-white rounded-xl text-neutral-900 placeholder:text-neutral-400 border border-neutral-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0c831f] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setShowFilterDropdown((prev) => !prev)}
                className={`h-11 px-3.5 bg-white border rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  activeFilter !== "all" || sortBy !== "newest"
                    ? "border-[#0c831f] text-[#0c831f] bg-emerald-50/30"
                    : "border-neutral-200/90 text-neutral-700 hover:bg-neutral-50"
                }`}
                title="Filter and Sort Documents"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
                <ChevronDown className="w-3 h-3 text-neutral-500" />
              </button>

              {/* Filter Dropdown Popover */}
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200/90 shadow-xl p-3 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Sort By
                    </span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy("newest");
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          sortBy === "newest"
                            ? "bg-emerald-50 text-[#0c831f]"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        Newest First
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy("prints");
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          sortBy === "prints"
                            ? "bg-emerald-50 text-[#0c831f]"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        Most Printed
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Document Access
                    </span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilter("all");
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeFilter === "all"
                            ? "bg-emerald-50 text-[#0c831f]"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        All Documents
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilter("free");
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeFilter === "free"
                            ? "bg-emerald-50 text-[#0c831f]"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        Free / Unrestricted
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilter("protected");
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeFilter === "protected"
                            ? "bg-emerald-50 text-[#0c831f]"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        Password Protected
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DOCUMENTS LISTING / BUFFER LOADING STATE
          ───────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 mt-2">
        {loading ? (
          /* Circular Buffer Loading Animation */
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-emerald-100 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
            <p className="text-xs font-semibold text-neutral-500">Loading public library...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-center my-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 text-[#0c831f]" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              {showMyUploadsOnly
                ? "You haven't uploaded any public files yet"
                : searchQuery
                ? "No matching documents"
                : "No public documents shared yet"}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-5">
              {showMyUploadsOnly
                ? "Tap Upload File to share your notes or syllabus with campus students."
                : searchQuery
                ? `No files found matching "${searchQuery}". Try a different keyword.`
                : "Be the first to share notes, previous exam question papers, or campus syllabus!"}
            </p>
            <button
              type="button"
              onClick={() => {
                if (showMyUploadsOnly) setShowMyUploadsOnly(false);
                else if (searchQuery) setSearchQuery("");
                else setIsUploadChoiceOpen(true);
              }}
              className="px-5 py-2.5 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              {showMyUploadsOnly
                ? "View All Documents"
                : searchQuery
                ? "Clear Search"
                : "Upload First File"}
            </button>
          </div>
        ) : (
          /* Document Cards Grid */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-neutral-500 font-medium">
              <span>
                {filteredDocs.length} {filteredDocs.length === 1 ? "document" : "documents"}{" "}
                {showMyUploadsOnly ? "in your uploads" : "available"}
              </span>

              {/* View Slider Toggle (List vs Grid 2 box per row) */}
              <div className="inline-flex items-center bg-neutral-200/70 p-0.5 rounded-lg border border-neutral-300/40 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-neutral-900 shadow-2xs font-bold"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-neutral-900 shadow-2xs font-bold"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="Grid View (2 per row)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>
            </div>

            {/* Document Cards Container (List view or 2-column Grid view) */}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-2 sm:gap-2.5"
                  : "grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3"
              }
            >
              {filteredDocs.map((doc) => {
                // Ensure live user profile is shown if this is the active user's document
                const isCurrentUser = user && doc.uploaderUid === user.uid;
                const liveName = isCurrentUser
                  ? profile?.displayName || user?.displayName || doc.uploaderName
                  : doc.uploaderName;
                const livePhoto = isCurrentUser
                  ? profile?.photoURL || doc.uploaderPhotoURL
                  : doc.uploaderPhotoURL;
                const uploaderInitial = (liveName || "C").charAt(0).toUpperCase();
                const isUploaderVerified = Boolean(
                  verifiedUserMap[doc.uploaderUid] || doc.uploaderVerified
                );
                const displayThumbnail = doc.manualThumbnailUrl || doc.thumbnailUrl;

                // Bundle calculations & accurate metrics
                const isBundle = Boolean(
                  (doc.documentsCount && doc.documentsCount > 1) ||
                  (doc.files && doc.files.length > 1)
                );
                const totalDocPages = (doc.files && doc.files.length > 0)
                  ? doc.files.reduce((sum, f) => sum + (Number(f.pageCount) || 1), 0)
                  : (Number(doc.pageCount) || 1);
                const totalDocBytes = (doc.files && doc.files.length > 0)
                  ? doc.files.reduce((sum, f) => sum + (Number(f.fileSizeBytes) || 0), 0)
                  : (Number(doc.fileSizeBytes) || 0);
                const displayTitle = doc.mainTitle || doc.title;

                /* ─── GRID VIEW CARD (2 per row) ─── */
                if (viewMode === "grid") {
                  return (
                    <div
                      key={doc.id}
                      className={
                        doc.isImportant
                          ? "relative rounded-[14px] p-[1.5px] bg-gradient-to-r from-amber-400 via-rose-400 to-[#0c831f] shadow-xs hover:shadow-md transition-all group flex flex-col"
                          : "bg-white rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-neutral-100 flex flex-col justify-between group"
                      }
                    >
                      <div className={doc.isImportant ? "bg-white rounded-[12.5px] p-3 sm:p-3.5 flex flex-col justify-between h-full" : "flex flex-col justify-between h-full"}>
                        {/* 3:4 Thumbnail Preview on top */}
                        <div className="w-full aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden shrink-0 border border-neutral-200/70 flex items-center justify-center relative shadow-2xs">
                          {displayThumbnail ? (
                            <img
                              src={displayThumbnail}
                              alt={displayTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-neutral-400 p-2">
                              <FileText className="w-7 h-7 text-neutral-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                                PDF
                              </span>
                            </div>
                          )}

                          {/* Floating Date Badge */}
                          <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-xs">
                            {formatDate(doc.createdAt)}
                          </span>

                          {/* Editable Badge on Top Corner */}
                          {doc.isEditable && (
                            <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-[3px] shadow-xs tracking-wider z-10">
                              Editable
                            </span>
                          )}

                          {/* Locked icon overlay on thumbnail if password protected */}
                          {doc.hasPassword && (
                            <div className="absolute inset-0 bg-neutral-950/25 flex items-center justify-center pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-neutral-900/85 text-white flex items-center justify-center shadow-md">
                                <Lock className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title & Tags */}
                        <div className="mt-2.5 mb-1.5">
                          <div className="mb-1">
                            {isBundle ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBundleDoc(doc)}
                                className="text-left group/bundleTitle inline-flex items-center gap-1 cursor-pointer max-w-full"
                                title="Click to view all documents in this bundle"
                              >
                                <span className="text-xs font-bold text-neutral-900 group-hover/bundleTitle:text-[#0c831f] transition-colors truncate underline decoration-dotted underline-offset-4 decoration-neutral-400 group-hover/bundleTitle:decoration-[#0c831f]">
                                  {displayTitle}
                                </span>
                                <span className="text-[#0c831f] font-bold text-xs shrink-0 select-none">&gt;</span>
                              </button>
                            ) : (
                              <MarqueeTitle text={displayTitle} />
                            )}
                          </div>

                          {/* Tags with very small corner radius rounded-[3px] */}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1">
                              {doc.tags.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 text-[9px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/70 rounded-[3px] leading-tight truncate max-w-[80px]"
                                >
                                  {t}
                                </span>
                              ))}
                              {doc.tags.length > 2 && (
                                <span className="text-[8.5px] text-neutral-400 font-bold self-center">
                                  +{doc.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium pt-1">
                            <span>{totalDocPages} {totalDocPages === 1 ? "page" : "pages"} • {formatBytes(totalDocBytes)}</span>
                            <span>{doc.printCount || 0} prints</span>
                          </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {livePhoto ? (
                              <img
                                src={livePhoto}
                                alt={liveName}
                                referrerPolicy="no-referrer"
                                className="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-200"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-neutral-900 text-white font-bold text-[8.5px] flex items-center justify-center shrink-0">
                                {uploaderInitial}
                              </div>
                            )}
                            <p className="text-[11px] font-semibold text-neutral-800 truncate leading-tight flex items-center gap-1">
                              <span className="truncate max-w-[65px]">{liveName}</span>
                              {isUploaderVerified && (
                                <img
                                  src="/brand/verified-badge.webp"
                                  alt="Verified"
                                  className="w-3.5 h-3.5 object-contain shrink-0 inline-block align-middle"
                                />
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePrintClick(doc)}
                            className="w-[106px] sm:w-[114px] h-7 px-2 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white text-[10.5px] sm:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
                          >
                            {doc.hasPassword ? (
                              <Lock className="w-2.5 h-2.5 text-white shrink-0" />
                            ) : (
                              <Printer className="w-2.5 h-2.5 text-white shrink-0" />
                            )}
                            <span className="truncate">{isBundle ? "Print Bundle" : "Print"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                /* ─── LIST VIEW CARD (Default) ─── */
                return (
                  <div
                    key={doc.id}
                    className={
                      doc.isImportant
                        ? "relative rounded-[14px] p-[1.5px] bg-gradient-to-r from-amber-400 via-rose-400 to-[#0c831f] shadow-xs hover:shadow-md transition-all group flex flex-col"
                        : "bg-white rounded-[14px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-neutral-100 flex flex-col justify-between group"
                    }
                  >
                    <div className={doc.isImportant ? "bg-white rounded-[12.5px] p-3.5 sm:p-4 flex flex-col justify-between h-full" : "flex flex-col justify-between h-full"}>
                      {/* Top Content: Thumbnail on Left, Metadata on Right */}
                      <div className="flex gap-3 items-start">
                        {/* Left: Document Thumbnail Preview Box in 3:4 ratio */}
                        <div className="w-14 sm:w-16 aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden shrink-0 border border-neutral-200/70 flex items-center justify-center relative shadow-2xs">
                          {displayThumbnail ? (
                            <img
                              src={displayThumbnail}
                              alt={displayTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-neutral-400 p-1.5">
                              <FileText className="w-6 h-6 text-neutral-400" />
                              <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-500">
                                PDF
                              </span>
                            </div>
                          )}

                          {/* Locked icon overlay on thumbnail if password protected */}
                          {doc.hasPassword && (
                            <div className="absolute inset-0 bg-neutral-950/25 flex items-center justify-center pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-neutral-900/85 text-white flex items-center justify-center shadow-md">
                                <Lock className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Editable Badge on Thumbnail */}
                          {doc.isEditable && (
                            <span className="absolute top-1 right-1 bg-purple-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-[3px] shadow-xs tracking-wider z-10">
                              Editable
                            </span>
                          )}
                        </div>

                        {/* Right: Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-medium text-neutral-400">
                                {formatDate(doc.createdAt)}
                              </span>
                              {doc.isEditable && (
                                <span className="px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase bg-purple-600 text-white rounded-[3px] shadow-xs tracking-wider">
                                  Editable
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Delete Button for User's Own Uploads */}
                              {isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => setDocToDelete(doc)}
                                  title="Delete from Public"
                                  className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* File Title */}
                          <div className="mb-1">
                            {isBundle ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBundleDoc(doc)}
                                className="text-left group/bundleTitle inline-flex items-center gap-1.5 cursor-pointer max-w-full"
                                title="Click to view all documents in this bundle"
                              >
                                <span className="text-xs sm:text-[13px] font-bold text-neutral-900 group-hover/bundleTitle:text-[#0c831f] transition-colors truncate underline decoration-dotted underline-offset-4 decoration-neutral-400 group-hover/bundleTitle:decoration-[#0c831f]">
                                  {displayTitle}
                                </span>
                                <span className="text-[#0c831f] font-bold text-xs shrink-0 select-none">&gt;</span>
                              </button>
                            ) : (
                              <MarqueeTitle text={displayTitle} />
                            )}
                          </div>

                          {/* Tags with very small corner radius */}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1">
                              {doc.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/70 rounded-[3px] leading-tight"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Metadata Row: Pages + Size on Left, Print Count on Right */}
                          <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 font-medium">
                            <div className="flex items-center gap-1.5 truncate">
                              <span>
                                {totalDocPages} {totalDocPages === 1 ? "page" : "pages"}
                              </span>
                              <span>•</span>
                              <span>{formatBytes(totalDocBytes)}</span>
                            </div>

                            <div className="inline-flex items-center gap-1 text-neutral-600 font-medium shrink-0 ml-2">
                              <Printer className="w-3 h-3 text-neutral-400" />
                              <span className="font-bold text-neutral-800">{doc.printCount || 0}</span>
                              <span>{doc.printCount === 1 ? "print" : "prints"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Uploader Account & Print Button */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-3">
                        {/* Uploader Account Info with Verified Badge */}
                        <div className="flex items-center gap-2 min-w-0">
                          {livePhoto ? (
                            <img
                              src={livePhoto}
                              alt={liveName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-neutral-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {uploaderInitial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-neutral-800 truncate leading-tight flex items-center gap-1">
                              <span className="truncate">{liveName}</span>
                              {isUploaderVerified && (
                                <img
                                  src="/brand/verified-badge.webp"
                                  alt="Verified"
                                  className="w-3.5 h-3.5 object-contain shrink-0 inline-block align-middle"
                                />
                              )}
                            </p>
                            <p className="text-[10px] text-neutral-400 leading-none">Shared PDF</p>
                          </div>
                        </div>

                        {/* Print Button (Extended uniform width) */}
                        <button
                          type="button"
                          onClick={() => handlePrintClick(doc)}
                          className="w-32 sm:w-36 h-8 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                        >
                          {doc.hasPassword ? (
                            <Lock className="w-3 h-3 text-white shrink-0" />
                          ) : (
                            <Printer className="w-3 h-3 text-white shrink-0" />
                          )}
                          <span>{isBundle ? "Print Bundle" : "Print"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          BUNDLE DOCUMENTS INFO MODAL (All Document Names & Pages)
          ───────────────────────────────────────────────────────────── */}
      {selectedBundleDoc && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-[#0c831f]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 truncate">
                    Bundle Documents Info
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Uploaded by {selectedBundleDoc.uploaderName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBundleDoc(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Title & Summary Stats */}
            <div className="p-3 bg-neutral-50 rounded-xl space-y-1.5 border border-neutral-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Main Title
                </span>
              </div>
              <h4 className="text-sm font-bold text-neutral-900 leading-snug">
                {selectedBundleDoc.mainTitle || selectedBundleDoc.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-neutral-600 font-semibold pt-1">
                <span>
                  {(selectedBundleDoc.files?.length || selectedBundleDoc.documentsCount || 1)} Documents
                </span>
                <span>•</span>
                <span>
                  {(selectedBundleDoc.files && selectedBundleDoc.files.length > 0)
                    ? selectedBundleDoc.files.reduce((acc, f) => acc + (f.pageCount || 1), 0)
                    : (selectedBundleDoc.pageCount || 1)}{" "}
                  Pages Total
                </span>
                <span>•</span>
                <span>
                  {formatBytes(
                    (selectedBundleDoc.files && selectedBundleDoc.files.length > 0)
                      ? selectedBundleDoc.files.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0)
                      : (selectedBundleDoc.fileSizeBytes || 0)
                  )}
                </span>
              </div>
            </div>

            {/* List of Documents with Name & Pages */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(selectedBundleDoc.files && selectedBundleDoc.files.length > 0
                ? selectedBundleDoc.files
                : [
                    {
                      fileId: selectedBundleDoc.fileId,
                      title: selectedBundleDoc.title,
                      pageCount: selectedBundleDoc.pageCount || 1,
                      fileSizeBytes: selectedBundleDoc.fileSizeBytes || 0,
                    },
                  ]
              ).map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-white border border-neutral-200/70 rounded-xl hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0 font-bold text-[11px]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {f.title}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {f.pageCount} {f.pageCount === 1 ? "page" : "pages"} • {formatBytes(f.fileSizeBytes)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSelectedBundleDoc(null)}
                className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedBundleDoc;
                  setSelectedBundleDoc(null);
                  handlePrintClick(target);
                }}
                className="flex-1 h-10 bg-[#0c831f] hover:bg-[#0a701a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bundle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for editable PDF upload */}
      <input
        ref={editableFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleEditableFileSelect}
      />

      {/* ─────────────────────────────────────────────────────────────
          2.5 UPLOAD CHOICE MODAL (Option a: Normal vs Option b: Editable)
          ───────────────────────────────────────────────────────────── */}
      {isUploadChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center">
                  <UploadCloud className="w-4 h-4 text-[#0c831f]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Upload to Public Docs</h3>
                  <p className="text-[11px] text-neutral-500">Choose how you want to share your document</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadChoiceOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Choice Options */}
            <div className="space-y-2.5 pt-1">
              {/* Option a: Upload Files (Normal) */}
              <button
                type="button"
                onClick={() => {
                  setIsUploadChoiceOpen(false);
                  setSelectedFile(null);
                  setTitleInput("");
                  setPasswordInput("");
                  setUploadError(null);
                  setIsUploadModalOpen(true);
                }}
                className="w-full text-left p-4 rounded-xl border border-neutral-200 hover:border-[#0c831f] hover:bg-emerald-50/20 transition-all flex items-start gap-3.5 group cursor-pointer active:scale-99 shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-[#0c831f] transition-colors">
                      a) Upload Files
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-100 text-neutral-600 rounded">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Share standard PDF documents or multi-file bundles for normal campus browsing and direct printing.
                  </p>
                </div>
              </button>

              {/* Option b: Upload Editable File (PDF Only) */}
              <button
                type="button"
                onClick={() => {
                  editableFileInputRef.current?.click();
                }}
                className="w-full text-left p-4 rounded-xl border border-purple-200 hover:border-purple-600 bg-purple-50/20 hover:bg-purple-50/40 transition-all flex items-start gap-3.5 group cursor-pointer active:scale-99 shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-purple-700 transition-colors">
                      b) Upload Editable File
                    </span>
                    <span className="px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase bg-purple-600 text-white rounded-[3px] shadow-xs">
                      PDF Only
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Launch Edit Studio to add fillable input boxes, image placeholders &amp; watermark. Users fill details before printing.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2.6 EDIT STUDIO MODAL (Template Builder)
          ───────────────────────────────────────────────────────────── */}
      {editStudioFile && (
        <EditStudioModal
          isOpen={isEditStudioOpen}
          onClose={() => {
            setIsEditStudioOpen(false);
            setEditStudioFile(null);
          }}
          file={editStudioFile}
          user={user}
          profile={profile}
          isVerified={isCurrentVerified}
          maxFileSizeMb={maxFileSizeMb}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. UPLOAD FILE MODAL / BOTTOM SHEET
          ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center">
                  <UploadCloud className="w-4 h-4 text-[#0c831f]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Share Public PDF</h2>
                  <p className="text-[11px] text-neutral-500">Allow campus users to view & print</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !uploading && setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border-0 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* File Drop / Select Area */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Select PDF Document <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-neutral-200 hover:border-[#0c831f] bg-neutral-50/60 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0c831f] flex items-center justify-center mx-auto">
                        <FileText className="w-4 h-4 text-[#0c831f]" />
                      </div>
                      <p className="text-xs font-bold text-neutral-900 max-w-xs truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-neutral-500">{formatBytes(selectedFile.size)}</p>
                      <span className="text-[10px] font-bold text-[#0c831f] block mt-1">Tap to change file</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-7 h-7 text-neutral-400 mx-auto" />
                      <p className="text-xs font-semibold text-neutral-700">Tap to browse PDF file</p>
                      <p className="text-[10px] text-neutral-400">PDF up to {maxFileSizeMb}MB (chunked)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Title Input (shown if verified user adds more than 1 doc) */}
              {isCurrentVerified && additionalFiles.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800">
                      Main Title <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#0c831f] font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Shown on Library Card
                    </span>
                  </div>
                  <input
                    type="text"
                    value={mainTitleInput}
                    onChange={(e) => setMainTitleInput(e.target.value)}
                    placeholder="e.g. Physics Unit 1-3 Full Package, Maths PYQ (2020-2024)"
                    className="w-full h-10 px-3.5 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                    required
                  />
                  <p className="text-[10px] text-neutral-400">
                    This main title will appear on the card with a clickable &quot;&gt;&quot; link to view all documents.
                  </p>
                </div>
              )}

              {/* Rename File Input / Document 1 Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  {isCurrentVerified && additionalFiles.length > 0
                    ? "Document 1 Title"
                    : "Rename This File (Title)"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={
                    isCurrentVerified && additionalFiles.length > 0
                      ? "e.g. Unit 1 Theory Notes"
                      : "e.g. Physics Unit 3 Notes, Maths PYQ 2024"
                  }
                  className="w-full h-10 px-3.5 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  required
                />
              </div>

              {/* Access Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">
                    Add Access Password (Optional)
                  </label>
                  <span className="text-[10px] text-neutral-400 font-medium">Leave blank for public</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password if you want restricted printing"
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
                <p className="text-[10px] text-neutral-400 leading-tight">
                  If set, anyone clicking Print will have to enter this password first.
                </p>
              </div>

              {/* ── VERIFIED CREATOR OPTIONS ── */}
              {isCurrentVerified && (
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-amber-50/30 to-white rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/brand/verified-badge.webp"
                      alt="Verified"
                      className="w-4 h-4 object-contain shrink-0 inline-block align-middle"
                    />
                    <span className="text-xs font-bold text-neutral-900">
                      Verified Creator Settings
                    </span>
                  </div>

                  {/* 1. Multi-document bundle upload */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-neutral-700">
                        Add More Documents (Bundle)
                      </label>
                      <span className="text-[10px] text-neutral-400">Optional</span>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      onChange={handleAdditionalFilesChange}
                      className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-black cursor-pointer text-neutral-600"
                    />
                    {additionalFiles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[10px] font-bold text-[#0c831f]">
                          {additionalFiles.length} additional document{additionalFiles.length > 1 ? "s" : ""} selected:
                        </p>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {additionalFiles.map((f, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-2.5 py-1.5 bg-white/90 border border-emerald-200/80 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                <span className="font-bold text-[10px] text-neutral-400">#{idx + 2}</span>
                                <span className="truncate text-[11px] text-neutral-800 font-medium">
                                  {f.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 shrink-0">
                                  ({formatBytes(f.size)})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAdditionalFile(idx)}
                                className="text-neutral-400 hover:text-rose-600 text-xs font-bold px-1 cursor-pointer"
                                title="Remove file"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Manual Custom 3:4 Thumbnail */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-neutral-700">
                        Upload Manual 3:4 Thumbnail
                      </label>
                      <span className="text-[10px] text-neutral-400">Optional (Image)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleManualThumbnailChange}
                      className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-neutral-100 file:text-neutral-800 hover:file:bg-neutral-200 cursor-pointer text-neutral-600"
                    />
                    {manualThumbnailPreview && (
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src={manualThumbnailPreview}
                          alt="Custom Thumbnail"
                          className="w-8 aspect-[3/4] object-cover rounded border border-neutral-200"
                        />
                        <span className="text-[10px] text-emerald-700 font-semibold">Custom thumbnail active</span>
                        <button
                          type="button"
                          onClick={() => {
                            setManualThumbnailFile(null);
                            setManualThumbnailPreview(null);
                          }}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Add Tags */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-700 block">
                      Add Tags (e.g. PYQ, Notes, Unit 1)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Type tag & press enter"
                        className="flex-1 h-8 px-2.5 text-xs bg-white rounded-lg text-neutral-900 border border-neutral-200 focus:ring-1 focus:ring-[#0c831f]"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="h-8 px-2.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-black shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-white text-neutral-800 border border-neutral-200 rounded-[3px] flex items-center gap-1"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(idx)}
                              className="text-neutral-400 hover:text-rose-600 text-[10px] leading-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Important Checkbox & 5. Priority Checkbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-100/80">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isImportant}
                        onChange={(e) => setIsImportant(e.target.checked)}
                        className="w-4 h-4 text-[#0c831f] rounded focus:ring-[#0c831f] border-neutral-300"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-neutral-900 block leading-tight">
                          Important Document
                        </span>
                        <span className="text-[9.5px] text-neutral-500 block">
                          Card gets gradient border
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPriority}
                        onChange={(e) => setIsPriority(e.target.checked)}
                        className="w-4 h-4 text-[#0c831f] rounded focus:ring-[#0c831f] border-neutral-300"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-neutral-900 block leading-tight">
                          Priority Placement
                        </span>
                        <span className="text-[9.5px] text-neutral-500 block">
                          Pinned on top of library
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0c831f]">
                    <span className="truncate pr-2">{uploadStatusText || "Uploading chunks to cloud vault..."}</span>
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

              {/* Submit Button (Reduced Corner Radius) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full h-11 bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Generating Preview & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-white" />
                      <span>Upload & Share File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PASSWORD CHALLENGE MODAL (Reduced Corner Radius & Borderless Alert)
          ───────────────────────────────────────────────────────────── */}
      {passwordModalDoc && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Protected Document</h2>
                  <p className="text-[11px] text-neutral-500">Password required to print</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalDoc(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Info */}
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                {passwordModalDoc.title}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Uploaded by {passwordModalDoc.uploaderName} • {passwordModalDoc.pageCount} pages
              </p>
            </div>

            {/* Borderless Incorrect Password Alert Box */}
            {unlockError && (
              <div className="p-2.5 bg-rose-50 border-0 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Enter Password
                </label>
                <div className="relative">
                  <input
                    type={showEnteredPassword ? "text" : "password"}
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      if (unlockError) setUnlockError(null);
                    }}
                    placeholder="Enter document password..."
                    autoFocus
                    className="w-full h-10 pl-3.5 pr-10 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnteredPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalDoc(null)}
                  className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!enteredPassword.trim() || isUnlocking}
                  className="flex-1 h-10 bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  {isUnlocking ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  <span>Unlock & Print</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. DELETE CONFIRMATION MODAL
          ───────────────────────────────────────────────────────────── */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Delete Public Document?</h3>
                <p className="text-[11px] text-neutral-500">This will remove it from the public library</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg line-clamp-2">
              &ldquo;{docToDelete.title}&rdquo;
            </p>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Keep File
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
