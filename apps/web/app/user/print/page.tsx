"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  RadioGroup,
  Radio,
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

const SAMPLE_DOC: UploadedDocumentRecord = {
  fileId: "doc_demo_preview",
  originalFilename: "PrintMart_Project_Documentation.pdf",
  fileSizeBytes: 2451000,
  mimeType: "application/pdf",
  pageCount: 5,
  isColorDocument: false,
  telegramFileId: "tg_mock_vault_file",
};

function UserPrintContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const machineParam = searchParams.get("machine");

  // State: Document & Upload
  const [activeDoc, setActiveDoc] = useState<UploadedDocumentRecord | null>(SAMPLE_DOC);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // File Upload Handler with real XHR Progress
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
                setActiveDoc(data.document);
                setUploading(false);
                setUploadProgress(0);
                setUploadStatusText("");
              }, 400);
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
    <div className="min-h-screen flex flex-col bg-slate-50/60 pb-32 lg:pb-12">
      <AppNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Global Error Alert */}
        {errorMessage && (
          <Alert color="danger" className="mb-4">
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
          <div className="max-w-2xl mx-auto space-y-6 pt-2 sm:pt-4">
            <div className="text-center space-y-1.5 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Upload Your Document
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                Select your document to configure print preferences and release your prints instantly at any campus kiosk.
              </p>
            </div>

            <Card>
              <CardBody className="py-8 px-5 sm:px-10 text-center">
                {uploading ? (
                  <div className="border-2 border-dashed border-primary/40 rounded-2xl p-8 flex flex-col items-center justify-center bg-primary/5 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                      <UploadCloud className="w-7 h-7 animate-bounce" />
                    </div>
                    <div className="space-y-1 w-full max-w-md">
                      <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                        {uploadStatusText || "Uploading document..."}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Transferring to private cloud vault & analyzing print specifications
                      </p>
                    </div>
                    <div className="w-full max-w-md pt-2 space-y-1.5">
                      <Progress
                        value={uploadProgress}
                        color="primary"
                        className="w-full"
                      />
                      <span className="text-xs font-semibold text-primary block text-right">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 hover:border-primary rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white hover:bg-primary/5"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1">
                      Tap to upload or drag & drop
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-xs sm:max-w-sm mb-5">
                      Supports PDF, Word (.docx), PowerPoint (.pptx), and Images up to 25 MB
                    </p>
                    <Button
                      color="primary"
                      size="md"
                      startContent={<UploadCloud className="w-4 h-4" />}
                      className="font-semibold shadow-sm pointer-events-none"
                    >
                      Select File from Device
                    </Button>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-100/70 border border-neutral-200/60">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs text-primary shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">Want to test without a file?</p>
                      <p className="text-[11px] text-neutral-500">Quickly load our 5-page sample document</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="font-medium shrink-0 w-full sm:w-auto text-xs"
                    onPress={() => setActiveDoc(SAMPLE_DOC)}
                  >
                    Use Sample Doc
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          /* STEP 2: Modern Print Studio */
          <div>
            <div className="mb-5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                Print Studio
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                Configure print settings, pick your kiosk, and release your document instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Left 2 Columns: Settings & Fleet */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* 1. Document to Print */}
                <Card>
                  <CardHeader className="pb-3 border-b border-neutral-100">
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm text-neutral-900">Document to Print</span>
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        startContent={<RotateCw className="w-3.5 h-3.5" />}
                        onPress={() => setActiveDoc(null)}
                        className="text-xs font-semibold h-8"
                      >
                        Change File
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody className="py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-neutral-900 truncate">
                            {activeDoc.originalFilename}
                          </h3>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {activeDoc.pageCount} Pages • {(activeDoc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • Cloud Vault
                          </p>
                        </div>
                      </div>
                      <Chip color="primary" variant="flat" size="sm" className="font-semibold shrink-0">
                        {activeDoc.pageCount} {activeDoc.pageCount === 1 ? "Page" : "Pages"}
                      </Chip>
                    </div>
                  </CardBody>
                </Card>

                {/* 2. Select Vending Machine */}
                <Card>
                  <CardHeader className="pb-3 border-b border-neutral-100">
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm text-neutral-900">Select Vending Machine</span>
                      </div>
                      <Chip size="sm" variant="flat" color="success" className="text-xs">
                        {machines.filter((m) => m.status === "ONLINE").length} Online
                      </Chip>
                    </div>
                  </CardHeader>
                  <CardBody className="py-3.5 space-y-2.5">
                    <RadioGroup
                      value={selectedMachineId}
                      onValueChange={setSelectedMachineId}
                      className="space-y-2.5"
                    >
                      {machines.map((m) => {
                        const isSelected = selectedMachineId === m.machineId;
                        return (
                          <div
                            key={m.machineId}
                            onClick={() => setSelectedMachineId(m.machineId)}
                            className={`option-card-radio ${isSelected ? "selected" : ""}`}
                          >
                            <Radio value={m.machineId} />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm text-neutral-900 block leading-tight">
                                {m.name}
                              </span>
                              <span className="text-xs text-neutral-500 block mt-0.5">
                                {m.location}
                              </span>
                            </div>
                            <Chip
                              size="sm"
                              color={m.status === "ONLINE" ? "success" : "danger"}
                              variant="flat"
                              className="text-[11px] font-semibold shrink-0"
                            >
                              {m.status}
                            </Chip>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </CardBody>
                </Card>

                {/* 3. Print Settings */}
                <Card>
                  <CardHeader className="pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-neutral-900">Print Settings</span>
                    </div>
                  </CardHeader>
                  <CardBody className="py-4 space-y-5">
                    
                    {/* Color Mode */}
                    <div>
                      <span className="text-xs font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                        Color Mode
                      </span>
                      <RadioGroup
                        orientation="horizontal"
                        value={colorMode}
                        onValueChange={(val) => setColorMode(val as ColorMode)}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        <div
                          onClick={() => setColorMode("bw")}
                          className={`option-card-radio ${colorMode === "bw" ? "selected" : ""}`}
                        >
                          <Radio value="bw" />
                          <div className="flex-1">
                            <span className="font-semibold text-sm text-neutral-900 block">Black & White</span>
                            <span className="text-xs text-neutral-500 block">₹1.50 per page</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setColorMode("color")}
                          className={`option-card-radio ${colorMode === "color" ? "selected" : ""}`}
                        >
                          <Radio value="color" />
                          <div className="flex-1">
                            <span className="font-semibold text-sm text-neutral-900 block">Full Color</span>
                            <span className="text-xs text-neutral-500 block">₹5.00 per page</span>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <Divider />

                    {/* Sides & Paper Size */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sides */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                          Print Sides
                        </span>
                        <RadioGroup
                          value={simplexDuplex}
                          onValueChange={(val) => setSimplexDuplex(val as SimplexDuplex)}
                          className="space-y-2"
                        >
                          <div
                            onClick={() => setSimplexDuplex("simplex")}
                            className={`option-card-radio ${simplexDuplex === "simplex" ? "selected" : ""}`}
                          >
                            <Radio value="simplex" />
                            <span className="font-semibold text-sm text-neutral-900">Single-Sided</span>
                          </div>
                          <div
                            onClick={() => setSimplexDuplex("duplex")}
                            className={`option-card-radio ${simplexDuplex === "duplex" ? "selected" : ""}`}
                          >
                            <Radio value="duplex" />
                            <span className="font-semibold text-sm text-neutral-900">Double-Sided (Duplex)</span>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Paper Size */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                          Paper Size
                        </span>
                        <RadioGroup
                          value={paperSize}
                          onValueChange={setPaperSize}
                          className="space-y-2"
                        >
                          <div
                            onClick={() => setPaperSize("A4")}
                            className={`option-card-radio ${paperSize === "A4" ? "selected" : ""}`}
                          >
                            <Radio value="A4" />
                            <span className="font-semibold text-sm text-neutral-900">Standard A4 Sheet</span>
                          </div>
                          <div
                            onClick={() => setPaperSize("A3")}
                            className={`option-card-radio ${paperSize === "A3" ? "selected" : ""}`}
                          >
                            <Radio value="A3" />
                            <span className="font-semibold text-sm text-neutral-900">A3 Sheet</span>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <Divider />

                    {/* Copies & Pages */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Copies with tap buttons */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                          Number of Copies
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={() => setCopies((c) => Math.max(1, c - 1))}
                            className="h-10 w-10 shrink-0 font-bold"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={copies.toString()}
                            onChange={(e: any) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="text-center font-bold"
                          />
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={() => setCopies((c) => Math.min(50, c + 1))}
                            className="h-10 w-10 shrink-0 font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Pages to Print */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-2 uppercase tracking-wide">
                          Pages to Print
                        </span>
                        <RadioGroup
                          orientation="horizontal"
                          value={pageRangeType}
                          onValueChange={(val) => setPageRangeType(val as "all" | "custom")}
                          className="flex gap-2"
                        >
                          <div
                            onClick={() => setPageRangeType("all")}
                            className={`option-card-radio flex-1 ${pageRangeType === "all" ? "selected" : ""}`}
                          >
                            <Radio value="all" />
                            <span className="font-semibold text-xs text-neutral-900">All ({activeDoc.pageCount || 1})</span>
                          </div>
                          <div
                            onClick={() => setPageRangeType("custom")}
                            className={`option-card-radio flex-1 ${pageRangeType === "custom" ? "selected" : ""}`}
                          >
                            <Radio value="custom" />
                            <span className="font-semibold text-xs text-neutral-900">Custom</span>
                          </div>
                        </RadioGroup>

                        {pageRangeType === "custom" && (
                          <Input
                            className="mt-2"
                            placeholder="e.g. 1-3, 5"
                            value={customRange}
                            onChange={(e: any) => setCustomRange(e.target.value)}
                          />
                        )}
                      </div>
                    </div>

                  </CardBody>
                </Card>
              </div>

              {/* Right Column: Payment & Breakdown (Desktop) */}
              <div className="space-y-5">
                <Card>
                  <CardHeader className="pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-neutral-900">Payment Summary</span>
                    </div>
                  </CardHeader>
                  <CardBody className="py-4 space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-500">Total Pages:</span>
                      <span className="font-semibold text-neutral-900">
                        {(pageRangeType === "all" ? activeDoc.pageCount || 1 : 1) * Math.max(1, copies)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-500">Color Mode:</span>
                      <span className="font-semibold text-neutral-900">
                        {colorMode === "bw" ? "Black & White" : "Full Color"}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-500">Base Rate:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.baseRatePaise)} / side
                      </span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-500">Subtotal:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.subtotalPaise)}
                      </span>
                    </div>

                    {pricing.discountPaise > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-emerald-600 font-semibold">
                        <span>Discount:</span>
                        <span>-{formatRupees(pricing.discountPaise)}</span>
                      </div>
                    )}

                    {/* Promo Code Input */}
                    <div className="pt-2">
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Coupon / Offer Code</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={offerCode}
                          onChange={(e: any) => setOfferCode(e.target.value)}
                        />
                        <Button
                          size="md"
                          color="primary"
                          variant="flat"
                          className="shrink-0 font-semibold text-xs"
                          onPress={() => setAppliedOffer(offerCode.trim())}
                        >
                          Apply
                        </Button>
                      </div>
                      {appliedOffer && (
                        <Chip size="sm" color="success" variant="flat" className="mt-1.5 text-xs">
                          Applied: {appliedOffer}
                        </Chip>
                      )}
                    </div>

                    <Divider className="my-1.5" />

                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-sm font-bold text-neutral-900">Payable Amount:</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-primary">
                        {formatRupees(pricing.finalPayablePaise)}
                      </span>
                    </div>
                  </CardBody>
                  <CardFooter className="pt-0 pb-4">
                    <Button
                      color="primary"
                      size="lg"
                      className="w-full text-base font-bold shadow-md"
                      isLoading={paying || calculatingPrice}
                      onPress={handleProceedToPayment}
                    >
                      Pay {formatRupees(pricing.finalPayablePaise)} & Get OTP
                    </Button>
                  </CardFooter>
                </Card>

                {/* How it works */}
                <Card>
                  <CardBody className="py-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span>How it works</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      1. Complete checkout to generate a secure 6-digit OTP.<br />
                      2. Your document preloads instantly into the kiosk cache.<br />
                      3. Approach the kiosk, tap your OTP, and collect your prints.
                    </p>
                  </CardBody>
                </Card>
              </div>
            </div>

            {/* Mobile Bottom Floating Checkout Bar (Fixed above bottom navbar) */}
            <div className="fixed bottom-12 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 px-4 py-2.5 flex items-center justify-between z-40 sm:hidden shadow-lg">
              <div>
                <span className="text-[11px] text-neutral-500 block leading-tight">Total Payable</span>
                <span className="text-lg font-extrabold text-primary">
                  {formatRupees(pricing.finalPayablePaise)}
                </span>
              </div>
              <Button
                color="primary"
                size="sm"
                className="font-bold px-5 h-9 shadow-md text-xs"
                isLoading={paying || calculatingPrice}
                onPress={handleProceedToPayment}
              >
                Pay & Get OTP
              </Button>
            </div>
          </div>
        )}

        {/* Modal: OTP Release Dialog */}
        <Modal isOpen={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
          <ModalContent>
            <ModalHeader className="text-center items-center">
              <CheckCircle2 className="w-10 h-10 text-success mb-2" />
              <h2 className="text-xl font-bold">Print Order Authorized!</h2>
              <p className="text-xs text-muted">
                Document is preloaded and ready at {selectedMachine?.name}
              </p>
            </ModalHeader>
            <ModalBody className="text-center py-6">
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                Your 6-Digit Kiosk OTP
              </span>
              <div className="my-4 py-4 px-6 bg-primary/10 rounded-2xl flex items-center justify-center gap-3 border border-primary/20">
                <span className="text-4xl font-black tracking-widest text-primary font-mono">
                  {generatedOtp}
                </span>
              </div>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Walk up to the kiosk screen, tap <span className="font-semibold text-foreground">"Enter OTP"</span>, and your print job will release immediately.
              </p>
            </ModalBody>
            <ModalFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="flat"
                color="primary"
                className="w-full font-semibold"
                startContent={copiedOtp ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                onPress={copyOtpToClipboard}
              >
                {copiedOtp ? "Copied OTP!" : "Copy OTP"}
              </Button>
              <Button
                as={Link}
                href="/user/history"
                color="primary"
                className="w-full font-semibold"
                onPress={() => setIsOtpModalOpen(false)}
              >
                View in My Print Jobs
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}

export default function UserPrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-8 text-sm text-neutral-500">Loading Print Studio...</div>}>
      <UserPrintContent />
    </Suspense>
  );
}
