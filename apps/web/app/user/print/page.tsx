"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  RadioGroup,
  Radio,
  Chip,
  Divider,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Alert,
} from "@heroui/react";
import {
  UploadCloud,
  FileText,
  Printer,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Lock,
  Copy,
  Check,
  RotateCw,
  ArrowLeft,
  Minus,
  Plus,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { ref, onValue, database } from "@/lib/firebase";
import {
  ColorMode,
  DocumentMetadata,
  formatRupees,
  MachineRecord,
  PricingBreakdown,
  PrintJobConfiguration,
  SimplexDuplex,
} from "@printmart/shared";

const DEFAULT_MACHINES: MachineRecord[] = [
  {
    machineId: "MCH-CAMPUS-01",
    name: "Central Library Kiosk A",
    location: "Academic Block - Floor 1",
    status: "ONLINE",
    pairedAt: Date.now(),
    pairingStatus: "paired",
    lastHeartbeat: Date.now(),
    agentVersion: "1.0.0",
  },
  {
    machineId: "MCH-CAMPUS-02",
    name: "Student Center Kiosk B",
    location: "Student Union Hall - Ground Floor",
    status: "ONLINE",
    pairedAt: Date.now(),
    pairingStatus: "paired",
    lastHeartbeat: Date.now(),
    agentVersion: "1.0.0",
  },
  {
    machineId: "MCH-CAMPUS-03",
    name: "Engineering Block Kiosk C",
    location: "Tech Annex - Room 104",
    status: "ONLINE",
    pairedAt: Date.now(),
    pairingStatus: "paired",
    lastHeartbeat: Date.now(),
    agentVersion: "1.0.0",
  },
];

const SAMPLE_DOC: DocumentMetadata = {
  documentId: "DOC_SAMPLE_001",
  ownerUid: "demo_user",
  originalFilename: "PrintMart_Project_Documentation.pdf",
  telegramFileId: "TELEGRAM_MOCK_FILE_ID",
  telegramMessageId: 101,
  fileSizeBytes: 2450000,
  sha256: "MOCK_SHA256_HASH",
  mimeType: "application/pdf",
  pageCount: 5,
  retentionExpiresAt: Date.now() + 86400000,
  createdAt: Date.now(),
};

function UserPrintContent() {
  const { user, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const machineParam = searchParams.get("machineId") || "";

  // Document State - Starts null so user is prompted to upload or test
  const [activeDoc, setActiveDoc] = useState<DocumentMetadata | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Machine Selection
  const [machines, setMachines] = useState<MachineRecord[]>(DEFAULT_MACHINES);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machineParam || "MCH-CAMPUS-01");

  // Print Configuration State
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
      formData.append("ownerUid", user?.uid || "guest");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 75);
          setUploadProgress(Math.max(15, percentComplete));
          setUploadStatusText(`Uploading to vault (${Math.max(15, percentComplete)}%)...`);
        }
      };

      xhr.onload = () => {
        setUploadProgress(95);
        setUploadStatusText("Finalizing document encryption & pages...");
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            setUploadProgress(100);
            setUploadStatusText("Done!");
            setTimeout(() => {
              setActiveDoc(data.document);
              setUploading(false);
            }, 300);
          } else {
            throw new Error(data.error || `Upload failed with status ${xhr.status}`);
          }
        } catch (parseErr: any) {
          setErrorMessage(parseErr.message || "Failed to process upload response");
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setErrorMessage("Network error during document upload");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "Failed to upload file");
      setUploading(false);
    } finally {
      // Clear file input so selecting the same file again triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Payment Checkout
  const handleProceedToPayment = async () => {
    if (!activeDoc) {
      setErrorMessage("Please upload or select a document first");
      return;
    }

    if (!user) {
      await signInWithGoogle();
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

      const configuration: PrintJobConfiguration = {
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
          userId: user.uid,
          documentId: activeDoc.documentId,
          machineId: selectedMachineId,
          configuration,
          offerCode: appliedOffer || undefined,
          customerName: user.displayName || "Customer",
          customerEmail: user.email || "user@printmart.com",
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
    <div className="min-h-screen flex flex-col bg-background pb-28 lg:pb-12">
      <AppNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            as={Link}
            href="/"
            variant="light"
            size="sm"
            startContent={<ArrowLeft className="w-4 h-4" />}
            className="text-neutral-600 hover:text-neutral-900 font-medium"
          >
            Back to Home
          </Button>

          <div className="flex items-center gap-2">
            <Chip size="sm" color="primary" variant="flat">
              Paise-Precision
            </Chip>
            <Chip size="sm" color="success" variant="flat">
              Preload Engine
            </Chip>
          </div>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <Alert color="danger" className="mb-6">
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

        {/* STEP 1: If No Document Uploaded Yet -> Show Upload Screen */}
        {!activeDoc ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Upload Your Document
              </h1>
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                Select your document to configure print preferences, view live pricing, and print instantly at any campus kiosk.
              </p>
            </div>

            <Card>
              <CardBody className="py-10 px-6 sm:px-10 text-center">
                {uploading ? (
                  <div className="border-2 border-dashed border-primary/40 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center bg-primary/5 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                      <UploadCloud className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="space-y-1 w-full max-w-md">
                      <h3 className="font-bold text-base sm:text-lg text-neutral-900">
                        {uploadStatusText || "Uploading document..."}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Transferring to private cloud vault & analyzing print specifications
                      </p>
                    </div>
                    <div className="w-full max-w-md pt-2 space-y-2">
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
                    className="border-2 border-dashed border-neutral-300 hover:border-primary rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-primary/5"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1">
                      Tap to upload or drag & drop
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-xs sm:max-w-sm mb-6">
                      Supports PDF, Word (.docx), PowerPoint (.pptx), and Images up to 25 MB
                    </p>
                    <Button
                      color="primary"
                      size="md"
                      startContent={<UploadCloud className="w-4 h-4" />}
                      className="font-semibold shadow-md pointer-events-none"
                    >
                      Select File from Device
                    </Button>
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-neutral-100/70 border border-neutral-200/60">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-xs text-primary shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">Want to test without a file?</p>
                      <p className="text-xs text-neutral-500">Quickly load our 5-page sample project documentation</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    className="font-medium shrink-0 w-full sm:w-auto"
                    onPress={() => setActiveDoc(SAMPLE_DOC)}
                  >
                    Use Sample Document
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-100 shadow-xs">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-neutral-900">Encrypted Cloud Vault</span>
                  <span className="text-[11px] text-neutral-500">Stored privately in Telegram</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-100 shadow-xs">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-neutral-900">Preload Engine</span>
                  <span className="text-[11px] text-neutral-500">Ready before you reach kiosk</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-100 shadow-xs">
                <CreditCard className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-neutral-900">Paise Precision</span>
                  <span className="text-[11px] text-neutral-500">From ₹1.50 per page</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: Document Config & Checkout Screen */
          <div>
            {/* Title & Document Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Print Studio</h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                  Configure print settings, pick your kiosk, and release your document instantly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Left 2 Columns: Settings & Fleet */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Document to Print */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-base text-neutral-900">Document to Print</span>
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        startContent={<RotateCw className="w-3.5 h-3.5" />}
                        onPress={() => setActiveDoc(null)}
                      >
                        Change File
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
                      <div className="flex items-center gap-2 shrink-0">
                        <Chip color="primary" variant="flat" size="sm">
                          {activeDoc.pageCount} {activeDoc.pageCount === 1 ? "Page" : "Pages"}
                        </Chip>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          isLoading={uploading}
                          startContent={<UploadCloud className="w-3.5 h-3.5" />}
                          onPress={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* 2. Select Vending Machine */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <Printer className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-base text-neutral-900">Select Vending Machine</span>
                      </div>
                      <Chip size="sm" variant="flat" color="success">
                        {machines.filter((m) => m.status === "ONLINE").length} Online
                      </Chip>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <RadioGroup
                      value={selectedMachineId}
                      onValueChange={setSelectedMachineId}
                      className="space-y-2"
                    >
                      {machines.map((m) => (
                        <Radio key={m.machineId} value={m.machineId} className="w-full">
                          <div className="flex items-center justify-between gap-4 w-full py-1">
                            <div>
                              <span className="font-semibold text-sm text-neutral-900">{m.name}</span>
                              <span className="block text-xs text-neutral-500 mt-0.5">{m.location}</span>
                            </div>
                            <Chip
                              size="sm"
                              color={m.status === "ONLINE" ? "success" : "danger"}
                              variant="flat"
                            >
                              {m.status}
                            </Chip>
                          </div>
                        </Radio>
                      ))}
                    </RadioGroup>
                  </CardBody>
                </Card>

                {/* 3. Print Settings */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-base text-neutral-900">Print Settings</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    {/* Color Mode */}
                    <div>
                      <RadioGroup
                        label="Color Mode"
                        orientation="horizontal"
                        value={colorMode}
                        onValueChange={(val) => setColorMode(val as ColorMode)}
                      >
                        <Radio value="bw">Black & White (₹1.50/page)</Radio>
                        <Radio value="color">Full Color (₹5.00/page)</Radio>
                      </RadioGroup>
                    </div>

                    <Divider />

                    {/* Sides */}
                    <div>
                      <RadioGroup
                        label="Print Sides"
                        orientation="horizontal"
                        value={simplexDuplex}
                        onValueChange={(val) => setSimplexDuplex(val as SimplexDuplex)}
                      >
                        <Radio value="simplex">Single-Sided</Radio>
                        <Radio value="duplex">Double-Sided (Duplex)</Radio>
                      </RadioGroup>
                    </div>

                    <Divider />

                    {/* Paper Size */}
                    <div>
                      <RadioGroup
                        label="Paper Size"
                        orientation="horizontal"
                        value={paperSize}
                        onValueChange={setPaperSize}
                      >
                        <Radio value="A4">Standard A4 Sheet</Radio>
                        <Radio value="A3">A3 Sheet</Radio>
                      </RadioGroup>
                    </div>

                    <Divider />

                    {/* Copies & Pages */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                      {/* Copies with tap buttons for mobile */}
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Number of Copies</label>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={() => setCopies((c) => Math.max(1, c - 1))}
                            className="h-10 w-10 shrink-0"
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
                            className="h-10 w-10 shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Pages to Print */}
                      <div>
                        <RadioGroup
                          label="Pages to Print"
                          orientation="horizontal"
                          value={pageRangeType}
                          onValueChange={(val) => setPageRangeType(val as "all" | "custom")}
                        >
                          <Radio value="all">All ({activeDoc.pageCount || 1})</Radio>
                          <Radio value="custom">Custom Range</Radio>
                        </RadioGroup>

                        {pageRangeType === "custom" && (
                          <Input
                            className="mt-2.5"
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
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-base text-neutral-900">Payment Summary</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Total Pages to Print:</span>
                      <span className="font-semibold text-neutral-900">
                        {(pageRangeType === "all" ? activeDoc.pageCount || 1 : 1) * Math.max(1, copies)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Color Mode:</span>
                      <span className="font-semibold text-neutral-900">
                        {colorMode === "bw" ? "Black & White" : "Full Color"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Base Rate:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.baseRatePaise)} / side
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Subtotal:</span>
                      <span className="font-semibold text-neutral-900">
                        {formatRupees(pricing.subtotalPaise)}
                      </span>
                    </div>

                    {pricing.discountPaise > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Discount Applied:</span>
                        <span className="font-semibold">
                          -{formatRupees(pricing.discountPaise)}
                        </span>
                      </div>
                    )}

                    {/* Promo Code Input with dedicated Apply button */}
                    <div className="pt-2">
                      <label className="text-xs font-medium text-neutral-500 block mb-1">Coupon / Offer Code</label>
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
                          className="shrink-0 font-semibold"
                          onPress={() => setAppliedOffer(offerCode.trim())}
                        >
                          Apply
                        </Button>
                      </div>
                      {appliedOffer && (
                        <Chip size="sm" color="success" variant="flat" className="mt-2">
                          Applied: {appliedOffer}
                        </Chip>
                      )}
                    </div>

                    <Divider className="my-2" />

                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-base font-bold text-neutral-900">Payable Amount:</span>
                      <span className="text-3xl font-extrabold text-primary">
                        {formatRupees(pricing.finalPayablePaise)}
                      </span>
                    </div>
                  </CardBody>
                  <CardFooter>
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

                {/* How it works card */}
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <Lock className="w-4 h-4 text-primary" />
                      <span>How it works</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      1. Complete checkout to generate a secure 6-digit OTP.
                      <br />
                      2. Your document begins zero-download preloading into the selected kiosk.
                      <br />
                      3. Enter the OTP on the kiosk screen for instant printing.
                    </p>
                  </CardBody>
                </Card>
              </div>
            </div>

            {/* Mobile Sticky Checkout Bar (Fixed at bottom on phones) */}
            <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 sm:p-4 flex items-center justify-between z-40 lg:hidden shadow-xl">
              <div>
                <span className="text-xs text-neutral-500 block">Total Payable</span>
                <span className="text-xl font-extrabold text-primary">
                  {formatRupees(pricing.finalPayablePaise)}
                </span>
              </div>
              <Button
                color="primary"
                size="md"
                className="font-bold px-6 shadow-md"
                isLoading={paying || calculatingPrice}
                onPress={handleProceedToPayment}
              >
                Pay & Get OTP
              </Button>
            </div>
          </div>
        )}

        {/* Modal: OTP Release Dialog (Clean HeroUI Portal Overlay) */}
        <Modal isOpen={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
          <ModalContent>
            <ModalHeader className="text-center items-center">
              <CheckCircle2 className="w-10 h-10 text-success mb-2" />
              <h2 className="text-xl font-bold">Print Order Authorized!</h2>
              <p className="text-xs text-muted">
                Document is preloaded and ready at {selectedMachine?.name}
              </p>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Card>
                <CardBody className="flex flex-col items-center gap-1.5 text-center py-4">
                  <span className="text-xs uppercase tracking-widest text-primary font-bold">
                    Your 6-Digit Kiosk OTP
                  </span>
                  <span className="text-4xl font-mono font-black tracking-widest text-primary my-1">
                    {generatedOtp || "------"}
                  </span>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="mt-1"
                    startContent={copiedOtp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    onPress={copyOtpToClipboard}
                  >
                    {copiedOtp ? "Copied" : "Copy OTP"}
                  </Button>
                </CardBody>
              </Card>

              <div className="space-y-2 text-xs text-neutral-600 px-1">
                <div className="flex justify-between">
                  <span>Vending Machine:</span>
                  <span className="font-semibold text-neutral-900">{selectedMachine?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kiosk Location:</span>
                  <span className="font-semibold text-neutral-900">{selectedMachine?.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>OTP Expiration:</span>
                  <span className="font-semibold text-neutral-900">15 Minutes</span>
                </div>
              </div>

              <Button
                color="primary"
                className="w-full mt-2 font-bold"
                onPress={() => setIsOtpModalOpen(false)}
              >
                Done
              </Button>
            </ModalBody>
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}

export default function UserPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading Print Studio...</div>}>
      <UserPrintContent />
    </Suspense>
  );
}
