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
  Copy,
  Check,
  Trash2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { ref, onValue, set, update, remove } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import {
  formatRupees,
  MachineAction,
  MachineCommand,
  MachinePrinterStatus,
  MachineRecord,
} from "@printmart/shared";

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  // Add Machine Form State (Simplified: Name + Location)
  const [newName, setNewName] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");
  const [justAddedMachine, setJustAddedMachine] = useState<{ name: string; pairCode: string } | null>(null);

  // Remote Control command state
  const [commandLoading, setCommandLoading] = useState<boolean>(false);

  useEffect(() => {
    // Listen to machines
    const machinesRef = ref(database, "machines");
    const unsubMachines = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          machineId: val.machineId || key,
        }));
        setMachines(list);
      } else {
        setMachines([]);
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredMachines = machines.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.machineId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.pairCode || "").includes(searchQuery)
  );

  // Register New Vending Machine (Name + Location -> Auto Pair Code)
  const handleRegisterMachine = async (onClose: () => void) => {
    if (!newName.trim()) return;

    // Generate random 6-digit pair code
    const pairCode = String(Math.floor(100000 + Math.random() * 900000));
    // Generate clean machine ID
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    const slug = newName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const machineId = `MCH-${slug || "KIOSK"}-${randomSuffix}`;

    const newMachine: any = {
      machineId,
      name: newName.trim(),
      location: newLocation.trim() || "Main Campus Hall",
      pairCode,
      pairedAt: Date.now(),
      pairingStatus: "paired",
      status: "ONLINE",
      lastHeartbeat: Date.now(),
      agentVersion: "1.0.0",
      createdAt: Date.now(),
      pricingOverride: {
        enabled: false,
        bwPerSidePaise: 150,
        colorPerSidePaise: 500,
      },
    };

    // Save machine record
    await set(ref(database, `machines/${machineId}`), newMachine);

    // Save initial healthy printer telemetry
    await set(ref(database, `machinePrinterStatus/${machineId}`), {
      connection: "ONLINE",
      printerName: "Canon / HP High-Speed Kiosk Spooler",
      printerState: "READY",
      paperStatus: "OK",
      paperPercentage: 100,
      blackInkPercentage: 95,
      cyanInkPercentage: 90,
      magentaInkPercentage: 88,
      yellowInkPercentage: 92,
      updatedAt: Date.now(),
      isSimulator: false,
    });

    setJustAddedMachine({ name: newMachine.name, pairCode });
    setNewName("");
    setNewLocation("");
    onClose();
  };

  // Delete Machine
  const handleDeleteMachine = async (machineId: string) => {
    if (!confirm(`Are you sure you want to remove machine ${machineId}?`)) return;
    await remove(ref(database, `machines/${machineId}`));
    await remove(ref(database, `machinePrinterStatus/${machineId}`));
    if (selectedMachine?.machineId === machineId) {
      setSelectedMachine(null);
    }
  };

  // Seed Default Campus Machine if none exist
  const handleSeedDefault = async () => {
    const machineId = "MCH-CAMPUS-01";
    const pairCode = "123456";
    const defaultMachine = {
      machineId,
      name: "Central Library Kiosk A",
      location: "Ground Floor, Central Library",
      pairCode,
      pairedAt: Date.now(),
      pairingStatus: "paired",
      status: "ONLINE",
      lastHeartbeat: Date.now(),
      agentVersion: "1.0.0",
      createdAt: Date.now(),
    };
    await set(ref(database, `machines/${machineId}`), defaultMachine);
    await set(ref(database, `machinePrinterStatus/${machineId}`), {
      connection: "ONLINE",
      printerName: "HP LaserJet Enterprise Kiosk",
      printerState: "READY",
      paperStatus: "OK",
      paperPercentage: 95,
      blackInkPercentage: 90,
      cyanInkPercentage: 85,
      magentaInkPercentage: 80,
      yellowInkPercentage: 88,
      updatedAt: Date.now(),
    });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Vending Machines Management</h1>
          <p className="text-sm text-neutral-500">Register new vending machines, monitor health, and access login pair codes</p>
        </div>
        <div className="flex items-center gap-2">
          {machines.length === 0 && (
            <Button
              variant="flat"
              color="secondary"
              startContent={<Sparkles className="w-4 h-4" />}
              onPress={handleSeedDefault}
            >
              Seed Default Machine
            </Button>
          )}
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddOpen}
          >
            Add Vending Machine
          </Button>
        </div>
      </div>

      {/* Just Added Machine Banner */}
      {justAddedMachine && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">
                Machine &quot;{justAddedMachine.name}&quot; Registered!
              </h4>
              <p className="text-xs text-emerald-700">
                Pair Code: <strong className="font-mono text-emerald-950 font-black text-sm">{justAddedMachine.pairCode}</strong> — Enter this code in Kiosk Settings to login as this machine.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<Copy className="w-3.5 h-3.5" />}
            onPress={() => handleCopy(justAddedMachine.pairCode)}
          >
            {copiedCode === justAddedMachine.pairCode ? "Copied!" : "Copy Pair Code"}
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <Card className="border border-neutral-200/80 shadow-none bg-white p-3">
        <Input
          placeholder="Search by machine name, ID, location, or pair code..."
          size="sm"
          startContent={<Search className="w-4 h-4 text-neutral-400" />}
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Machines Table */}
      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          <Table aria-label="Vending machines list" className="p-2">
            <TableHeader>
              <TableColumn>MACHINE NAME & ID</TableColumn>
              <TableColumn>LOCATION</TableColumn>
              <TableColumn>PAIR CODE (LOGIN)</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>PRINTER STATUS</TableColumn>
              <TableColumn>LAST ACTIVE</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No vending machines found. Click 'Add Vending Machine' to register one!">
              {filteredMachines.map((machine) => {
                const printer = printerStatuses[machine.machineId];
                const pairCode = machine.pairCode || "123456";
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-emerald-50 text-[#0c831f] px-2.5 py-1 rounded-lg border border-emerald-200">
                          {pairCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(pairCode)}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                          title="Copy Pair Code"
                        >
                          {copiedCode === pairCode ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          machine.status === "ONLINE"
                            ? "success"
                            : machine.status === "DISABLED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {machine.status || "ONLINE"}
                      </Chip>
                    </TableCell>

                    <TableCell>
                      {printer ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-neutral-800">{printer.printerName || "Kiosk Spooler"}</span>
                          <span className="text-neutral-500">
                            State: <strong className="text-emerald-700">{printer.printerState || "READY"}</strong> • Paper: {printer.paperStatus || "OK"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">Ready</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-neutral-500">
                        {machine.lastHeartbeat ? new Date(machine.lastHeartbeat).toLocaleTimeString() : "Just now"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => {
                            setSelectedMachine(machine);
                            onDetailOpen();
                          }}
                        >
                          Control
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMachine(machine.machineId)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Machine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Add Vending Machine Modal (Name + Location) */}
      <Modal isOpen={isAddOpen} onOpenChange={onAddOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-lg font-bold">Add Vending Machine</span>
                <span className="text-xs text-neutral-500">
                  Enter machine name and location. A 6-digit pair code will be auto-generated.
                </span>
              </ModalHeader>
              <ModalBody className="flex flex-col gap-4">
                <Input
                  label="Vending Machine Name"
                  placeholder="e.g. Central Library Kiosk A"
                  value={newName}
                  onChange={(e: any) => setNewName(e.target.value)}
                  description="A friendly display name for students and operators"
                />
                <Input
                  label="Physical Location"
                  placeholder="e.g. Ground Floor, Central Library"
                  value={newLocation}
                  onChange={(e: any) => setNewLocation(e.target.value)}
                  description="Where this kiosk is physically installed on campus"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleRegisterMachine(onClose)}
                  disabled={!newName.trim()}
                >
                  Confirm & Generate Pair Code
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
              const pairCode = selectedMachine.pairCode || "123456";
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
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>ID: <code className="font-mono font-bold text-neutral-800">{selectedMachine.machineId}</code></span>
                      <span>•</span>
                      <span>Pair Code: <code className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{pairCode}</code></span>
                      <span>•</span>
                      <span>{selectedMachine.location}</span>
                    </div>
                  </ModalHeader>
                  <ModalBody className="flex flex-col gap-5">
                    {/* Hardware Telemetry Card */}
                    <Card className="border border-neutral-200 bg-neutral-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Printer className="w-5 h-5 text-neutral-700" />
                        <h4 className="font-semibold text-sm">Printer Hardware Status</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                          <span className="text-neutral-400 block mb-1">Printer State</span>
                          <span className="font-bold text-neutral-800">{printer?.printerState || "READY"}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                          <span className="text-neutral-400 block mb-1">Paper Level</span>
                          <span className="font-bold text-neutral-800">{printer?.paperPercentage ? `${printer.paperPercentage}%` : "100% OK"}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                          <span className="text-neutral-400 block mb-1">Black Toner</span>
                          <span className="font-bold text-neutral-800">{printer?.blackInkPercentage ? `${printer.blackInkPercentage}%` : "90%"}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                          <span className="text-neutral-400 block mb-1">Color Ink</span>
                          <span className="font-bold text-neutral-800">{printer?.cyanInkPercentage ? `${printer.cyanInkPercentage}%` : "85%"}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Remote Actions */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Remote Machine Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMachine.status === "DISABLED" ? (
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            isLoading={commandLoading}
                            startContent={<Power className="w-4 h-4" />}
                            onPress={() => handleSendCommand("ENABLE")}
                          >
                            Enable Kiosk
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            isLoading={commandLoading}
                            startContent={<Power className="w-4 h-4" />}
                            onPress={() => handleSendCommand("DISABLE")}
                          >
                            Disable Kiosk
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="flat"
                          isLoading={commandLoading}
                          startContent={<RotateCcw className="w-4 h-4" />}
                          onPress={() => handleSendCommand("RESTART_AGENT")}
                        >
                          Restart Agent
                        </Button>

                        <Button
                          size="sm"
                          variant="flat"
                          isLoading={commandLoading}
                          startContent={<RefreshCw className="w-4 h-4" />}
                          onPress={() => handleSendCommand("REFRESH_STATUS")}
                        >
                          Refresh Status
                        </Button>
                      </div>
                    </div>
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
