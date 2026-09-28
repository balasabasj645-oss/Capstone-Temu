// web/src/pages/FaceBypassRequests.jsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Pagination } from "../components/ui/Pagination";
import {
  getFaceBypassRequests,
  approveFaceBypass,
  rejectFaceBypass,
} from "../services/api";
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Fingerprint,
  Search,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

const STATUS_META = {
  pending: {
    cls: "bg-[#FBF1DC] text-[#92600A]",
    label: "PENDING",
    Icon: Clock,
  },
  approved: {
    cls: "bg-[#E5F2EA] text-[#1E8449]",
    label: "APPROVED",
    Icon: CheckCircle,
  },
  used: {
    cls: "bg-[#E9ECF2] text-[#16233F]",
    label: "USED",
    Icon: Fingerprint,
  },
  rejected: {
    cls: "bg-[#FBE7E9] text-[#C8202F]",
    label: "REJECTED",
    Icon: XCircle,
  },
  expired: {
    cls: "bg-[#F1F5F9] text-[#64748B]",
    label: "EXPIRED",
    Icon: XCircle,
  },
};

const getDataArray = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data?.data && Array.isArray(response.data.data))
    return response.data.data;
  if (response.data && Array.isArray(response.data)) return response.data;
  return [];
};

const getMeta = (response) => {
  if (!response) return { current_page: 1, last_page: 1, total: 0 };
  const d = response.data ?? response;
  return {
    current_page: d.current_page ?? 1,
    last_page: d.last_page ?? 1,
    total: d.total ?? 0,
    per_page: d.per_page ?? ITEMS_PER_PAGE,
  };
};

