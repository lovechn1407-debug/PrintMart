"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Input,
  Chip,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
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
  ShieldCheck,
} from "lucide-react";
import { database, ref, onValue } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { AppNavbar } from "@/components/AppNavbar";

// Types
type ColorMode = "bw" | "color";
type SimplexDuplex = "simplex" | "duplex";

interface UploadedDocumentRecord {
  fileId: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  pageCount: number;
  isColorDocument: boolean;
  telegramFileId: string;
  telegramMessageId?: number;
}

interface MachineRecord {
  machineId: string;
  name: string;
  location: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
  pricingPerBwPagePaise?: number;
  pricingPerColorPagePaise?: number;
}

interface PrintJobConfiguration {
  colorMode: ColorMode;
  simplexDuplex: SimplexDuplex;
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

const DEFAULT_MACHINES: MachineRecord[] = [
  {
    machineId: "kiosk_lib_01",
    name: "Central Library Kiosk A",
    location: "Academic Block - Floor 1",
    status: "ONLINE",
  },
  {
    machineId: "kiosk_sc_02",
    name: "Student Center Kiosk B",
    location: "Student Union Hall - Ground Floor",
    status: "ONLINE",
  },
  {
    machineId: "kiosk_eng_03",
    name: "Engineering Block Kiosk C",
    location: "Tech Annex - Room 104",
    status: "ONLINE",
  },
];

function UserPrintContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const machineParam = searchParams.get("machine");

