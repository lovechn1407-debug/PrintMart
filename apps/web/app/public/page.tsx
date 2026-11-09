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
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { database, ref, onValue, set, update, remove } from "@/lib/firebase";

export interface PublicDocument {
  id: string;
  fileId: string;
  title: string;
  originalFilename: string;
  fileSizeBytes: number;
  pageCount: number;
  uploaderUid: string;
  uploaderName: string;
  uploaderPhotoURL?: string;
  thumbnailUrl?: string;
  hasPassword?: boolean;
  password?: string;
  printCount: number;
  createdAt: number;
}

function formatBytes(bytes: number = 0): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

// Generate Page 1 PDF thumbnail compressed to <= 10 KB
async function generatePdfThumbnail(file: File): Promise<string> {
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

    let quality = 0.65;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > 13500 && quality > 0.15) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  } catch (err) {
    console.warn("Could not generate PDF thumbnail:", err);
    return "";
  }
}

export default function PublicDocumentsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

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

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titleInput, setTitleInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (isUploadModalOpen || passwordModalDoc || docToDelete) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isUploadModalOpen, passwordModalDoc, docToDelete]);

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
      if (sortBy === "prints") {
        return (b.printCount || 0) - (a.printCount || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const myUploadsCount = user
    ? documents.filter((d) => d.uploaderUid === user.uid).length
    : 0;

  // Handle File Pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents are supported for public sharing.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds maximum allowed size of 25MB.");
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    const baseName = file.name.replace(/\.pdf$/i, "");
    setTitleInput(baseName);
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a PDF document to upload.");
      return;
    }
    if (!titleInput.trim()) {
      setUploadError("Please give this document a title or name.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Upload to /api/upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ownerUid", user?.uid || "anonymous");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to upload document.");
      }

      const data = await res.json();
      const uploadedDoc = data.document;
      const docFileId = uploadedDoc.documentId || uploadedDoc.fileId;
      const detectedPages = uploadedDoc.pageCount || 1;

      // 2. Generate Page 1 PDF thumbnail re-compressed to <= 10 KB
      let thumbnailDataUrl = "";
      try {
        thumbnailDataUrl = await generatePdfThumbnail(selectedFile);
      } catch (thumbErr) {
        console.warn("Thumbnail generation skipped:", thumbErr);
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

      // 4. Prepare Public Document Record with NO undefined values (fixes issue 1)
      const newDocId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const hasPassword = Boolean(passwordInput.trim());

      const publicDocRecord: any = {
        id: newDocId,
        fileId: docFileId,
        title: titleInput.trim(),
        originalFilename: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        pageCount: Math.max(1, detectedPages),
        uploaderUid: user?.uid || "anonymous",
        uploaderName,
        uploaderPhotoURL: uploaderPhoto || "",
        thumbnailUrl: thumbnailDataUrl || "",
        hasPassword,
        printCount: 0,
        createdAt: Date.now(),
      };

      // Only attach password key if user specified one (avoids Firebase "value argument contains undefined" error)
      if (hasPassword && passwordInput.trim()) {
        publicDocRecord.password = passwordInput.trim();
      }

      // 5. Save to Firebase Realtime Database
      await set(ref(database, `publicDocuments/${newDocId}`), publicDocRecord);

      // Clean up & Close Modal
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setTitleInput("");
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

    const printUrl = `/user/print?docId=${encodeURIComponent(doc.fileId)}&title=${encodeURIComponent(
      doc.title
    )}&pages=${doc.pageCount}`;
    router.push(printUrl);
  };

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

            {/* Action Buttons: My Uploads & Upload File */}
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <button
                  type="button"
                  onClick={() => setShowMyUploadsOnly((prev) => !prev)}
                  className={`h-11 px-3.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                    showMyUploadsOnly
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-800 border border-neutral-200/90 hover:bg-neutral-50"
                  }`}
                  title="View your uploaded documents"
                >
                  <FolderUser className="w-4 h-4" />
                  <span>My Uploads {myUploadsCount > 0 ? `(${myUploadsCount})` : ""}</span>
                </button>
              )}

              {/* Upload File Button with Reduced Corner Radius */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setTitleInput("");
                  setPasswordInput("");
                  setUploadError(null);
                  setIsUploadModalOpen(true);
                }}
                className="h-11 px-4.5 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
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
                else setIsUploadModalOpen(true);
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
              <span>Updated in real time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-neutral-100 flex flex-col justify-between group"
                  >
                    {/* Top Content: Thumbnail on Left, Metadata on Right */}
                    <div className="flex gap-3.5 items-start">
                      {/* Left: Document Thumbnail Preview Box */}
                      <div className="w-18 h-24 sm:w-20 sm:h-26 bg-neutral-100 rounded-lg overflow-hidden shrink-0 border border-neutral-200/70 flex items-center justify-center relative shadow-2xs">
                        {doc.thumbnailUrl ? (
                          <img
                            src={doc.thumbnailUrl}
                            alt={doc.title}
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
                      </div>

                      {/* Right: Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-medium text-neutral-400">
                            {formatDate(doc.createdAt)}
                          </span>

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

                        {/* File Title */}
                        <h3
                          title={doc.title}
                          className="text-sm font-bold text-neutral-900 group-hover:text-[#0c831f] transition-colors line-clamp-2 leading-snug"
                        >
                          {doc.title}
                        </h3>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-2 font-medium">
                          <span>{doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}</span>
                          <span>•</span>
                          <span>{formatBytes(doc.fileSizeBytes)}</span>
                        </div>

                        {/* Prints Count */}
                        <div className="inline-flex items-center gap-1 text-neutral-600 text-[11px] font-medium mt-1">
                          <Download className="w-3 h-3 text-neutral-400" />
                          <span className="font-bold text-neutral-800">{doc.printCount || 0}</span>
                          <span>prints</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Uploader Account & Print Button */}
                    <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                      {/* Uploader Account Info */}
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
                          <p className="text-xs font-semibold text-neutral-800 truncate leading-tight">
                            {liveName}
                          </p>
                          <p className="text-[10px] text-neutral-400 leading-none">Shared PDF</p>
                        </div>
                      </div>

                      {/* Print Button (Corner Radius Reduced to rounded-lg) */}
                      <button
                        type="button"
                        onClick={() => handlePrintClick(doc)}
                        className="h-8 px-3.5 bg-[#0c831f] hover:bg-[#0a701a] active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                      >
                        {doc.hasPassword ? (
                          <Lock className="w-3 h-3 text-white" />
                        ) : (
                          <Printer className="w-3 h-3 text-white" />
                        )}
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

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
                      <p className="text-[10px] text-neutral-400">PDF up to 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rename File Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Rename This File (Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Physics Unit 3 Notes, Maths PYQ 2024"
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
