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
  Input,
} from "@heroui/react";
import { Receipt, Search } from "lucide-react";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, PrintJob } from "@printmart/shared";

export default function AdminTransactionsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const all = Object.values(snap.val()) as PrintJob[];
        setJobs(all.filter((j) => j.payment?.status === "PAID").sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => unsub();
  }, []);

  const filtered = jobs.filter(
    (j) =>
      j.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.payment?.cfPaymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Cashfree Transactions</h1>
        <p className="text-sm text-neutral-500">Verified payment records and settlement logs</p>
      </div>

      <Card className="border border-neutral-200/80 shadow-none bg-white p-3">
        <Input
          placeholder="Search by Order ID, Payment ID, or User UID..."
          size="sm"
          startContent={<Search className="w-4 h-4 text-neutral-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </Card>

      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          <Table aria-label="Transactions table" className="p-2">
            <TableHeader>
              <TableColumn>ORDER ID & DATE</TableColumn>
              <TableColumn>CF PAYMENT ID</TableColumn>
              <TableColumn>USER</TableColumn>
              <TableColumn>JOB ID</TableColumn>
              <TableColumn>AMOUNT</TableColumn>
              <TableColumn>STATUS</TableColumn>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => (
                <TableRow key={j.orderId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-neutral-900">{j.orderId}</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(j.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-neutral-700">
                      {j.payment?.cfPaymentId || "DEMO_SANDBOX"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-neutral-500 truncate max-w-xs block">
                      {j.userId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-neutral-600">{j.jobId}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-neutral-900">
                      {formatRupees(j.pricing?.finalPayablePaise || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color="success" variant="flat">
                      PAID
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

