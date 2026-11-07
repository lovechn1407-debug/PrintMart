"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Progress, Chip, Button } from "@heroui/react";
import { Printer, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

interface PrintingProgressScreenProps {
  jobDetails: {
    jobId: string;
    documentName: string;
    configuration: {
      colorMode: string;
      simplexDuplex: string;
      totalPagesToPrint: number;
      copies: number;
    };
  };
  onComplete: () => void;
}

export function PrintingProgressScreen({ jobDetails, onComplete }: PrintingProgressScreenProps) {
  const [pagesPrinted, setPagesPrinted] = useState<number>(0);
  const totalPages =
    (jobDetails.configuration?.totalPagesToPrint || 5) *
    (jobDetails.configuration?.copies || 1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [printerTelemetry, setPrinterTelemetry] = useState<string>("SPOOLING_RAW_GDI");

  useEffect(() => {
    const kioskApi = (window as any).kioskApi;

    // Issue native print command to Electron main process
    if (kioskApi?.printJob) {
      kioskApi.printJob(jobDetails.jobId, jobDetails.configuration).then((res: any) => {
        if (res.success) {
          setIsCompleted(true);
          setTimeout(() => onComplete(), 3500);
        }
      });

      const unsub = kioskApi.onPrintProgress((data: any) => {
        if (data.jobId === jobDetails.jobId) {
          setPagesPrinted(data.printedPages);
          setPrinterTelemetry("PRINTING_PAGE");
        }
      });

      return () => unsub();
    } else {
      // Browser fallback simulation
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setPagesPrinted(current);
        if (current >= totalPages) {
          clearInterval(interval);
          setIsCompleted(true);
          setTimeout(() => onComplete(), 3500);
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [jobDetails, totalPages, onComplete]);

  const percentage = Math.min(100, Math.round((pagesPrinted / totalPages) * 100));

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
      <Card className="w-full border border-neutral-200/80 shadow-none bg-white p-6 text-center">
        <CardHeader className="flex flex-col items-center gap-3">
          <div
            className={`p-4 rounded-full ${
              isCompleted ? "bg-success/10 text-success" : "bg-primary/10 text-primary animate-pulse"
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-12 h-12" /> : <Printer className="w-12 h-12" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-neutral-900">
              {isCompleted ? "Printing Completed!" : "Printing in Progress..."}
            </h2>
            <p className="text-sm text-neutral-500 font-mono mt-1">
              Job ID: {jobDetails.jobId}
            </p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col items-center gap-6 py-6">
          <div className="w-full bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-left text-sm flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Document:</span>
              <span className="font-bold text-neutral-900">{jobDetails.documentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Mode:</span>
              <span className="capitalize text-neutral-800">
                {jobDetails.configuration?.colorMode} • {jobDetails.configuration?.simplexDuplex}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Hardware Output:</span>
              <span className="font-semibold text-primary">
                {pagesPrinted} / {totalPages} Pages
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Windows Spooler Progress</span>
              <span className="font-bold">{percentage}%</span>
            </div>
            <Progress
              size="lg"
              value={percentage}
              color={isCompleted ? "success" : "primary"}
              className="w-full"
            />
          </div>

          <Chip size="sm" variant="flat" color={isCompleted ? "success" : "warning"}>
            {isCompleted ? "Physical Spool Complete" : "Processing Hardware Driver Stream"}
          </Chip>

          {isCompleted && (
            <p className="text-xs text-neutral-400">
              Please collect your documents from the output tray. Returning to home screen...
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

