"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  Printer,
  Users,
  Coins,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, MachineRecord, PrintJob } from "@printmart/shared";

export default function AdminDashboardPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [usersCount, setUsersCount] = useState<number>(0);

  useEffect(() => {
    // Listen to machines
    const machinesRef = ref(database, "machines");
    const unsubMachines = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        setMachines(Object.values(snap.val()));
      }
    });

    // Listen to printJobs
    const jobsRef = ref(database, "printJobs");
    const unsubJobs = onValue(jobsRef, (snap) => {
      if (snap.exists()) {
        const allJobs = Object.values(snap.val()) as PrintJob[];
        setJobs(allJobs.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    // Listen to users
    const usersRef = ref(database, "users");
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsersCount(Object.keys(snap.val()).length);
      }
    });

    return () => {
      unsubMachines();
      unsubJobs();
      unsubUsers();
    };
  }, []);

  // Aggregated Stats
  const onlineMachines = machines.filter((m) => m.status === "ONLINE").length;
  const offlineMachines = machines.filter((m) => m.status === "OFFLINE").length;
  const maintenanceMachines = machines.filter((m) => m.status === "MAINTENANCE").length;

  const totalRevenuePaise = jobs.reduce((sum, j) => {
    return j.payment?.status === "PAID" ? sum + (j.pricing?.finalPayablePaise || 0) : sum;
  }, 0);

  const totalPagesPrinted = jobs.reduce((sum, j) => {
    return j.printing?.status === "COMPLETED" ? sum + (j.printing.printedPages || 0) : sum;
  }, 0);

  const completedJobs = jobs.filter((j) => j.printing?.status === "COMPLETED").length;
  const activePrintingJobs = jobs.filter((j) => j.printing?.status === "PRINTING").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fleet Operations Dashboard</h1>
          <p className="text-sm text-neutral-500">Live monitoring of PrintMart kiosks and revenue</p>
        </div>
        <Button as={Link} href="/admin/machines" size="sm" color="primary">
          Manage Machines
        </Button>
      </div>

      {/* KPI Stats Grid using HeroUI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-neutral-200/80 shadow-none bg-white p-2">
          <CardHeader className="flex justify-between items-center pb-1">
            <span className="text-xs font-semibold text-neutral-500">Total Kiosks</span>
            <Printer className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardBody className="py-1">
            <span className="text-2xl font-bold text-neutral-900">{machines.length}</span>
            <div className="flex gap-2 mt-2">
              <Chip size="sm" color="success" variant="flat">
                {onlineMachines} Online
              </Chip>
              {offlineMachines > 0 && (
                <Chip size="sm" color="danger" variant="flat">
                  {offlineMachines} Offline
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-neutral-200/80 shadow-none bg-white p-2">
          <CardHeader className="flex justify-between items-center pb-1">
            <span className="text-xs font-semibold text-neutral-500">Total Revenue</span>
            <Coins className="w-4 h-4 text-success" />
          </CardHeader>
          <CardBody className="py-1">
            <span className="text-2xl font-bold text-neutral-900">
              {formatRupees(totalRevenuePaise)}
            </span>
            <p className="text-xs text-neutral-400 mt-2">Verified Cashfree settlements</p>
          </CardBody>
        </Card>

        <Card className="border border-neutral-200/80 shadow-none bg-white p-2">
          <CardHeader className="flex justify-between items-center pb-1">
            <span className="text-xs font-semibold text-neutral-500">Print Jobs</span>
            <FileSpreadsheet className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardBody className="py-1">
            <span className="text-2xl font-bold text-neutral-900">{jobs.length}</span>
            <div className="flex gap-2 mt-2">
              <Chip size="sm" color="success" variant="flat">
                {completedJobs} Done
              </Chip>
              {activePrintingJobs > 0 && (
                <Chip size="sm" color="primary" variant="flat">
                  {activePrintingJobs} Printing
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="border border-neutral-200/80 shadow-none bg-white p-2">
          <CardHeader className="flex justify-between items-center pb-1">
            <span className="text-xs font-semibold text-neutral-500">Total Pages Printed</span>
            <CheckCircle className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardBody className="py-1">
            <span className="text-2xl font-bold text-neutral-900">{totalPagesPrinted}</span>
            <p className="text-xs text-neutral-400 mt-2">Across all active kiosks</p>
          </CardBody>
        </Card>
      </div>

      {/* Machine Fleet Health Overview */}
      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardHeader className="flex justify-between items-center border-b border-neutral-100 p-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900">Vending Machines Overview</h3>
            <p className="text-xs text-neutral-500">Realtime connectivity & spooler telemetry</p>
          </div>
          <Button as={Link} href="/admin/machines" size="sm" variant="light" color="primary">
            View All ({machines.length})
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <Table aria-label="Fleet health table" className="p-2">
            <TableHeader>
              <TableColumn>MACHINE NAME</TableColumn>
              <TableColumn>LOCATION</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>LAST HEARTBEAT</TableColumn>
              <TableColumn>AGENT</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody>
              {machines.slice(0, 5).map((machine) => (
                <TableRow key={machine.machineId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-neutral-900">{machine.name}</span>
                      <span className="font-mono text-xs text-neutral-400">{machine.machineId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-600">{machine.location}</span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="dot"
                      color={
                        machine.status === "ONLINE"
                          ? "success"
                          : machine.status === "MAINTENANCE"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {machine.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-500">
                      {machine.lastHeartbeat ? new Date(machine.lastHeartbeat).toLocaleTimeString() : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-600">{machine.agentVersion || "1.0.0"}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      as={Link}
                      href={`/admin/machines?id=${machine.machineId}`}
                      size="sm"
                      variant="light"
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Recent Print Jobs */}
      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardHeader className="flex justify-between items-center border-b border-neutral-100 p-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900">Recent Print Activity</h3>
            <p className="text-xs text-neutral-500">Latest jobs across the network</p>
          </div>
          <Button as={Link} href="/admin/jobs" size="sm" variant="light" color="primary">
            View All Jobs
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <Table aria-label="Recent print jobs table" className="p-2">
            <TableHeader>
              <TableColumn>JOB ID</TableColumn>
              <TableColumn>DOCUMENT</TableColumn>
              <TableColumn>MACHINE</TableColumn>
              <TableColumn>AMOUNT</TableColumn>
              <TableColumn>PRELOAD</TableColumn>
              <TableColumn>STATUS</TableColumn>
            </TableHeader>
            <TableBody>
              {jobs.slice(0, 5).map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-neutral-800">{job.jobId}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-700 truncate max-w-xs block">{job.documentName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-600">{job.machineId}</span>
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
                      color={job.printing?.status === "COMPLETED" ? "success" : "default"}
                    >
                      {job.printing?.status || "QUEUED"}
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

