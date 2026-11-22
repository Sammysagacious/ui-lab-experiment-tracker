import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LabWorkbench from "@/components/LabWorkbench";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile + department
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, departments(department_name, faculty_name)")
    .eq("user_id", user.id)
    .single();

  const [
    { data: departments },
    { data: laboratories },
    { data: projects },
    { data: experiments },
    { data: samples },
    { data: sampleLogs },
    { data: results },
    { data: equipment },
    { data: expEquipment },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from("departments").select("*").order("department_name"),
    supabase
      .from("laboratories")
      .select("*, departments(department_name)")
      .order("laboratory_name"),
    supabase
      .from("research_projects")
      .select(
        "*, researcher:profiles!research_projects_researcher_id_fkey(full_name), supervisor:profiles!research_projects_supervisor_id_fkey(full_name)"
      )
      .order("project_id", { ascending: false }),
    supabase
      .from("experiments")
      .select(
        "*, research_projects(project_title), laboratories(laboratory_name, department_id, departments(department_name)), creator:profiles!experiments_created_by_fkey(full_name)"
      )
      .order("experiment_id", { ascending: false }),
    supabase
      .from("samples")
      .select("*, experiments(experiment_code, experiment_title)")
      .order("sample_id", { ascending: false }),
    supabase
      .from("sample_audit_logs")
      .select("*, profiles(full_name)")
      .order("log_id", { ascending: false })
      .limit(40),
    supabase
      .from("results")
      .select("*, profiles(full_name), experiments(experiment_code)")
      .order("result_id", { ascending: false }),
    supabase
      .from("equipment")
      .select("*, laboratories(laboratory_name, department_id, departments(department_name))")
      .order("equipment_id", { ascending: true }),
    supabase
      .from("experiment_equipment")
      .select("*, equipment(equipment_name, asset_tag)"),
    supabase
      .from("profiles")
      .select("*, departments(department_name)")
      .order("full_name"),
  ]);

  return (
    <LabWorkbench
      currentUser={{
        user_id: user.id,
        email: user.email || "",
        full_name: profile?.full_name || user.email?.split("@")[0] || "Lab User",
        role: profile?.role || "researcher",
        department_id: profile?.department_id || 1,
        department_name:
          profile?.departments?.department_name || "Faculty of Science",
      }}
      initialData={{
        departments: departments || [],
        laboratories: laboratories || [],
        projects: projects || [],
        experiments: experiments || [],
        samples: samples || [],
        sampleLogs: sampleLogs || [],
        results: results || [],
        equipment: equipment || [],
        expEquipment: expEquipment || [],
        profiles: allProfiles || [],
      }}
    />
  );
}