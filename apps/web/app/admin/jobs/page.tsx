"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { FileSpreadsheet, Search, Eye, RefreshCw, XCircle } from "lucide-react";
import { ref, onValue, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const all = Object.values(snap.val()) as PrintJob[];
        setJobs(all.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => unsub();
  }, []);

  const filteredJobs = jobs.filter(
    (j) =>
      j.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.machineId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const retryPreload = async (jobId: string) => {
    await update(ref(database, `printJobs/${jobId}/preparation`), {
      status: "PRELOAD_QUEUED",
      preloadStartedAt: Date.now(),
      errorMessage: null,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Print Jobs Fleet Tracker</h1>
        <p className="text-sm text-neutral-500">
          Central monitoring of all customer printing tasks, background preloading, and hardware output
        </p>
      </div>

      <Card className="border border-neutral-200/80 shadow-none bg-white p-3">
        <Input
          placeholder="Search by Job ID, file name, or machine..."
          size="sm"
          startContent={<Search className="w-4 h-4 text-neutral-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </Card>

      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          <Table aria-label="Print jobs table" className="p-2">
            <TableHeader>
              <TableColumn>JOB ID & DATE</TableColumn>
              <TableColumn>DOCUMENT</TableColumn>
              <TableColumn>MACHINE</TableColumn>
              <TableColumn>PAGES & COPIES</TableColumn>
              <TableColumn>AMOUNT</TableColumn>
              <TableColumn>PAYMENT</TableColumn>
              <TableColumn>PRELOAD STATUS</TableColumn>
              <TableColumn>PRINT STATUS</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-neutral-900">{job.jobId}</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-neutral-800 truncate block max-w-xs">
                      {job.documentName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-600">{job.machineId}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-600">
                      {job.configuration?.totalPagesToPrint}p × {job.configuration?.copies}c
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-neutral-900">
                      {formatRupees(job.pricing?.finalPayablePaise || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={job.payment?.status === "PAID" ? "success" : "default"}
                    >
                      {job.payment?.status || "PENDING"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        job.preparation?.status === "READY"
                          ? "success"
                          : job.preparation?.status === "PRELOAD_FAILED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {job.preparation?.status || "CREATED"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={job.printing?.status === "COMPLETED" ? "success" : "default"}
                    >
                      {job.printing?.status || "QUEUED"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => {
                          setSelectedJob(job);
                          onOpen();
                        }}
                      >
                        <Eye className="w-4 h-4 text-neutral-600" />
                      </Button>
                      {job.preparation?.status === "PRELOAD_FAILED" && (
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          color="warning"
                          onPress={() => retryPreload(job.jobId)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal size="lg" isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span className="text-base font-bold">Print Job Audit Record</span>
                  <span className="font-mono text-xs text-neutral-400">{selectedJob.jobId}</span>
                </ModalHeader>
                <ModalBody className="text-xs flex flex-col gap-3">
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Document:</span>
                      <span className="font-semibold text-neutral-900">{selectedJob.documentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Target Vending Machine:</span>
                      <span className="font-mono text-neutral-900">{selectedJob.machineId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Order ID:</span>
                      <span className="font-mono text-neutral-900">{selectedJob.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">OTP Consumed:</span>
                      <span className="font-semibold">{selectedJob.otpConsumed ? "YES (Redeemed)" : "NO (Awaiting Redemption)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Spooler Job ID:</span>
                      <span className="font-mono">{selectedJob.printing?.spoolerJobId || "Not Spooled Yet"}</span>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}

