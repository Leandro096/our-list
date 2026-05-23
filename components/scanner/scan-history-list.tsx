"use client";

import { useState, useMemo } from "react";
import {
  Input,
  Badge,
  Table,
  Select,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  SelectItem,
  SelectValue,
  TableHeader,
  SelectContent,
  SelectTrigger,
} from "@/components/ui";
import { format } from "date-fns";
import { Search, ScanLine } from "lucide-react";
import type { ScanHistoryItem } from "@/services";

interface ScanHistoryListProps {
  scanLogs: ScanHistoryItem[];
}

export function ScanHistoryList({ scanLogs }: ScanHistoryListProps) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [duplicateFilter, setDuplicateFilter] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return scanLogs.filter((log) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        search === "" ||
        log.guests?.first_name?.toLowerCase().includes(searchLower) ||
        log.guests?.last_name?.toLowerCase().includes(searchLower) ||
        log.users?.display_name?.toLowerCase().includes(searchLower);

      const matchesEvent =
        eventFilter === "all" || log.event_type === eventFilter;
      const matchesDuplicate =
        duplicateFilter === "all" ||
        (duplicateFilter === "duplicate" && log.is_duplicate) ||
        (duplicateFilter === "unique" && !log.is_duplicate);

      return matchesSearch && matchesEvent && matchesDuplicate;
    });
  }, [scanLogs, search, eventFilter, duplicateFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by guest or staff name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="ceremony">Ceremony</SelectItem>
            <SelectItem value="reception">Reception</SelectItem>
          </SelectContent>
        </Select>
        <Select value={duplicateFilter} onValueChange={setDuplicateFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scans</SelectItem>
            <SelectItem value="unique">First Scans</SelectItem>
            <SelectItem value="duplicate">Duplicates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {scanLogs.length} scans
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="hidden md:table-cell">Scanned By</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No scans found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          log.is_duplicate ? "bg-destructive/10" : "bg-sage/10"
                        }`}
                      >
                        <ScanLine
                          className={`h-4 w-4 ${
                            log.is_duplicate ? "text-destructive" : "text-sage"
                          }`}
                        />
                      </div>
                      <span className="font-medium">
                        {log.guests?.first_name} {log.guests?.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.event_type === "ceremony" ? "Ceremony" : "Reception"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {log.users?.display_name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(log.scanned_at), "MMM d, yyyy")}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(log.scanned_at), "h:mm a")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.is_duplicate ? (
                      <Badge variant="destructive" className="text-xs">
                        Duplicate
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-sage text-xs">
                        First Scan
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
