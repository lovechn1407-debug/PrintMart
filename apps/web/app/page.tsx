"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip,
  Divider,
} from "@heroui/react";
import {
  Printer,
  Zap,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { MachineRecord } from "@printmart/shared";

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();
  const [machines, setMachines] = useState<MachineRecord[]>([]);

  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsubscribe = onValue(machinesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMachines(Object.values(data));
      } else {
        // Default initial machines if none registered yet
        setMachines([
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
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  const onlineCount = machines.filter((m) => m.status === "ONLINE").length;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <AppNavbar />

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 md:py-20 flex flex-col items-center text-center">
        <Chip
          variant="flat"
          color="primary"
          startContent={<Zap className="w-4 h-4 ml-1" />}
          className="mb-4"
        >
          Zero Wait Self-Service Printing
        </Chip>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 max-w-3xl leading-tight">
          Instant Document Printing at Any Smart Kiosk
        </h1>

        <p className="mt-4 text-lg md:text-xl text-neutral-600 max-w-2xl">
          Upload your files from phone or laptop, configure settings, and print in seconds
          with our secure one-time OTP system. Documents preload before you even touch the machine.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button
            as={Link}
            href="/user/print"
            size="lg"
            color="primary"
            variant="solid"
            className="font-semibold shadow-sm"
            endContent={<ArrowRight className="w-5 h-5" />}
          >
            Start Printing Now
          </Button>

          {!user && (
            <Button
              size="lg"
              variant="bordered"
              className="font-semibold"
              onPress={() => signInWithGoogle()}
            >
              Sign In with Google
            </Button>
          )}
        </div>

        {/* Feature Highlights using HeroUI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full text-left">
          <Card className="p-2 border border-neutral-200/80 shadow-none bg-white">
            <CardHeader className="flex gap-3 items-center">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Background Preloading</h3>
                <p className="text-xs text-neutral-500">Zero download wait time at the kiosk</p>
              </div>
            </CardHeader>
            <CardBody className="text-sm text-neutral-600">
              Files stream directly to your selected machine upon payment. When you enter your OTP,
              printing starts instantaneously without downloading.
            </CardBody>
          </Card>

          <Card className="p-2 border border-neutral-200/80 shadow-none bg-white">
            <CardHeader className="flex gap-3 items-center">
              <div className="p-2.5 rounded-lg bg-success/10 text-success">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Cashfree Protected</h3>
                <p className="text-xs text-neutral-500">UPI, Cards, Netbanking & Wallets</p>
              </div>
            </CardHeader>
            <CardBody className="text-sm text-neutral-600">
              Every payment generates an encrypted 6-digit one-time PIN. Bank-grade security with
              automatic refunds if hardware encounters a jam.
            </CardBody>
          </Card>

          <Card className="p-2 border border-neutral-200/80 shadow-none bg-white">
            <CardHeader className="flex gap-3 items-center">
              <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Multi-Format Support</h3>
                <p className="text-xs text-neutral-500">PDF, Word, PPT & Images</p>
              </div>
            </CardHeader>
            <CardBody className="text-sm text-neutral-600">
              Full control over single or double-sided printing, color modes, page ranges, and
              copies with real-time price preview in paise.
            </CardBody>
          </Card>
        </div>

        {/* Live Vending Machine Status section */}
        <div className="mt-16 w-full max-w-4xl text-left">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">Available Printing Stations</h2>
              <p className="text-sm text-neutral-500">Find a vending machine near you</p>
            </div>
            <Chip color="success" variant="flat" size="sm">
              {onlineCount} Stations Online
            </Chip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((machine) => (
              <Card key={machine.machineId} className="border border-neutral-200/80 shadow-none bg-white">
                <CardBody className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-base text-neutral-900">{machine.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{machine.location}</span>
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="dot"
                      color={machine.status === "ONLINE" ? "success" : "danger"}
                    >
                      {machine.status}
                    </Chip>
                  </div>

                  <Divider className="my-1" />

                  <div className="flex justify-between items-center text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      ID: {machine.machineId}
                    </span>
                    <Button
                      as={Link}
                      href={`/user/print?machineId=${machine.machineId}`}
                      size="sm"
                      variant="light"
                      color="primary"
                      className="font-medium"
                    >
                      Select Station →
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-16 text-center text-sm text-neutral-500">
        <p>© 2026 PrintMart Platform. Powered by HeroUI v3 & Firebase Realtime Database.</p>
      </footer>
    </div>
  );
}

