"use client";

import React, { useEffect, useState } from "react";
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
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tabs,
  Tab,
  Switch,
  Divider,
} from "@heroui/react";
import {
  Printer,
  Plus,
  Search,
  RefreshCw,
  Power,
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Eye,
} from "lucide-react";
import { ref, onValue, set, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import {
  formatRupees,
  MachineAction,
  MachineCommand,
  MachinePrinterStatus,
  MachineRecord,
} from "@printmart/shared";

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, MachinePrinterStatus>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<MachineRecord | null>(null);

  // Modals
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onOpenChange: onAddOpenChange,
  } = useDisclosure();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onOpenChange: onDetailOpenChange,
  } = useDisclosure();

  // Add Machine Form State
  const [newId, setNewId] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");

  // Remote Control command state
  const [commandLoading, setCommandLoading] = useState<boolean>(false);

  useEffect(() => {
    // Listen to machines
    const machinesRef = ref(database, "machines");
    const unsubMachines = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        setMachines(Object.values(snap.val()));
      }
    });

    // Listen to printer telemetry
    const printerRef = ref(database, "machinePrinterStatus");
    const unsubPrinter = onValue(printerRef, (snap) => {
      if (snap.exists()) {
        setPrinterStatuses(snap.val());
      }
    });

    return () => {
      unsubMachines();
      unsubPrinter();
    };
  }, []);

  const filteredMachines = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.machineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Register New Vending Machine
  const handleRegisterMachine = async (onClose: () => void) => {
    if (!newId || !newName) return;

    const machineId = newId.trim().toUpperCase();
    const newMachine: MachineRecord = {
      machineId,
      name: newName.trim(),
      location: newLocation.trim() || "Campus Location",
      pairedAt: Date.now(),
      pairingStatus: "paired",
      status: "ONLINE",
      lastHeartbeat: Date.now(),
      agentVersion: "1.0.0",
      pricingOverride: {
        enabled: false,
        bwPerSidePaise: 150,
        colorPerSidePaise: 500,
      },
    };

    await set(ref(database, `machines/${machineId}`), newMachine);
    setNewId("");
    setNewName("");
    setNewLocation("");
    onClose();
  };

  // Issue Remote Control Command
  const handleSendCommand = async (action: MachineAction, payload = {}) => {
    if (!selectedMachine) return;
    try {
      setCommandLoading(true);
      const commandId = `CMD_${Date.now()}`;
      const cmd: MachineCommand = {
        commandId,
        action,
        payload,
        status: "PENDING",
        issuedBy: "admin",
        issuedAt: Date.now(),
      };

      await set(ref(database, `machineCommands/${selectedMachine.machineId}/${commandId}`), cmd);

      // If action is DISABLE or ENABLE, update machine record status directly as well
      if (action === "DISABLE") {
        await update(ref(database, `machines/${selectedMachine.machineId}`), {
          status: "DISABLED",
        });
        setSelectedMachine({ ...selectedMachine, status: "DISABLED" });
      } else if (action === "ENABLE") {
        await update(ref(database, `machines/${selectedMachine.machineId}`), {
          status: "ONLINE",
        });
        setSelectedMachine({ ...selectedMachine, status: "ONLINE" });
      }
    } catch (err) {
      console.error("Failed to send command:", err);
    } finally {
      setCommandLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Vending Machines Management</h1>
          <p className="text-sm text-neutral-500">Configure, monitor, and remotely control kiosk units</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onAddOpen}
        >
          Add Vending Machine
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border border-neutral-200/80 shadow-none bg-white p-3">
        <Input
          placeholder="Search by machine name, ID, or location..."
          size="sm"
          startContent={<Search className="w-4 h-4 text-neutral-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </Card>

      {/* Machines Table */}
      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          <Table aria-label="Vending machines list" className="p-2">
            <TableHeader>
              <TableColumn>MACHINE NAME & ID</TableColumn>
              <TableColumn>LOCATION</TableColumn>
              <TableColumn>CONNECTION</TableColumn>
              <TableColumn>PRINTER TELEMETRY</TableColumn>
              <TableColumn>LAST HEARTBEAT</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => {
                const printer = printerStatuses[machine.machineId];
                return (
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
                            : machine.status === "DISABLED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {machine.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {printer ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-neutral-800">{printer.printerName}</span>
                          <span className="text-neutral-500">
                            State: {printer.printerState} • Paper: {printer.paperStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">No hardware telemetry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-neutral-500">
                        {machine.lastHeartbeat ? new Date(machine.lastHeartbeat).toLocaleTimeString() : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => {
                          setSelectedMachine(machine);
                          onDetailOpen();
                        }}
                      >
                        Details & Remote
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Add Vending Machine Modal */}
      <Modal isOpen={isAddOpen} onOpenChange={onAddOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-lg font-bold">Register New Vending Machine</span>
                <span className="text-xs text-neutral-500">
                  Secure pairing with local Electron agent
                </span>
              </ModalHeader>
              <ModalBody className="flex flex-col gap-4">
                <Input
                  label="Machine ID"
                  placeholder="e.g. MCH-CAMPUS-03"
                  value={newId}
                  onValueChange={setNewId}
                />
                <Input
                  label="Display Name"
                  placeholder="e.g. Science Library Kiosk"
                  value={newName}
                  onValueChange={setNewName}
                />
                <Input
                  label="Physical Location"
                  placeholder="e.g. 2nd Floor, Hallway C"
                  value={newLocation}
                  onValueChange={setNewLocation}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleRegisterMachine(onClose)}>
                  Pair & Save Machine
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Machine Details & Remote Control Modal */}
      {selectedMachine && (
        <Modal size="2xl" isOpen={isDetailOpen} onOpenChange={onDetailOpenChange}>
          <ModalContent>
            {(onClose) => {
              const printer = printerStatuses[selectedMachine.machineId];
              return (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{selectedMachine.name}</span>
                      <Chip
                        size="sm"
                        color={selectedMachine.status === "ONLINE" ? "success" : "danger"}
                      >
                        {selectedMachine.status}
                      </Chip>
                    </div>
                    <span className="font-mono text-xs text-neutral-400">
                      ID: {selectedMachine.machineId} • Location: {selectedMachine.location}
                    </span>
                  </ModalHeader>

                  <ModalBody>
                    <Tabs aria-label="Machine Detail Tabs" variant="underlined">
                      {/* Tab 1: Hardware & Telemetry */}
                      <Tab key="telemetry" title="Printer Telemetry">
                        <div className="flex flex-col gap-3 py-3 text-sm">
                          {printer ? (
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col gap-2">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Spooler Printer Name:</span>
                                <span className="font-bold text-neutral-900">{printer.printerName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Hardware State:</span>
                                <Chip size="sm" variant="flat" color={printer.printerState === "READY" ? "success" : "warning"}>
                                  {printer.printerState}
                                </Chip>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Paper Status:</span>
                                <span className="font-semibold text-neutral-800">{printer.paperStatus}</span>
                              </div>
                              <Divider className="my-1" />
                              <div>
                                <span className="text-xs font-semibold text-neutral-500 block mb-1.5">
                                  Toner / Ink Telemetry:
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-white p-2 border border-neutral-200 rounded">
                                    Black: {printer.tonerLevels?.blackPercent != null ? `${printer.tonerLevels.blackPercent}%` : "NOT_SUPPORTED"}
                                  </div>
                                  <div className="bg-white p-2 border border-neutral-200 rounded">
                                    Cyan: {printer.tonerLevels?.cyanPercent != null ? `${printer.tonerLevels.cyanPercent}%` : "NOT_SUPPORTED"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-neutral-400">
                              No printer telemetry received yet from the local Electron agent.
                            </div>
                          )}
                        </div>
                      </Tab>

                      {/* Tab 2: Remote Controls */}
                      <Tab key="remote" title="Remote Controls">
                        <div className="flex flex-col gap-4 py-3">
                          <p className="text-xs text-neutral-500">
                            Commands sent here are dispatched via Firebase Realtime Database and acknowledged by the Electron agent.
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            {selectedMachine.status === "DISABLED" ? (
                              <Button
                                color="success"
                                variant="solid"
                                isLoading={commandLoading}
                                startContent={<Power className="w-4 h-4" />}
                                onPress={() => handleSendCommand("ENABLE")}
                              >
                                Enable Vending Kiosk
                              </Button>
                            ) : (
                              <Button
                                color="danger"
                                variant="solid"
                                isLoading={commandLoading}
                                startContent={<Power className="w-4 h-4" />}
                                onPress={() => handleSendCommand("DISABLE")}
                              >
                                Disable Vending Kiosk
                              </Button>
                            )}

                            <Button
                              variant="flat"
                              isLoading={commandLoading}
                              startContent={<RotateCcw className="w-4 h-4" />}
                              onPress={() => handleSendCommand("RESTART_AGENT")}
                            >
                              Restart Agent
                            </Button>

                            <Button
                              variant="flat"
                              isLoading={commandLoading}
                              startContent={<RefreshCw className="w-4 h-4" />}
                              onPress={() => handleSendCommand("REFRESH_STATUS")}
                            >
                              Refresh Spooler Telemetry
                            </Button>

                            <Button
                              variant="flat"
                              isLoading={commandLoading}
                              startContent={<AlertTriangle className="w-4 h-4" />}
                              onPress={() => handleSendCommand("CLEAR_ERROR")}
                            >
                              Clear Recoverable Error
                            </Button>
                          </div>
                        </div>
                      </Tab>
                    </Tabs>
                  </ModalBody>

                  <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                      Close
                    </Button>
                  </ModalFooter>
                </>
              );
            }}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}