  // State: Document & Upload
  const [activeDoc, setActiveDoc] = useState<UploadedDocumentRecord | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("printmart_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.fileId || parsed.originalFilename)) {
          setActiveDoc(parsed);
        }
      }
    } catch {}
  }, []);

  const updateActiveDoc = (doc: UploadedDocumentRecord | null) => {
    setActiveDoc(doc);
    try {
      if (doc) {
        localStorage.setItem(
          "printmart_draft",
          JSON.stringify({
            ...doc,
            filename: doc.originalFilename,
            timestamp: Date.now(),
          })
        );
      } else {
        localStorage.removeItem("printmart_draft");
      }
    } catch {}
  };

  // State: Kiosks
  const [machines, setMachines] = useState<MachineRecord[]>(DEFAULT_MACHINES);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    machineParam || DEFAULT_MACHINES[0].machineId
  );

  // State: Settings
  const [colorMode, setColorMode] = useState<ColorMode>("bw");
  const [simplexDuplex, setSimplexDuplex] = useState<SimplexDuplex>("simplex");
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeType, setPageRangeType] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [offerCode, setOfferCode] = useState<string>("");
  const [appliedOffer, setAppliedOffer] = useState<string>("");

  // Live Pricing Breakdown
  const [pricing, setPricing] = useState<PricingBreakdown>({
    baseRatePaise: 150,
    subtotalPaise: 750,
    discountPaise: 0,
    taxPaise: 0,
    finalPayablePaise: 750,
    offerCode: null,
  });
  const [calculatingPrice, setCalculatingPrice] = useState<boolean>(false);

  // Payment & OTP
  const [paying, setPaying] = useState<boolean>(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync Machines from RTDB
  useEffect(() => {
    try {
      const machinesRef = ref(database, "machines");
      const unsub = onValue(machinesRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: MachineRecord[] = Object.values(data);
          if (list.length > 0) {
            setMachines(list);
            if (!machineParam && !selectedMachineId) {
              const firstOnline = list.find((m) => m.status === "ONLINE");
              setSelectedMachineId(firstOnline?.machineId || list[0].machineId);
            }
          }
        }
      });
      return () => unsub();
    } catch {}
  }, [machineParam, selectedMachineId]);

  // Recalculate Dynamic Price
  useEffect(() => {
    if (!activeDoc) return;

    const totalPagesInDoc = activeDoc.pageCount || 1;
    let selectedPages: number[] = [];

    if (pageRangeType === "all") {
      selectedPages = Array.from({ length: totalPagesInDoc }, (_, i) => i + 1);
    } else {
      try {
        const parts = customRange.split(",");
        const set = new Set<number>();
        for (const p of parts) {
          const trimmed = p.trim();
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
        selectedPages = Array.from(set).sort((a, b) => a - b);
        if (selectedPages.length === 0) selectedPages = [1];
      } catch {
        selectedPages = [1];
      }
    }

    const config: PrintJobConfiguration = {
      colorMode,
      simplexDuplex,
      paperSize,
      copies: Math.max(1, copies),
      pageRange: pageRangeType === "all" ? `1-${totalPagesInDoc}` : customRange || "1",
      selectedPages,
      totalPagesToPrint: selectedPages.length,
    };

    const fetchPrice = async () => {
      try {
        setCalculatingPrice(true);
        const res = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            machineId: selectedMachineId,
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
  }, [activeDoc, selectedMachineId, colorMode, simplexDuplex, paperSize, copies, pageRangeType, customRange, appliedOffer]);

  // File Upload Handler with XHR Progress
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selected = e.target.files[0];

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadStatusText(`Preparing ${selected.name}...`);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", selected);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 75);
          setUploadProgress(Math.max(15, percent));
          setUploadStatusText(`Uploading ${percent}%...`);
        }
      };

      xhr.onload = () => {
        setUploadProgress(90);
        setUploadStatusText("Analyzing document specs & pages...");

        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.document) {
              setUploadProgress(100);
              setUploadStatusText("Upload complete!");
              setTimeout(() => {
                updateActiveDoc(data.document);
                setUploading(false);
                setUploadProgress(0);
                setUploadStatusText("");
              }, 300);
              return;
            } else {
              throw new Error(data.error || "Upload failed");
            }
          } else {
            throw new Error(`Upload server responded with status ${xhr.status}`);
          }
        } catch (err: any) {
          console.error("Upload error:", err);
          setErrorMessage(err.message || "Failed to process document");
          setUploading(false);
          setUploadProgress(0);
          setUploadStatusText("");
        }
      };

      xhr.onerror = () => {
        setErrorMessage("Network error during file upload");
        setUploading(false);
        setUploadProgress(0);
        setUploadStatusText("");
      };

      xhr.send(formData);
    } catch (err: any) {
      console.error("Upload preparation error:", err);
      setErrorMessage(err.message || "Failed to process document");
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const formatRupees = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const handleProceedToPayment = async () => {
    if (!activeDoc) {
      setErrorMessage("Please upload a document before proceeding.");
      return;
    }

    try {
      setPaying(true);
      setErrorMessage(null);

      const totalPagesInDoc = activeDoc.pageCount || 1;
      let selectedPages: number[] = [];
      if (pageRangeType === "all") {
        selectedPages = Array.from({ length: totalPagesInDoc }, (_, i) => i + 1);
      } else {
        selectedPages = [1];
      }

      const config: PrintJobConfiguration = {
        colorMode,
        simplexDuplex,
        paperSize,
        copies: Math.max(1, copies),
        pageRange: pageRangeType === "all" ? `1-${totalPagesInDoc}` : customRange || "1",
        selectedPages,
        totalPagesToPrint: selectedPages.length,
      };

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest_user",
          machineId: selectedMachineId,
          documentId: activeDoc.fileId,
          documentTitle: activeDoc.originalFilename,
          config,
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
        try {
          localStorage.removeItem("printmart_draft");
        } catch {}
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

  const selectedMachine = machines.find((m) => m.machineId === selectedMachineId);

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
        {/* Global Error Alert */}
        {errorMessage && (
          <Alert color="danger" className="mb-4 rounded-xl">
            {errorMessage}
          </Alert>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />

        {/* STEP 1: Upload Screen */}
        {!activeDoc ? (
          <div className="max-w-xl mx-auto space-y-5 pt-4">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Upload Document
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto">
                Configure settings and release your prints instantly at any campus kiosk.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
              {uploading ? (
                <div className="border border-dashed border-emerald-400 rounded-2xl p-8 flex flex-col items-center justify-center bg-emerald-50/30 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center animate-pulse">
                    <UploadCloud className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1 text-center w-full max-w-sm">
                    <h3 className="font-bold text-sm text-neutral-900">
                      {uploadStatusText || "Uploading document..."}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Encrypting into cloud vault & calculating page specifications
                    </p>
                  </div>
                  <div className="w-full max-w-sm pt-1 space-y-1.5">
                    <Progress
                      value={uploadProgress}
                      color="success"
                      className="w-full"
                    />
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
                    <span>Select File from Device</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: Sleek Modern Print Studio */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  Print Studio
                </h1>
                <p className="text-xs text-neutral-500">
                  Select kiosk, configure print settings, and release instantly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Columns: Single-Surface Sections */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* 1. Document Strip */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-neutral-900 truncate">
                        {activeDoc.originalFilename}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {activeDoc.pageCount} Pages • {(activeDoc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • Cloud Vault
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateActiveDoc(null)}
                    className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Change</span>
                  </button>
                </div>

                {/* 2. Select Vending Machine */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-[#0c831f]" />
                      <span className="font-bold text-sm text-neutral-900">Select Kiosk</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {machines.filter((m) => m.status === "ONLINE").length} Stations Online
                    </span>
                  </div>

                  <div className="space-y-1">
                    {machines.map((m) => {
                      const isSelected = selectedMachineId === m.machineId;
                      return (
                        <div
                          key={m.machineId}
                          onClick={() => setSelectedMachineId(m.machineId)}
                          data-selected={isSelected}
                          className="clean-select-item"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Crisp native circular radio indicator */}
                            <div className="radio__control">
                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0c831f]" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm text-neutral-900 block truncate">
                                {m.name}
                              </span>
                              <span className="text-xs text-neutral-500 block truncate">
                                {m.location}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                              m.status === "ONLINE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Print Settings */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Sparkles className="w-4 h-4 text-[#0c831f]" />
                    <span className="font-bold text-sm text-neutral-900">Print Configuration</span>
                  </div>

                  {/* Color Mode Segmented Bar */}
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

                  {/* Sides & Paper Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                        Sides
                      </label>
                      <div className="segmented-track">
                        <button
                          type="button"
                          data-active={simplexDuplex === "simplex"}
                          onClick={() => setSimplexDuplex("simplex")}
                          className="segmented-btn"
                        >
                          Single-Sided
                        </button>
                        <button
                          type="button"
                          data-active={simplexDuplex === "duplex"}
                          onClick={() => setSimplexDuplex("duplex")}
                          className="segmented-btn"
                        >
                          Duplex (2-Sided)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                        Paper Size
                      </label>
                      <div className="segmented-track">
                        <button
                          type="button"
                          data-active={paperSize === "A4"}
                          onClick={() => setPaperSize("A4")}
                          className="segmented-btn"
                        >
                          Standard A4
                        </button>
                        <button
                          type="button"
                          data-active={paperSize === "A3"}
                          onClick={() => setPaperSize("A3")}
                          className="segmented-btn"
                        >
                          A3 Sheet
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Copies & Pages to Print */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Number of Copies */}
                    <div>
                      <label className="text-xs font-semibold text-neutral-600 block mb-1.5 uppercase tracking-wider">
                        Number of Copies
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCopies((c) => Math.max(1, c - 1))}
                          className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors font-bold text-sm shrink-0"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 text-center font-bold text-base text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg py-1.5">
                          {copies}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCopies((c) => Math.min(50, c + 1))}
                          className="w-9 h-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors font-bold text-sm shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Pages to Print */}
                    <div>
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
                          All ({activeDoc.pageCount || 1})
                        </button>
                        <button
                          type="button"
                          data-active={pageRangeType === "custom"}
                          onClick={() => setPageRangeType("custom")}
                          className="segmented-btn"
                        >
                          Custom
                        </button>
                      </div>
                      {pageRangeType === "custom" && (
                        <input
                          type="text"
                          placeholder="e.g. 1-3, 5"
                          value={customRange}
                          onChange={(e) => setCustomRange(e.target.value)}
                          className="mt-2 w-full text-xs px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0c831f] bg-white"
                        />
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Receipt Summary */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-3">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                    <CreditCard className="w-4 h-4 text-[#0c831f]" />
                    <span className="font-bold text-sm text-neutral-900">Payment Summary</span>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-neutral-500">
                      <span>Total Pages:</span>
                      <span className="font-semibold text-neutral-900">
                        {(pageRangeType === "all" ? activeDoc.pageCount || 1 : 1) * Math.max(1, copies)}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Color Mode:</span>
                      <span className="font-semibold text-neutral-900">
                        {colorMode === "bw" ? "Black & White" : "Full Color"}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-500">
                      <span>Base Rate:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.baseRatePaise)} / side
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
                        className="flex-1 text-xs px-3 py-1.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#0c831f] bg-neutral-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setAppliedOffer(offerCode.trim())}
                        className="px-3.5 py-1.5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
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

                  <button
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

                {/* Clean How it works footer note */}
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/60 p-4 space-y-1.5 text-xs text-neutral-700 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <Lock className="w-3.5 h-3.5 text-[#0c831f]" />
                    <span>How it works</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600">
                    1. Instant payment via Cashfree Sandbox.<br />
                    2. Document preloads into selected kiosk memory.<br />
                    3. Walk up to kiosk, enter 6-digit OTP, print immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Bottom Floating Checkout Bar */}
            <div className="fixed bottom-16 inset-x-4 max-w-sm mx-auto bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between z-40 sm:hidden shadow-xl">
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
                {paying ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>Pay & Get OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal: OTP Release Dialog */}
        <Modal isOpen={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
          <ModalContent>
            <ModalHeader className="text-center items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
              <h2 className="text-lg font-bold text-slate-900">Print Order Authorized!</h2>
              <p className="text-xs text-slate-500">
                Document is preloaded and ready at {selectedMachine?.name}
              </p>
            </ModalHeader>
            <ModalBody className="text-center py-5">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Your 6-Digit Kiosk OTP
              </span>
              <div className="my-3 py-3 px-6 bg-emerald-50 rounded-xl flex items-center justify-center gap-3 border border-emerald-200">
                <span className="text-3xl font-extrabold tracking-widest text-[#0c831f] font-mono">
                  {generatedOtp}
                </span>
              </div>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Walk up to the kiosk screen, tap <span className="font-semibold text-neutral-800">"Enter OTP"</span>, and your print job will release immediately.
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-8 text-xs text-slate-400">Loading Print Studio...</div>}>
      <UserPrintContent />
    </Suspense>
  );
}
