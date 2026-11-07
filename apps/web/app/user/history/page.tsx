"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Printer, Eye, ArrowLeft, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

export default function UserHistoryPage() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    if (!user) return;

    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allJobs = Object.values(snapshot.val()) as PrintJob[];
        const userJobs = allJobs
          .filter((j) => j.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setJobs(userJobs);
      } else {
        setJobs([]);
      }
    });

    return () => unsub();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <AppNavbar />
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
          Loading print history...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Sign in to view your print jobs</h2>
          <p className="text-sm text-neutral-500 mb-4">You need an active session to see your printing activity.</p>
          <Button color="primary" onPress={() => signInWithGoogle()}>
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <AppNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button as={Link} href="/user/print" variant="light" isIconOnly size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">My Print History</h1>
              <p className="text-sm text-neutral-500">Track all your self-service printing orders</p>
            </div>
          </div>
          <Button as={Link} href="/user/print" color="primary" size="sm" startContent={<Printer className="w-4 h-4" />}>
            New Print Job
          </Button>
        </div>

        <Card className="border border-neutral-200/80 shadow-none bg-white">
          <CardBody className="p-0">
            {jobs.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-3">
                <Printer className="w-10 h-10 text-neutral-300" />
                <p className="text-sm">No printing history yet.</p>
                <Button as={Link} href="/user/print" color="primary" size="sm" variant="flat">
                  Start your first print
                </Button>
              </div>
            ) : (
              <Table aria-label="User print jobs table" className="p-2">
                <TableHeader>
                  <TableColumn>JOB ID & DATE</TableColumn>
                  <TableColumn>DOCUMENT</TableColumn>
                  <TableColumn>MACHINE</TableColumn>
                  <TableColumn>CONFIG</TableColumn>
                  <TableColumn>AMOUNT</TableColumn>
                  <TableColumn>PRELOAD STATUS</TableColumn>
                  <TableColumn>PRINT STATUS</TableColumn>
                  <TableColumn>ACTION</TableColumn>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.jobId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-neutral-900">{job.jobId}</span>
                          <span className="text-xs text-neutral-400">
                            {new Date(job.createdAt).toLocaleString()}
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
                        <span className="text-xs text-neutral-600 capitalize">
                          {job.configuration.colorMode} • {job.configuration.copies} cop
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
                          color={job.preparation?.status === "READY" ? "success" : "warning"}
                        >
                          {job.preparation?.status || "CREATED"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            job.printing?.status === "COMPLETED"
                              ? "success"
                              : job.printing?.status === "PRINTING"
                              ? "primary"
                              : "default"
                          }
                        >
                          {job.printing?.status || "QUEUED"}
                        </Chip>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Job Details & Receipt Modal */}
        {selectedJob && (
          <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    <span className="text-base font-bold">Print Job Receipt</span>
                    <span className="font-mono text-xs text-neutral-400">{selectedJob.jobId}</span>
                  </ModalHeader>
                  <ModalBody className="text-sm flex flex-col gap-3">
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Document:</span>
                        <span className="font-semibold text-neutral-900">{selectedJob.documentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Machine:</span>
                        <span className="text-neutral-900">{selectedJob.machineId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Pages:</span>
                        <span className="text-neutral-900">
                          {selectedJob.configuration?.totalPagesToPrint} pages × {selectedJob.configuration?.copies} copies
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Color Mode:</span>
                        <span className="text-neutral-900 capitalize">{selectedJob.configuration?.colorMode}</span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-200 pt-1.5">
                        <span className="font-bold text-neutral-900">Total Paid:</span>
                        <span className="font-bold text-primary">
                          {formatRupees(selectedJob.pricing?.finalPayablePaise || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold text-neutral-700">Preload Status:</span>
                      <p className="text-neutral-500">
                        {selectedJob.preparation?.status === "READY"
                          ? "✓ Preloaded on kiosk spooler before OTP verification."
                          : selectedJob.preparation?.status}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold text-neutral-700">Printing Status:</span>
                      <p className="text-neutral-500">
                        {selectedJob.printing?.status}
                        {selectedJob.printing?.completedAt &&
                          ` (Completed at ${new Date(selectedJob.printing.completedAt).toLocaleTimeString()})`}
                      </p>
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
      </main>
    </div>
  );
}

