import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, GraduationCap, Pencil, MapPin, Phone, Mail, Globe } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import SchoolFormDialog from "@/components/schools/SchoolFormDialog";
import { SCHOOL_HASHKAFAS, SCHOOL_TYPES } from "@/lib/constants";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";

export default function Schools() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "schools.write");

  const [search, setSearch] = useState("");
  const [hashkafa, setHashkafa] = useState("all");
  const [type, setType] = useState("all");
  const [grade, setGrade] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSchool, setEditSchool] = useState(null);
  const [viewSchool, setViewSchool] = useState(null);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools"], queryFn: () => base44.entities.School.list("-created_date", 1000),
  });
  const { data: placements = [] } = useQuery({
    queryKey: ["placements"], queryFn: () => base44.entities.Placement.list("-created_date", 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.School.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schools"] }); toast.success("School added"); },
    onError: () => toast.error("Failed to add"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.School.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schools"] }); toast.success("School updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const filtered = useMemo(() => schools.filter((s) => {
    if (search && !`${s.name} ${s.location || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (hashkafa !== "all" && s.hashkafa !== hashkafa) return false;
    if (type !== "all" && s.type !== type) return false;
    if (grade && !(s.grade_range || "").toLowerCase().includes(grade.toLowerCase())) return false;
    return true;
  }), [schools, search, hashkafa, type, grade]);

  const schoolPlacements = viewSchool ? placements.filter((p) => p.school_id === viewSchool.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} yeshivas</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="w-4 h-4" /> Add School
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={hashkafa} onValueChange={setHashkafa}>
          <SelectTrigger><SelectValue placeholder="Hashkafa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hashkafas</SelectItem>
            {SCHOOL_HASHKAFAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SCHOOL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Grade (e.g. 5th)" value={grade} onChange={(e) => setGrade(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No schools found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} onClick={() => setViewSchool(s)} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/50 transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.type || "—"}{s.location ? ` · ${s.location}` : ""}</p>
                </div>
                {canWrite && (
                  <button onClick={(e) => { e.stopPropagation(); setEditSchool(s); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.hashkafa && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{s.hashkafa}</Badge>}
                {s.grade_range && <Badge variant="outline" className="text-[10px]">{s.grade_range}</Badge>}
                {s.accepts_special_needs && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Special Needs</Badge>}
                {s.boarding && <Badge variant="outline" className="text-[10px]">Boarding</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!viewSchool} onOpenChange={() => setViewSchool(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {viewSchool && (
            <>
              <SheetHeader><SheetTitle>{viewSchool.name}</SheetTitle></SheetHeader>
              <div className="py-4 space-y-2 text-sm text-gray-600">
                {viewSchool.hashkafa && <p><span className="text-gray-400">Hashkafa:</span> {viewSchool.hashkafa}</p>}
                {viewSchool.type && <p><span className="text-gray-400">Type:</span> {viewSchool.type}</p>}
                {viewSchool.grade_range && <p><span className="text-gray-400">Grades:</span> {viewSchool.grade_range}</p>}
                {viewSchool.tuition_range && <p><span className="text-gray-400">Tuition:</span> {viewSchool.tuition_range}</p>}
                {viewSchool.class_size != null && viewSchool.class_size !== "" && <p><span className="text-gray-400">Class size:</span> {viewSchool.class_size}</p>}
                {viewSchool.environment_type && <p><span className="text-gray-400">Environment:</span> {viewSchool.environment_type}</p>}
                {viewSchool.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {viewSchool.address}</p>}
                {viewSchool.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {viewSchool.phone}</p>}
                {viewSchool.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {viewSchool.email}</p>}
                {viewSchool.website && <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> {viewSchool.website}</p>}
                {viewSchool.contact_person && <p><span className="text-gray-400">Contact:</span> {viewSchool.contact_person}</p>}
                {viewSchool.specialties?.length > 0 && <p><span className="text-gray-400">Specialties:</span> {viewSchool.specialties.join(", ")}</p>}
                {viewSchool.description && <p className="pt-2 border-t border-gray-50">{viewSchool.description}</p>}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">Placements ({schoolPlacements.length})</h3>
                {schoolPlacements.length === 0 ? (
                  <p className="text-sm text-gray-400">No placements at this school yet.</p>
                ) : (
                  <div className="space-y-2">
                    {schoolPlacements.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{p.client_name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canWrite && (
                <Button className="mt-4 gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => { setEditSchool(viewSchool); setViewSchool(null); }}>
                  <Pencil className="w-4 h-4" /> Edit School
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <SchoolFormDialog open={showForm} onOpenChange={setShowForm} onSave={(data) => createMutation.mutateAsync(data)} />
      <SchoolFormDialog open={!!editSchool} onOpenChange={() => setEditSchool(null)} school={editSchool} onSave={(data) => updateMutation.mutateAsync({ id: editSchool.id, data })} />
    </div>
  );
}
