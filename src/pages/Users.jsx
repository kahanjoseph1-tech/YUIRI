import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users as UsersIcon } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { getEffectiveRole } from "@/lib/roles";

export default function Users() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"], queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, crm_role }) => base44.entities.User.update(id, { crm_role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Role updated"); },
    onError: () => toast.error("Failed to update role"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage team members and roles</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Platform Role</TableHead>
                <TableHead className="w-48">CRM Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-gray-900">{u.full_name || u.name || "—"}</TableCell>
                  <TableCell className="text-gray-500">{u.email}</TableCell>
                  <TableCell className="text-gray-400">{u.role || "user"}</TableCell>
                  <TableCell>
                    <Select
                      value={getEffectiveRole(u)}
                      onValueChange={(crm_role) => updateRole.mutate({ id: u.id, crm_role })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
