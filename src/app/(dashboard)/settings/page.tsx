"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Shield, UserCheck, UserX, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/auth-provider";

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  approved: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/users", {
        headers: { "x-user-email": user?.email || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.email, toast]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [isAdmin, router, fetchUsers]);

  async function handleApprove(email: string) {
    setActionLoading(email);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-email": user?.email || "" },
        body: JSON.stringify({ email, approved: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Approved", description: `${email} has been approved.` });
      await fetchUsers();
    } catch {
      toast({ title: "Error", description: "Failed to approve user.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke(email: string) {
    setActionLoading(email);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-email": user?.email || "" },
        body: JSON.stringify({ email, approved: false }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Revoked", description: `${email} access has been revoked.` });
      await fetchUsers();
    } catch {
      toast({ title: "Error", description: "Failed to revoke access.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(email: string) {
    setActionLoading(email);
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-user-email": user?.email || "" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Removed", description: `${email} has been removed.` });
      await fetchUsers();
    } catch {
      toast({ title: "Error", description: "Failed to remove user.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Settings</h1>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Settings</h1>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-yellow-600" />
            Pending Approvals
            {pendingUsers.length > 0 && (
              <Badge variant="warning" className="ml-2">{pendingUsers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{u.displayName || u.email}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(u.email)}
                      disabled={actionLoading === u.email}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(u.email)}
                      disabled={actionLoading === u.email}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Approved Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved users yet.</p>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{u.displayName || u.email}</p>
                        {u.role === "admin" && (
                          <Badge className="bg-[#1e3a5f]">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(u.email)}
                        disabled={actionLoading === u.email}
                      >
                        Revoke
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(u.email)}
                        disabled={actionLoading === u.email}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
