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
  Avatar,
  Input,
} from "@heroui/react";
import { Users, Search, ShieldCheck, Ban } from "lucide-react";
import { ref, onValue, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, UserProfile } from "@printmart/shared";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsers(Object.values(snap.val()));
      }
    });

    return () => unsub();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccountStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await update(ref(database, `users/${uid}`), { accountStatus: newStatus });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
        <p className="text-sm text-neutral-500">Monitor customer accounts, spending, and activity</p>
      </div>

      <Card className="border border-neutral-200/80 shadow-none bg-white p-3">
        <Input
          placeholder="Search by customer name, email, or UID..."
          size="sm"
          startContent={<Search className="w-4 h-4 text-neutral-400" />}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </Card>

      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          <Table aria-label="Users list table" className="p-2">
            <TableHeader>
              <TableColumn>USER</TableColumn>
              <TableColumn>REGISTERED</TableColumn>
              <TableColumn>DOCUMENTS</TableColumn>
              <TableColumn>PAGES</TableColumn>
              <TableColumn>TOTAL SPENT</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar src={u.photoURL} name={u.displayName || "User"} size="sm" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-neutral-900">{u.displayName}</span>
                        <span className="text-xs text-neutral-500">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-700">{u.stats?.totalDocuments || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-700">{u.stats?.totalPages || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-neutral-900">
                      {formatRupees(u.stats?.totalSpentPaise || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={u.accountStatus === "active" ? "success" : "danger"}
                    >
                      {u.accountStatus}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="light"
                      color={u.accountStatus === "active" ? "danger" : "success"}
                      onPress={() => toggleAccountStatus(u.uid, u.accountStatus)}
                    >
                      {u.accountStatus === "active" ? "Suspend" : "Activate"}
                    </Button>
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

