"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Microscope,
  TestTube2,
  FileSpreadsheet,
  Building2,
  Search,
  Plus,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Download,
  SlidersHorizontal,
  ClipboardCheck,
  UserCog,
  ArrowUpRight,
  Layers,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "researcher" | "lab_assistant" | "supervisor" | "admin";

interface CurrentUser {
  user_id: string;
  email: string;
  full_name: string;
  role: Role;
  department_id: number;
  department_name: string;
}

interface LabWorkbenchProps {
  currentUser: CurrentUser;
  initialData: {
    departments: any[];
    laboratories: any[];
    projects: any[];
    experiments: any[];
    samples: any[];
    sampleLogs: any[];
    results: any[];
    equipment: any[];
    expEquipment: any[];
    profiles: any[];
  };
}

type TabKey =
  | "dashboard"
  | "experiments"
  | "equipment"
  | "samples"
  | "reports"
  | "governance";

export default function LabWorkbench({
  currentUser,
  initialData,
}: LabWorkbenchProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  // Live Stateful Data (synced with Supabase)
  const [departments, setDepartments] = useState(initialData.departments);
  const [laboratories, setLaboratories] = useState(initialData.laboratories);
  const [projects, setProjects] = useState(initialData.projects);
  const [experiments, setExperiments] = useState(initialData.experiments);
  const [samples, setSamples] = useState(initialData.samples);
  const [sampleLogs, setSampleLogs] = useState(initialData.sampleLogs);
  const [results, setResults] = useState(initialData.results);
  const [equipment, setEquipment] = useState(initialData.equipment);
  const [expEquipment, setExpEquipment] = useState(initialData.expEquipment);
  const [profiles, setProfiles] = useState(initialData.profiles);

  // Selected Experiment in Drawer
  const [selectedExpId, setSelectedExpId] = useState<number | null>(
    initialData.experiments[0]?.experiment_id ?? null
  );

  // Modals
  const [showNewExpModal, setShowNewExpModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewSampleModal, setShowNewSampleModal] = useState(false);
  const [showNewEquipModal, setShowNewEquipModal] = useState(false);

  // Filters
  const [expStatusFilter, setExpStatusFilter] = useState("ALL");
  const [equipStatusFilter, setEquipStatusFilter] = useState("ALL");
  const [sampleStatusFilter, setSampleStatusFilter] = useState("ALL");
  const [reportProjectFilter, setReportProjectFilter] = useState("ALL");

  // Role Permissions (Section 3.5 & 3.14)
  const canWriteExperiments = ["researcher", "supervisor", "admin"].includes(
    currentUser.role
  );
  const canManageSamples = ["researcher", "lab_assistant", "admin"].includes(
    currentUser.role
  );
  const canRecordResults = ["researcher", "admin"].includes(currentUser.role);
  const canManageEquipment = ["lab_assistant", "researcher", "admin"].includes(
    currentUser.role
  );
  const canReviewExperiments = ["supervisor", "admin"].includes(
    currentUser.role
  );
  const isAdmin = currentUser.role === "admin";

  function notify(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const selectedExperiment = useMemo(
    () =>
      experiments.find((e) => e.experiment_id === selectedExpId) ||
      experiments[0] ||
      null,
    [experiments, selectedExpId]
  );

  // Filtered Lists
  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      const q = globalSearch.toLowerCase();
      const matchesQuery =
        !q ||
        exp.experiment_code?.toLowerCase().includes(q) ||
        exp.experiment_title?.toLowerCase().includes(q) ||
        exp.laboratories?.laboratory_name?.toLowerCase().includes(q);
      const matchesStatus =
        expStatusFilter === "ALL" || exp.status === expStatusFilter;
      const matchesDept =
        selectedDeptFilter === "ALL" ||
        String(exp.laboratories?.department_id) === selectedDeptFilter;
      return matchesQuery && matchesStatus && matchesDept;
    });
  }, [experiments, globalSearch, expStatusFilter, selectedDeptFilter]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      const q = globalSearch.toLowerCase();
      const matchesQuery =
        !q ||
        item.equipment_name?.toLowerCase().includes(q) ||
        item.asset_tag?.toLowerCase().includes(q) ||
        item.laboratories?.laboratory_name?.toLowerCase().includes(q);
      const matchesStatus =
        equipStatusFilter === "ALL" ||
        item.availability_status === equipStatusFilter;
      const matchesDept =
        selectedDeptFilter === "ALL" ||
        String(item.laboratories?.department_id) === selectedDeptFilter;
      return matchesQuery && matchesStatus && matchesDept;
    });
  }, [equipment, globalSearch, equipStatusFilter, selectedDeptFilter]);

  const filteredSamples = useMemo(() => {
    return samples.filter((smp) => {
      const q = globalSearch.toLowerCase();
      const matchesQuery =
        !q ||
        smp.sample_code?.toLowerCase().includes(q) ||
        smp.sample_name?.toLowerCase().includes(q) ||
        smp.sample_type?.toLowerCase().includes(q) ||
        smp.storage_location?.toLowerCase().includes(q);
      const matchesStatus =
        sampleStatusFilter === "ALL" || smp.sample_status === sampleStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [samples, globalSearch, sampleStatusFilter]);

  // --- MUTATIONS ---

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canWriteExperiments) {
      notify("err", "Access denied: Your role cannot create research projects.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const project_title = String(fd.get("project_title") || "").trim();
    const supervisor_id = String(fd.get("supervisor_id") || currentUser.user_id);
    const start_date =
      String(fd.get("start_date") || "") ||
      new Date().toISOString().slice(0, 10);

    if (!project_title) return;

    const { data, error } = await supabase
      .from("research_projects")
      .insert({
        project_title,
        researcher_id: currentUser.user_id,
        supervisor_id,
        start_date,
        status: "Active",
      })
      .select(
        "*, researcher:profiles!research_projects_researcher_id_fkey(full_name), supervisor:profiles!research_projects_supervisor_id_fkey(full_name)"
      )
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }
    setProjects((prev) => [data, ...prev]);
    setShowNewProjectModal(false);
    notify("ok", `Research project "${project_title}" created.`);
  }

  async function handleCreateExperiment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canWriteExperiments) {
      notify("err", "Access denied: Role not permitted to record experiments.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const experiment_title = String(fd.get("experiment_title") || "").trim();
    const project_id = Number(fd.get("project_id"));
    const laboratory_id = Number(fd.get("laboratory_id"));
    const experiment_date =
      String(fd.get("experiment_date") || "") ||
      new Date().toISOString().slice(0, 10);
    const procedure = String(fd.get("procedure") || "").trim();
    const reagent_notes = String(fd.get("reagent_notes") || "").trim();
    const equipment_id = fd.get("equipment_id")
      ? Number(fd.get("equipment_id"))
      : null;

    if (!experiment_title || !project_id || !laboratory_id || !procedure) {
      notify("err", "Please complete all required experiment fields.");
      return;
    }

    const randomCode = `EXP-${new Date().getFullYear()}-${Math.floor(
      100 + Math.random() * 899
    )}`;

    const { data, error } = await supabase
      .from("experiments")
      .insert({
        experiment_code: randomCode,
        project_id,
        laboratory_id,
        created_by: currentUser.user_id,
        experiment_title,
        experiment_date,
        procedure,
        reagent_notes: reagent_notes || null,
        status: "Ongoing",
      })
      .select(
        "*, research_projects(project_title), laboratories(laboratory_name, department_id, departments(department_name)), creator:profiles!experiments_created_by_fkey(full_name)"
      )
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }

    if (equipment_id) {
      const { data: linkData } = await supabase
        .from("experiment_equipment")
        .insert({
          experiment_id: data.experiment_id,
          equipment_id,
          usage_notes: "Allocated during experiment registration",
        })
        .select("*, equipment(equipment_name, asset_tag)")
        .single();

      if (linkData) {
        setExpEquipment((prev) => [linkData, ...prev]);
      }
    }

    setExperiments((prev) => [data, ...prev]);
    setSelectedExpId(data.experiment_id);
    setShowNewExpModal(false);
    setActiveTab("experiments");
    notify("ok", `Experiment ${randomCode} logged successfully.`);
  }

  async function handleUpdateExperimentStatus(
    experimentId: number,
    status: string,
    supervisorRemarks?: string
  ) {
    const payload: Record<string, any> = { status };
    if (supervisorRemarks !== undefined) {
      payload.supervisor_remarks = supervisorRemarks;
    }

    const { data, error } = await supabase
      .from("experiments")
      .update(payload)
      .eq("experiment_id", experimentId)
      .select(
        "*, research_projects(project_title), laboratories(laboratory_name, department_id, departments(department_name)), creator:profiles!experiments_created_by_fkey(full_name)"
      )
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }
    setExperiments((prev) =>
      prev.map((item) => (item.experiment_id === experimentId ? data : item))
    );
    notify("ok", `Experiment updated to "${status}".`);
  }

  async function handleAddResult(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedExperiment || !canRecordResults) {
      notify("err", "Only Researchers or Admins can certify results.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const observation = String(fd.get("observation") || "").trim();
    const result_value = String(fd.get("result_value") || "").trim();
    if (!observation || !result_value) return;

    const { data, error } = await supabase
      .from("results")
      .insert({
        experiment_id: selectedExperiment.experiment_id,
        recorded_by: currentUser.user_id,
        observation,
        result_value,
      })
      .select("*, profiles(full_name), experiments(experiment_code)")
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }

    setResults((prev) => [data, ...prev]);
    (e.target as HTMLFormElement).reset();
    notify("ok", "Experimental observation certified and logged.");
  }

  async function handleRegisterSample(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManageSamples) {
      notify("err", "Access denied: Role cannot register samples.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const experiment_id = Number(fd.get("experiment_id"));
    const sample_name = String(fd.get("sample_name") || "").trim();
    const sample_type = String(fd.get("sample_type") || "").trim();
    const storage_location =
      String(fd.get("storage_location") || "").trim() || "Central Receiving";
    const collection_date =
      String(fd.get("collection_date") || "") ||
      new Date().toISOString().slice(0, 10);

    if (!experiment_id || !sample_name || !sample_type) {
      notify("err", "Fill all required sample registration fields.");
      return;
    }

    const sample_code = `SMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from("samples")
      .insert({
        sample_code,
        experiment_id,
        sample_name,
        sample_type,
        storage_location,
        collection_date,
        sample_status: "Registered",
      })
      .select("*, experiments(experiment_code, experiment_title)")
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }

    const { data: logRow } = await supabase
      .from("sample_audit_logs")
      .insert({
        sample_id: data.sample_id,
        changed_by: currentUser.user_id,
        action_summary: `Sample ${sample_code} registered at ${storage_location}`,
        previous_location: null,
        new_location: storage_location,
        previous_status: null,
        new_status: "Registered",
      })
      .select("*, profiles(full_name)")
      .single();

    setSamples((prev) => [data, ...prev]);
    if (logRow) setSampleLogs((prev) => [logRow, ...prev]);
    setShowNewSampleModal(false);
    notify("ok", `Sample ${sample_code} registered & added to custody log.`);
  }

  async function handleUpdateSampleCustody(
    sample: any,
    newStatus: string,
    newLocation: string
  ) {
    if (!canManageSamples) {
      notify("err", "Access denied: Role cannot modify sample custody.");
      return;
    }
    const { data, error } = await supabase
      .from("samples")
      .update({
        sample_status: newStatus,
        storage_location: newLocation,
        updated_at: new Date().toISOString(),
      })
      .eq("sample_id", sample.sample_id)
      .select("*, experiments(experiment_code, experiment_title)")
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }

    const { data: logRow } = await supabase
      .from("sample_audit_logs")
      .insert({
        sample_id: sample.sample_id,
        changed_by: currentUser.user_id,
        action_summary: `${sample.sample_code}: ${sample.sample_status} → ${newStatus} (${newLocation})`,
        previous_location: sample.storage_location,
        new_location: newLocation,
        previous_status: sample.sample_status,
        new_status: newStatus,
      })
      .select("*, profiles(full_name)")
      .single();

    setSamples((prev) =>
      prev.map((s) => (s.sample_id === sample.sample_id ? data : s))
    );
    if (logRow) setSampleLogs((prev) => [logRow, ...prev]);
    notify("ok", `Updated ${sample.sample_code} custody trail.`);
  }

  async function handleAddEquipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManageEquipment) {
      notify("err", "Access denied: Role cannot register equipment.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const equipment_name = String(fd.get("equipment_name") || "").trim();
    const asset_tag = String(fd.get("asset_tag") || "").trim();
    const laboratory_id = Number(fd.get("laboratory_id"));
    const availability_status = String(
      fd.get("availability_status") || "Available"
    );

    if (!equipment_name || !laboratory_id) return;

    const { data, error } = await supabase
      .from("equipment")
      .insert({
        equipment_name,
        asset_tag: asset_tag || `UI-EQ-${Math.floor(100 + Math.random() * 899)}`,
        laboratory_id,
        availability_status,
      })
      .select(
        "*, laboratories(laboratory_name, department_id, departments(department_name))"
      )
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }

    setEquipment((prev) => [...prev, data]);
    setShowNewEquipModal(false);
    notify("ok", `Instrument "${equipment_name}" added to registry.`);
  }

  async function handleUpdateEquipmentStatus(
    equipmentId: number,
    availability_status: string
  ) {
    if (!canManageEquipment) {
      notify("err", "Access denied: Role cannot update equipment status.");
      return;
    }
    const { data, error } = await supabase
      .from("equipment")
      .update({ availability_status })
      .eq("equipment_id", equipmentId)
      .select(
        "*, laboratories(laboratory_name, department_id, departments(department_name))"
      )
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }
    setEquipment((prev) =>
      prev.map((eq) => (eq.equipment_id === equipmentId ? data : eq))
    );
    notify("ok", `Instrument status set to "${availability_status}".`);
  }

  async function handleUpdateUserRole(targetUserId: string, newRole: Role) {
    if (!isAdmin) {
      notify("err", "TC07 Blocked: Administrator privileges required.");
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", targetUserId)
      .select("*, departments(department_name)")
      .single();

    if (error) {
      notify("err", error.message);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.user_id === targetUserId ? data : p))
    );
    notify("ok", `Updated user role to ${newRole.toUpperCase()}.`);
  }

  function handleExportCsv() {
    const rows = [
      [
        "Experiment Code",
        "Title",
        "Project",
        "Laboratory",
        "Date",
        "Status",
        "Samples Count",
        "Results Count",
      ],
      ...experiments.map((exp) => [
        exp.experiment_code,
        `"${(exp.experiment_title || "").replace(/"/g, '""')}"`,
        `"${(exp.research_projects?.project_title || "").replace(/"/g, '""')}"`,
        `"${(exp.laboratories?.laboratory_name || "").replace(/"/g, '""')}"`,
        exp.experiment_date,
        exp.status,
        samples.filter((s) => s.experiment_id === exp.experiment_id).length,
        results.filter((r) => r.experiment_id === exp.experiment_id).length,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UI-FOS-Lab-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("ok", "Laboratory report CSV exported.");
  }

  // Status Badge Helper
  function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (["available", "completed", "reviewed", "stored"].includes(s)) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (["ongoing", "in use", "in process", "active"].includes(s)) {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }
    if (["paused", "under maintenance", "disposed"].includes(s)) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  // Metrics
  const availableEquipCount = equipment.filter(
    (e) => e.availability_status === "Available"
  ).length;
  const maintenanceEquipCount = equipment.filter(
    (e) => e.availability_status === "Under Maintenance"
  ).length;
  const operationalRate = equipment.length
    ? Math.round(
        ((equipment.length - maintenanceEquipCount) / equipment.length) * 100
      )
    : 100;

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] text-slate-900">
      {/* LEFT DARK NAVY INSTITUTIONAL SIDEBAR */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between bg-[#081a30] text-slate-200 lg:flex">
        <div>
          {/* Institution Header */}
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/15 text-sky-300">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                  EST. 1948 • IBADAN
                </p>
                <h1 className="text-sm font-bold text-white">
                  Faculty of Science
                </h1>
                <p className="text-[10px] tracking-wider text-slate-400">
                  LAB EXPERIMENT TRACKING SYSTEM
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-6 px-3 py-5">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Core Registry
              </p>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "dashboard"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-sky-300" />
                  <span>Dashboard Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab("experiments")}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "experiments"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 text-sky-300" />
                    <span>Projects &amp; Experiments</span>
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                    {experiments.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("equipment")}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "equipment"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Microscope className="h-4 w-4 text-sky-300" />
                    <span>Equipment Registry</span>
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                    {equipment.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("samples")}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "samples"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <TestTube2 className="h-4 w-4 text-sky-300" />
                    <span>Sample Custody</span>
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                    {samples.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("reports")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "reports"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-sky-300" />
                  <span>Results &amp; Reports</span>
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Governance &amp; RBAC
              </p>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setActiveTab("governance")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                    activeTab === "governance"
                      ? "bg-[#132f57] font-semibold text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Building2 className="h-4 w-4 text-sky-300" />
                  <span>Departments, Labs &amp; Users</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Node Status */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              UI CENTRAL NODE
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">
              SECURE V2.6.1 • SUPABASE SYNC
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP HEADER BAR */}
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          {/* Search Input */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search protocols, sample IDs (SMP-...), equipment..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-[#0B1F3A] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Department Selector + Active User Profile */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0B1F3A] focus:outline-none"
              aria-label="Filter by Department"
            >
              <option value="ALL">All Faculty Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={String(d.department_id)}>
                  Dept. of {d.department_name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">
                  {currentUser.full_name}
                </p>
                <span className="inline-block rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-sky-800">
                  {currentUser.role.replace("_", " ")} •{" "}
                  {currentUser.department_name}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Nav Bar */}
        <div className="no-print flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {(
            [
              ["dashboard", "Dashboard"],
              ["experiments", "Experiments"],
              ["equipment", "Equipment"],
              ["samples", "Samples"],
              ["reports", "Reports"],
              ["governance", "Admin / Labs"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === key
                  ? "bg-[#0B1F3A] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`no-print mx-5 mt-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-xs font-medium ${
              toast.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* WORKSPACE CANVAS */}
        <main className="flex-1 p-5 lg:p-7">
          {/* ============================================================
              TAB 1: DASHBOARD OVERVIEW
          ============================================================ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Top Title Banner */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    FACULTY OF SCIENCE • CENTRAL LABORATORY REGISTRY
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Research &amp; Laboratory Operations Overview
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Unified sample custody, experiment provenance, and
                    departmental instrument tracking across University of Ibadan
                    laboratories.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canManageSamples && (
                    <button
                      onClick={() => setShowNewSampleModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <TestTube2 className="h-3.5 w-3.5 text-sky-600" />
                      Register Sample
                    </button>
                  )}
                  {canWriteExperiments && (
                    <button
                      onClick={() => setShowNewExpModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#132f57]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Experiment
                    </button>
                  )}
                </div>
              </div>

              {/* 4 KPI Cards (Styled like equipment-register.jpg) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 tabular-nums">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Active Experiments
                    </span>
                    <FlaskConical className="h-4 w-4 text-sky-600" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {experiments.length}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {experiments.filter((e) => e.status === "Ongoing").length}{" "}
                    Ongoing •{" "}
                    {experiments.filter((e) => e.status === "Completed").length}{" "}
                    Completed
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Tracked Samples
                    </span>
                    <TestTube2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {samples.length}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {samples.filter((s) => s.sample_status === "Stored").length}{" "}
                    Stored •{" "}
                    {
                      samples.filter((s) => s.sample_status === "In Process")
                        .length
                    }{" "}
                    In Process
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Equipment Readiness
                    </span>
                    <Microscope className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {operationalRate}%
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {availableEquipCount} Available of {equipment.length}{" "}
                    instruments
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Certified Results
                    </span>
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {results.length}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Across {projects.length} registered research projects
                  </p>
                </div>
              </div>

              {/* Recent Experiments + Recent Sample Custody */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Recent Laboratory Experiments
                      </h3>
                      <p className="text-xs text-slate-500">
                        Click any experiment to open its protocol &amp; sample
                        drawer
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("experiments")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                    >
                      View Registry <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {experiments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                      No experiments recorded yet. Click{" "}
                      <strong>New Experiment</strong> to log your first
                      protocol.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {experiments.slice(0, 5).map((exp) => (
                        <div
                          key={exp.experiment_id}
                          onClick={() => {
                            setSelectedExpId(exp.experiment_id);
                            setActiveTab("experiments");
                          }}
                          className="cursor-pointer rounded-lg border border-slate-200/80 p-3.5 transition hover:border-sky-400 hover:bg-slate-50/70"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-sky-800">
                              {exp.experiment_code}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                                exp.status
                              )}`}
                            >
                              {exp.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {exp.experiment_title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {exp.laboratories?.laboratory_name} •{" "}
                            {exp.experiment_date}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Custody & Audit Feed */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Sample Custody &amp; Audit Trail
                      </h3>
                      <p className="text-xs text-slate-500">
                        Timestamped chain-of-custody ledger
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("samples")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                    >
                      Tracker <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {sampleLogs.length === 0 && samples.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                      No sample movements recorded yet. Register a sample to
                      begin tracking.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sampleLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.log_id}
                          className="border-l-2 border-sky-500 pl-3 text-xs"
                        >
                          <p className="font-semibold text-slate-800">
                            {log.action_summary}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            By {log.profiles?.full_name || "Lab Personnel"} •{" "}
                            {new Date(log.logged_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 2: PROJECTS & EXPERIMENTS (Matched to project-and-experiment-management.jpg)
          ============================================================ */}
          {activeTab === "experiments" && (
            <div className="space-y-5">
              {/* Top Project / Registry Banner */}
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#0B1F3A] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      UI-FOS-REGISTRY
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {projects.length} Active Research Projects •{" "}
                      {experiments.length} Logged Experiments
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                    Experiments &amp; Protocol Registry
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Select a protocol from the left registry to inspect
                    procedures, linked instruments, samples, and certified
                    results.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canWriteExperiments && (
                    <>
                      <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <Layers className="h-3.5 w-3.5 text-slate-600" />
                        + New Project
                      </button>
                      <button
                        onClick={() => setShowNewExpModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#132f57]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Experiment
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Split Master-Detail Layout */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Left Registry List */}
                <div className="space-y-4 xl:col-span-7">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Experiments Registry ({filteredExperiments.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["ALL", "Ongoing", "Completed", "Paused", "Reviewed"].map(
                          (st) => (
                            <button
                              key={st}
                              onClick={() => setExpStatusFilter(st)}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                                expStatusFilter === st
                                  ? "bg-[#0B1F3A] text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {st}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {filteredExperiments.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-500">
                          No experiments match the current filter.
                        </p>
                      ) : (
                        filteredExperiments.map((exp) => {
                          const isSelected =
                            selectedExperiment?.experiment_id ===
                            exp.experiment_id;
                          return (
                            <div
                              key={exp.experiment_id}
                              onClick={() =>
                                setSelectedExpId(exp.experiment_id)
                              }
                              className={`cursor-pointer rounded-xl border p-4 transition ${
                                isSelected
                                  ? "border-[#0B1F3A] bg-sky-50/40 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-sky-800">
                                    {exp.experiment_code}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                                      exp.status
                                    )}`}
                                  >
                                    {exp.status}
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-sky-700">
                                  Inspecting in Drawer →
                                </span>
                              </div>

                              <h4 className="mt-1.5 text-sm font-bold text-slate-900">
                                {exp.experiment_title}
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">
                                Project: {exp.research_projects?.project_title}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                                <span>
                                  {exp.laboratories?.laboratory_name}
                                </span>
                                <span>Date: {exp.experiment_date}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Dark-Header Inspection Drawer (Exact Match to Screenshot 3) */}
                <div className="xl:col-span-5">
                  {selectedExperiment ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {/* Dark Navy Drawer Header */}
                      <div className="bg-[#081a30] p-5 text-white">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-sky-300">
                            {selectedExperiment.experiment_code} • ACTIVE LOG
                            DRAWER
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                              selectedExperiment.status
                            )}`}
                          >
                            {selectedExperiment.status}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold leading-snug">
                          {selectedExperiment.experiment_title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-300">
                          {selectedExperiment.laboratories?.laboratory_name} •
                          Started {selectedExperiment.experiment_date}
                        </p>

                        {/* Action Buttons in Drawer */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {canWriteExperiments && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateExperimentStatus(
                                    selectedExperiment.experiment_id,
                                    "Completed"
                                  )
                                }
                                className="rounded bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
                              >
                                Mark Completed
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateExperimentStatus(
                                    selectedExperiment.experiment_id,
                                    "Paused"
                                  )
                                }
                                className="rounded bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
                              >
                                Pause Run
                              </button>
                            </>
                          )}
                          {canReviewExperiments && (
                            <button
                              onClick={() =>
                                handleUpdateExperimentStatus(
                                  selectedExperiment.experiment_id,
                                  "Reviewed",
                                  `Verified & signed off by ${currentUser.full_name}`
                                )
                              }
                              className="rounded bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                            >
                              Supervisor Sign-Off
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Drawer Sections */}
                      <div className="divide-y divide-slate-100 p-5 text-xs">
                        {/* 1. Standard Protocol & Procedure */}
                        <div className="pb-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            1. Standard Protocol &amp; Procedure
                          </p>
                          <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700">
                            {selectedExperiment.procedure}
                          </p>
                          {selectedExperiment.reagent_notes && (
                            <p className="mt-2 text-[11px] text-slate-600">
                              <strong>Reagents / Batches:</strong>{" "}
                              {selectedExperiment.reagent_notes}
                            </p>
                          )}
                          {selectedExperiment.supervisor_remarks && (
                            <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800">
                              ✓ {selectedExperiment.supervisor_remarks}
                            </p>
                          )}
                        </div>

                        {/* 2. Allocated Equipment */}
                        <div className="py-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            2. Allocated Equipment
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {expEquipment.filter(
                              (ee) =>
                                ee.experiment_id ===
                                selectedExperiment.experiment_id
                            ).length === 0 ? (
                              <p className="text-slate-400">
                                No dedicated instruments linked yet.
                              </p>
                            ) : (
                              expEquipment
                                .filter(
                                  (ee) =>
                                    ee.experiment_id ===
                                    selectedExperiment.experiment_id
                                )
                                .map((ee, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
                                  >
                                    <span className="font-semibold text-slate-800">
                                      {ee.equipment?.equipment_name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">
                                      {ee.equipment?.asset_tag}
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* 3. Logged Custody Samples */}
                        <div className="py-4">
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              3. Logged Custody Samples
                            </p>
                            {canManageSamples && (
                              <button
                                onClick={() => setShowNewSampleModal(true)}
                                className="font-semibold text-sky-700 hover:underline"
                              >
                                + Add Specimen
                              </button>
                            )}
                          </div>
                          <div className="mt-2 space-y-2">
                            {samples.filter(
                              (s) =>
                                s.experiment_id ===
                                selectedExperiment.experiment_id
                            ).length === 0 ? (
                              <p className="text-slate-400">
                                No samples linked to this experiment yet.
                              </p>
                            ) : (
                              samples
                                .filter(
                                  (s) =>
                                    s.experiment_id ===
                                    selectedExperiment.experiment_id
                                )
                                .map((smp) => (
                                  <div
                                    key={smp.sample_id}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"
                                  >
                                    <div>
                                      <span className="font-mono font-bold text-sky-800">
                                        {smp.sample_code}
                                      </span>{" "}
                                      <span className="font-semibold text-slate-800">
                                        {smp.sample_name}
                                      </span>
                                      <p className="text-[11px] text-slate-500">
                                        Loc: {smp.storage_location}
                                      </p>
                                    </div>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(
                                        smp.sample_status
                                      )}`}
                                    >
                                      {smp.sample_status}
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* 4. Verified Observation Ledger & Log New Observation */}
                        <div className="pt-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            4. Verified Observation &amp; Result Ledger
                          </p>

                          <div className="mt-2 space-y-2">
                            {results
                              .filter(
                                (r) =>
                                  r.experiment_id ===
                                  selectedExperiment.experiment_id
                              )
                              .map((res) => (
                                <div
                                  key={res.result_id}
                                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                                >
                                  <div className="flex items-center justify-between font-semibold text-slate-900">
                                    <span>{res.observation}</span>
                                    <span className="font-mono text-sky-800">
                                      {res.result_value}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    Recorded by{" "}
                                    {res.profiles?.full_name || "Researcher"} •{" "}
                                    {new Date(res.recorded_at).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                          </div>

                          {canRecordResults && (
                            <form
                              onSubmit={handleAddResult}
                              className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                            >
                              <p className="text-[11px] font-bold text-slate-700">
                                Log New Experimental Observation
                              </p>
                              <input
                                name="observation"
                                required
                                placeholder="Observation / Assay Metric (e.g. A260/A280 Purity Ratio)"
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                              />
                              <input
                                name="result_value"
                                required
                                placeholder="Measured Value & Unit (e.g. 1.87 Optical Density)"
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                              />
                              <button
                                type="submit"
                                className="w-full rounded bg-[#0B1F3A] py-2 text-xs font-semibold text-white hover:bg-[#132f57]"
                              >
                                Submit Result to Ledger
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
                      Create or select an experiment to inspect details.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 3: EQUIPMENT & INSTRUMENT REGISTRY (Matched to equipment-register.jpg)
          ============================================================ */}
          {activeTab === "equipment" && (
            <div className="space-y-6">
              {/* Top Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    REGISTRY SECTION 04 • INFRASTRUCTURE • UI CENTRAL LABS
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Equipment &amp; Instrument Registry
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Faculty central laboratory scientific instrumentation,
                    availability status, and departmental allocation ledger.
                  </p>
                </div>

                {canManageEquipment && (
                  <button
                    onClick={() => setShowNewEquipModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#132f57]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Register New Equipment
                  </button>
                )}
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 tabular-nums">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Scientific Units
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {equipment.length}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Cataloged instruments across Faculty
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Operational Availability
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {operationalRate}%
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {availableEquipCount} ready for immediate allocation
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Currently In Use
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">
                    {
                      equipment.filter(
                        (e) => e.availability_status === "In Use"
                      ).length
                    }
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Active experimental runs
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Maintenance &amp; Calibration
                  </p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">
                    {maintenanceEquipCount}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Scheduled servicing / offline
                  </p>
                </div>
              </div>

              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SlidersHorizontal className="mr-1 h-4 w-4 text-slate-400" />
                  {["ALL", "Available", "In Use", "Under Maintenance"].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setEquipStatusFilter(st)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          equipStatusFilter === st
                            ? "bg-[#0B1F3A] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  Showing {filteredEquipment.length} instruments
                </span>
              </div>

              {/* Equipment Cards Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredEquipment.map((item) => (
                  <div
                    key={item.equipment_id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {item.asset_tag || `EQ-${item.equipment_id}`}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                            item.availability_status
                          )}`}
                        >
                          {item.availability_status}
                        </span>
                      </div>

                      <h3 className="mt-2.5 text-base font-bold text-slate-900">
                        {item.equipment_name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.laboratories?.departments?.department_name} •{" "}
                        {item.laboratories?.laboratory_name}
                      </p>
                    </div>

                    {canManageEquipment && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                          onClick={() =>
                            handleUpdateEquipmentStatus(
                              item.equipment_id,
                              "Available"
                            )
                          }
                          className="rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Set Available
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateEquipmentStatus(
                              item.equipment_id,
                              "In Use"
                            )
                          }
                          className="rounded bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          Check Out (In Use)
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateEquipmentStatus(
                              item.equipment_id,
                              "Under Maintenance"
                            )
                          }
                          className="rounded bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Flag Maintenance
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 4: SAMPLE TRACKER & CUSTODY TRAIL
          ============================================================ */}
          {activeTab === "samples" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    CHAIN OF CUSTODY • UNIQUE SAMPLE IDENTIFIERS
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Laboratory Sample Tracker
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Track sample lifecycle from check-in to storage and analysis
                    with automated audit logging.
                  </p>
                </div>

                {canManageSamples && (
                  <button
                    onClick={() => setShowNewSampleModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#132f57]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Register New Sample
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                {[
                  "ALL",
                  "Registered",
                  "In Transit",
                  "In Process",
                  "Stored",
                  "Disposed",
                ].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSampleStatusFilter(st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      sampleStatusFilter === st
                        ? "bg-[#0B1F3A] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Sample Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Sample ID</th>
                        <th className="px-4 py-3">Specimen Name &amp; Type</th>
                        <th className="px-4 py-3">Linked Experiment</th>
                        <th className="px-4 py-3">Storage Location</th>
                        <th className="px-4 py-3">Status</th>
                        {canManageSamples && (
                          <th className="px-4 py-3">Update Custody</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSamples.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No samples found. Register a sample to begin
                            tracking.
                          </td>
                        </tr>
                      ) : (
                        filteredSamples.map((smp) => (
                          <tr key={smp.sample_id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-bold text-sky-800">
                              {smp.sample_code}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">
                                {smp.sample_name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {smp.sample_type} • Collected{" "}
                                {smp.collection_date}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-[11px] font-semibold text-slate-700">
                                {smp.experiments?.experiment_code}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {smp.storage_location}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                                  smp.sample_status
                                )}`}
                              >
                                {smp.sample_status}
                              </span>
                            </td>
                            {canManageSamples && (
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <select
                                    value={smp.sample_status}
                                    onChange={(e) =>
                                      handleUpdateSampleCustody(
                                        smp,
                                        e.target.value,
                                        smp.storage_location
                                      )
                                    }
                                    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                                  >
                                    <option value="Registered">Registered</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="In Process">In Process</option>
                                    <option value="Stored">Stored</option>
                                    <option value="Disposed">Disposed</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      const nextLoc = window.prompt(
                                        `Enter new storage node for ${smp.sample_code}:`,
                                        smp.storage_location
                                      );
                                      if (nextLoc && nextLoc.trim()) {
                                        handleUpdateSampleCustody(
                                          smp,
                                          smp.sample_status,
                                          nextLoc.trim()
                                        );
                                      }
                                    }}
                                    className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    Move Node
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 5: RESULTS & LABORATORY REPORTS
          ============================================================ */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    FAIR DATA &amp; PROVENANCE REPORTING
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Laboratory Results &amp; Summary Reports
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Generate printable laboratory summaries or export CSV
                    datasets for departmental review.
                  </p>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5 text-sky-700" />
                    Export CSV Dataset
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#132f57]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / Save PDF Report
                  </button>
                </div>
              </div>

              {/* Project Scope Filter */}
              <div className="no-print flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="text-xs font-bold text-slate-700">
                  Filter Report by Research Project:
                </label>
                <select
                  value={reportProjectFilter}
                  onChange={(e) => setReportProjectFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                >
                  <option value="ALL">All Faculty Projects</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={String(p.project_id)}>
                      {p.project_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Summary Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 border-b border-slate-200 pb-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    UNIVERSITY OF IBADAN • FACULTY OF SCIENCE
                  </p>
                  <h3 className="text-lg font-bold text-slate-900">
                    Consolidated Laboratory Experiment &amp; Result Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generated by {currentUser.full_name} (
                    {currentUser.role.toUpperCase()}) on{" "}
                    {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Exp ID</th>
                        <th className="px-3 py-2.5">Experiment Title</th>
                        <th className="px-3 py-2.5">Laboratory</th>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Samples</th>
                        <th className="px-3 py-2.5">Results</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {experiments
                        .filter(
                          (e) =>
                            reportProjectFilter === "ALL" ||
                            String(e.project_id) === reportProjectFilter
                        )
                        .map((exp) => (
                          <tr key={exp.experiment_id}>
                            <td className="px-3 py-2.5 font-mono font-bold text-sky-800">
                              {exp.experiment_code}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">
                              {exp.experiment_title}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {exp.laboratories?.laboratory_name}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {exp.experiment_date}
                            </td>
                            <td className="px-3 py-2.5">{exp.status}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {
                                samples.filter(
                                  (s) => s.experiment_id === exp.experiment_id
                                ).length
                              }
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {
                                results.filter(
                                  (r) => r.experiment_id === exp.experiment_id
                                ).length
                              }
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 6: GOVERNANCE — DEPARTMENTS, LABS & RBAC USER MANAGEMENT
          ============================================================ */}
          {activeTab === "governance" && (
            <div className="space-y-6">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  ADMINISTRATION &amp; ROLE-BASED ACCESS CONTROL (RBAC)
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Departments, Laboratories &amp; User Roles
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Administrative role assignment is restricted to Administrator
                  accounts (Test Case TC07).
                </p>
              </div>

              {!isAdmin && (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    You are signed in as{" "}
                    <strong>{currentUser.role.toUpperCase()}</strong>. Role
                    modification controls are locked to{" "}
                    <strong>Administrator</strong> accounts.
                  </span>
                </div>
              )}

              {/* User Accounts & Roles Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-sky-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Registered System Users ({profiles.length})
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> RLS +
                    RBAC Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Institutional Email</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Assigned Role</th>
                        <th className="px-4 py-3">Role Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profiles.map((p) => (
                        <tr key={p.user_id}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {p.full_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {p.email}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {p.departments?.department_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sky-800">
                              {p.role.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              disabled={!isAdmin}
                              value={p.role}
                              onChange={(e) =>
                                handleUpdateUserRole(
                                  p.user_id,
                                  e.target.value as Role
                                )
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="researcher">Researcher</option>
                              <option value="lab_assistant">
                                Laboratory Assistant
                              </option>
                              <option value="supervisor">Supervisor</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Faculty Departments & Laboratories Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {laboratories.map((lab) => (
                  <div
                    key={lab.laboratory_id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase text-sky-700">
                      Dept. of {lab.departments?.department_name}
                    </p>
                    <h4 className="mt-1 text-sm font-bold text-slate-900">
                      {lab.laboratory_name}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Location: {lab.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================
          MODALS (Project, Experiment, Sample, Equipment)
      ============================================================ */}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Create Research Project
              </h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Project Title *
                </label>
                <input
                  name="project_title"
                  required
                  placeholder="e.g. Phytochemical Screening of Medicinal Plants in SW Nigeria"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Assigned Supervisor
                </label>
                <select
                  name="supervisor_id"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {profiles
                    .filter((p) => ["supervisor", "admin"].includes(p.role))
                    .map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.departments?.department_name})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white"
              >
                Save Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Experiment Modal */}
      {showNewExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleCreateExperiment}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Log New Laboratory Experiment
              </h3>
              <button type="button" onClick={() => setShowNewExpModal(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Create a Research Project first before logging an experiment.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewExpModal(false);
                    setShowNewProjectModal(true);
                  }}
                  className="rounded-lg bg-[#0B1F3A] px-4 py-2 font-semibold text-white"
                >
                  + Create Research Project First
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Experiment Title *
                    </label>
                    <input
                      name="experiment_title"
                      required
                      placeholder="e.g. UV-Vis Spectrophotometric Assay of Heavy Metal Chelation"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Research Project *
                      </label>
                      <select
                        name="project_id"
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {projects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>
                            {p.project_title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Laboratory *
                      </label>
                      <select
                        name="laboratory_id"
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {laboratories.map((l) => (
                          <option key={l.laboratory_id} value={l.laboratory_id}>
                            {l.laboratory_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Experiment Date *
                      </label>
                      <input
                        type="date"
                        name="experiment_date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Allocate Instrument (Optional)
                      </label>
                      <select
                        name="equipment_id"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="">None selected</option>
                        {equipment.map((eq) => (
                          <option key={eq.equipment_id} value={eq.equipment_id}>
                            {eq.equipment_name} ({eq.availability_status})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Standard Protocol &amp; Procedure *
                    </label>
                    <textarea
                      name="procedure"
                      required
                      rows={3}
                      placeholder="Step-by-step experimental protocol, conditions, temperature, and controls..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Reagent Lots &amp; Batch Notes
                    </label>
                    <input
                      name="reagent_notes"
                      placeholder="e.g. Ethanol 99.8% (Lot #CH-402), Buffer pH 7.4"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewExpModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Submit Experiment Log
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* New Sample Modal */}
      {showNewSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleRegisterSample}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Register Laboratory Sample
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSampleModal(false)}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {experiments.length === 0 ? (
              <p className="text-xs text-slate-600">
                Log an experiment first so the sample can be linked to an
                experiment ID.
              </p>
            ) : (
              <>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Linked Experiment *
                    </label>
                    <select
                      name="experiment_id"
                      required
                      defaultValue={selectedExperiment?.experiment_id}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {experiments.map((e) => (
                        <option key={e.experiment_id} value={e.experiment_id}>
                          {e.experiment_code} — {e.experiment_title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Sample Label / Name *
                    </label>
                    <input
                      name="sample_name"
                      required
                      placeholder="e.g. Cassava Leaf Extract Isolate A"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Sample Type / Classification *
                    </label>
                    <input
                      name="sample_type"
                      required
                      placeholder="e.g. Botanical DNA Extract / Aqueous Solution"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Initial Storage Location *
                    </label>
                    <input
                      name="storage_location"
                      required
                      defaultValue="Freezer A - Rack 02"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      name="collection_date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewSampleModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Register &amp; Generate ID
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* New Equipment Modal */}
      {showNewEquipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleAddEquipment}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Register Laboratory Equipment
              </h3>
              <button
                type="button"
                onClick={() => setShowNewEquipModal(false)}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Instrument / Equipment Name *
                </label>
                <input
                  name="equipment_name"
                  required
                  placeholder="e.g. Shimadzu UV-1800 Spectrophotometer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Asset Tag
                </label>
                <input
                  name="asset_tag"
                  placeholder="e.g. UI-CHM-032"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Assigned Laboratory *
                </label>
                <select
                  name="laboratory_id"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {laboratories.map((l) => (
                    <option key={l.laboratory_id} value={l.laboratory_id}>
                      {l.laboratory_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Initial Status
                </label>
                <select
                  name="availability_status"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewEquipModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white"
              >
                Save Instrument
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}