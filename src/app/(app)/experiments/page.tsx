import { db } from "@/db";
import { experiments, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ExperimentsClient } from "@/components/experiments/ExperimentsClient";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const [rows, projectRows] = await Promise.all([
    db
      .select({
        id: experiments.id,
        name: experiments.name,
        hypothesis: experiments.hypothesis,
        actualResult: experiments.actualResult,
        conclusion: experiments.conclusion,
        date: experiments.date,
        projectId: experiments.projectId,
        projectName: projects.name,
      })
      .from(experiments)
      .leftJoin(projects, eq(experiments.projectId, projects.id))
      .orderBy(desc(experiments.date)),
    db.select({ id: projects.id, name: projects.name }).from(projects),
  ]);

  return <ExperimentsClient initialExperiments={rows} projects={projectRows} />;
}