const statusBadge = (status) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${meta.cls}`}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

const FaceBypassRequests = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // "approve" | "reject"
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionError, setDecisionError] = useState("");

  const { data: requestsRes, isLoading, refetch, error } = useQuery({
    queryKey: ["face-bypass-requests", page, statusFilter],
    queryFn: () =>
      getFaceBypassRequests(page, ITEMS_PER_PAGE, {
        status: statusFilter || undefined,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 30,
  });

  const requests = getDataArray(requestsRes);
  const meta = getMeta(requestsRes);

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => approveFaceBypass(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(["face-bypass-requests"]);
      closeDecision();
      alert("Bypass approved.");
    },
    onError: (err) => {
      setDecisionError(
        err?.response?.data?.message || "Failed to approve request.",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => rejectFaceBypass(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(["face-bypass-requests"]);
      closeDecision();
      alert("Bypass rejected.");
    },
    onError: (err) => {
      setDecisionError(
        err?.response?.data?.message || "Failed to reject request.",
      );
    },
  });

  const openDecision = (request, action) => {
    setDecisionTarget(request);
    setDecisionAction(action);
    setDecisionNotes("");
    setDecisionError("");
  };

  const closeDecision = () => {
    setDecisionTarget(null);
    setDecisionAction(null);
    setDecisionNotes("");
    setDecisionError("");
  };

  const submitDecision = () => {
    if (!decisionTarget || !decisionAction) return;
    setDecisionError("");

    if (decisionAction === "reject" && !decisionNotes.trim()) {
      setDecisionError("A reason is required when rejecting.");
      return;
    }

    const payload = {
      id: decisionTarget.bypass_id,
      notes: decisionNotes.trim() || undefined,
    };
    if (decisionAction === "approve") approveMutation.mutate(payload);
    else rejectMutation.mutate(payload);
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const name = `${r.enforcer?.firstname || ""} ${
      r.enforcer?.lastname || ""
    }`.toLowerCase();
    return (
      name.includes(q) ||
      (r.enforcer?.email || "").toLowerCase().includes(q) ||
      String(r.bypass_id).includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-['Oswald'] font-semibold text-[#16233F]">
            Face Bypass Requests
          </h1>
          <p className="text-[#64748B] font-['Inter'] text-sm mt-1">
            Review fingerprint bypass requests from enforcers who failed face
            verification.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-[#1E8449]/30 text-[#1E8449] hover:bg-[#E5F2EA]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#64748B]">
                Status:
              </span>
              {["pending", "approved", "used", "rejected", ""].map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-[#16233F] text-white"
                      : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  }`}
                >
                  {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input
                placeholder="Search enforcer…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-72 focus-visible:ring-[#F0B429]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-['Oswald'] font-medium text-[#16233F]">
            Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && !requestsRes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#16233F]" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-[#C8202F]">
              Failed to load requests.
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Fingerprint className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
              <p className="text-[#64748B]">No requests match this view.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#E9ECF2] hover:bg-[#E9ECF2]">
                    <TableHead className="font-semibold text-[#16233F]">
                      Enforcer
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F]">
                      Type
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F]">
                      Reason
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F]">
                      Requested
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F]">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F]">
                      Reviewed by
                    </TableHead>
                    <TableHead className="font-semibold text-[#16233F] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((r) => (
                    <TableRow key={r.bypass_id} className="hover:bg-[#F8F9FA]">
                      <TableCell>
                        <div className="text-sm font-medium text-[#1F2937]">
                          {r.enforcer?.firstname} {r.enforcer?.lastname}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {r.enforcer?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase font-semibold text-[#16233F]">
                          Time {r.request_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#475569] max-w-[220px]">
                        <span className="line-clamp-2">
                          {r.reason || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#475569]">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-[#475569]">
                        {r.reviewer
                          ? `${r.reviewer.firstname} ${r.reviewer.lastname}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => openDecision(r, "approve")}
                              className="bg-[#1E8449] hover:bg-[#186B3B]"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDecision(r, "reject")}
                              className="border-[#C8202F]/30 text-[#C8202F] hover:bg-[#FBE7E9]"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-2 border-t">
                <Pagination
                  currentPage={meta.current_page}
                  totalPages={meta.last_page}
                  onPageChange={setPage}
                  totalItems={meta.total}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Decision dialog */}
      <Dialog
        open={!!decisionTarget}
        onOpenChange={(open) => !open && closeDecision()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Oswald'] text-[#16233F] flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              {decisionAction === "approve" ? "Approve" : "Reject"} Bypass
            </DialogTitle>
          </DialogHeader>

          {decisionTarget && (
            <div className="space-y-4">
              <div className="bg-[#F8F9FA] rounded-lg p-3 border border-[#E9ECF2] text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Enforcer</span>
                  <span className="font-medium text-[#1F2937]">
                    {decisionTarget.enforcer?.firstname}{" "}
                    {decisionTarget.enforcer?.lastname}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[#64748B]">Type</span>
                  <span className="font-medium text-[#1F2937]">
                    Time {decisionTarget.request_type}
                  </span>
                </div>
                {decisionTarget.reason ? (
                  <div className="mt-2 pt-2 border-t border-[#E9ECF2]">
                    <p className="text-[#64748B] text-xs mb-1">
                      Enforcer's reason
                    </p>
                    <p className="text-[#1F2937] text-sm">
                      {decisionTarget.reason}
                    </p>
                  </div>
                ) : null}
              </div>

              {decisionError ? (
                <div className="bg-[#FBE7E9] text-[#C8202F] p-3 rounded-md text-sm">
                  {decisionError}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium mb-1 block text-[#1F2937]">
                  {decisionAction === "reject" ? "Reason *" : "Notes (optional)"}
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-[#F0B429]"
                  placeholder={
                    decisionAction === "reject"
                      ? "Explain why this request is being rejected..."
                      : "Any notes for the enforcer..."
                  }
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeDecision}
                  disabled={
                    approveMutation.isPending || rejectMutation.isPending
                  }
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${
                    decisionAction === "approve"
                      ? "bg-[#1E8449] hover:bg-[#186B3B]"
                      : "bg-[#C8202F] hover:bg-[#A01622]"
                  }`}
                  onClick={submitDecision}
                  disabled={
                    approveMutation.isPending || rejectMutation.isPending
                  }
                >
                  {approveMutation.isPending || rejectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : decisionAction === "approve" ? (
                    "Confirm Approval"
                  ) : (
                    "Confirm Rejection"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaceBypassRequests;