import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  workspaces,
  users,
  ideas,
  projects,
  projectMembers,
  tasks,
  bomItems,
  experiments,
  activities,
} from "./schema";

async function main() {
  console.log("Seeding R&D Command Center...");

  await db.insert(workspaces).values({
    name: "Team Garuthmaan R&D",
    timezone: "Asia/Kolkata",
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const [reddy] = await db
    .insert(users)
    .values({
      name: "Reddy",
      email: "reddy@rdcc.dev",
      passwordHash,
      role: "admin",
      skills: ["Arduino", "ESP32", "Python", "OpenCV", "Computer Vision", "Raspberry Pi", "Next.js", "AI/LLM"],
      avatarColor: "#2A5DD9",
      availability: 70,
    })
    .returning();

  const [naveen] = await db
    .insert(users)
    .values({
      name: "Naveen",
      email: "naveen@rdcc.dev",
      passwordHash,
      role: "member",
      skills: ["Arduino", "Electronics", "Embedded C"],
      avatarColor: "#1E8A5F",
      availability: 85,
    })
    .returning();

  const owner = reddy.id;
  const now = new Date();
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  // ---------------------------------------------------------------------
  // Projects — Reddy's real, active R&D projects
  // ---------------------------------------------------------------------

  const [laserHarp] = await db
    .insert(projects)
    .values({
      name: "Laser Harp",
      description: "Interactive laser-beam instrument — blocking a beam with a hand triggers that beam's MIDI note.",
      objective: "Build an 8–12 beam fan-style laser harp; each beam maps to a chromatic note and outputs MIDI to a laptop/synth when interrupted.",
      priority: "high",
      status: "in_development",
      startDate: daysAgo(20),
      deadline: daysFromNow(18),
      progress: 40,
      category: "Interactive Instrument",
      technologies: ["Arduino", "ESP32", "Laser modules", "MIDI"],
      ownerId: owner,
    })
    .returning();

  const [laserMapping] = await db
    .insert(projects)
    .values({
      name: "Laser Projection Mapping Rig",
      description: "Professional ILDA/DMX laser projector for projection mapping and event shows — shares its laser unit with the Laser Harp.",
      objective: "Stand up a LaserCube Ultra MK2 (10W) + Pangolin/Unity workflow for live laser mapping at Leap Interactive events.",
      priority: "medium",
      status: "planning",
      startDate: daysAgo(10),
      deadline: daysFromNow(45),
      progress: 15,
      category: "Event Tech",
      client: "Leap Interactive",
      technologies: ["LaserCube", "Pangolin/Unity", "DMX"],
      budget: 150000,
      ownerId: owner,
    })
    .returning();

  const [photobooth] = await db
    .insert(projects)
    .values({
      name: "F1 Face-Swap Photo Booth",
      description: "Captures a guest's face and composites it onto an F1 driver-suit template, then prints it.",
      objective: "Replace the ~60s Gemini API compositing step with a local diffusion pipeline (Pinokio + ComfyUI + InstantID) at 10–15s/photo with much better blending.",
      priority: "medium",
      status: "in_development",
      startDate: daysAgo(15),
      deadline: daysFromNow(10),
      progress: 45,
      category: "Event Tech",
      technologies: ["Python", "ComfyUI", "InstantID", "Diffusion models"],
      ownerId: owner,
    })
    .returning();

  const [roboticArm] = await db
    .insert(projects)
    .values({
      name: "Robotic Arm Plotter",
      description: "3D-printed 6-servo arm on a TTGO ESP32 that draws uploaded photos as line-art, controlled from an iPad-hosted website.",
      objective: "Wire and calibrate the servo arm, then build the photo-to-line-art web control flow so it works like a CNC plotter.",
      priority: "medium",
      status: "in_development",
      startDate: daysAgo(25),
      deadline: daysFromNow(30),
      progress: 35,
      category: "Hardware / CNC",
      technologies: ["ESP32 (TTGO)", "Servos", "Image processing"],
      ownerId: owner,
    })
    .returning();

  const [dennis] = await db
    .insert(projects)
    .values({
      name: "DENNIS — Front Desk Assistant",
      description: "Raspberry Pi + holographic-fan voice assistant that answers visitor questions at Leap Interactive's front desk.",
      objective: "Reliable terminal Q&A via Ollama + DuckDuckGo search first, then move output to the holographic fan and add an avatar with idle/listening/thinking/speaking states.",
      priority: "high",
      status: "in_development",
      startDate: daysAgo(18),
      deadline: daysFromNow(25),
      progress: 25,
      category: "AI Assistant",
      client: "Leap Interactive",
      technologies: ["Raspberry Pi", "Ollama", "DuckDuckGo Search"],
      ownerId: owner,
    })
    .returning();

  const [eventRadar] = await db
    .insert(projects)
    .values({
      name: "Event Radar",
      description: "Internal dashboard that auto-scrapes BookMyShow and allevents.in to scout events across India for lead generation.",
      objective: "Keep the GitHub Actions scrapers reliable and get the GitHub Pages dashboard fully live for the sales team.",
      priority: "medium",
      status: "testing",
      startDate: daysAgo(30),
      deadline: daysFromNow(7),
      progress: 60,
      category: "Internal Tools",
      client: "Leap Interactive",
      technologies: ["GitHub Actions", "Web scraping", "GitHub Pages"],
      ownerId: owner,
    })
    .returning();

  const [stickTracker] = await db
    .insert(projects)
    .values({
      name: "Green Stick / Drumstick Tracker",
      description: "OpenCV tracking of two green-marked drumsticks via webcam, extending into a webcam-based virtual drum kit.",
      objective: "Get stable, non-jittery bounding boxes on both sticks, then map tip position to on-screen drum pad zones that trigger sounds.",
      priority: "medium",
      status: "in_development",
      startDate: daysAgo(12),
      deadline: daysFromNow(20),
      progress: 30,
      category: "Computer Vision",
      technologies: ["Python", "OpenCV"],
      ownerId: owner,
    })
    .returning();

  const [reactionGame] = await db
    .insert(projects)
    .values({
      name: "Arduino Reaction Game",
      description: "Arduino Mega reflex/reaction game with 10 relay-driven LED + pushbutton channels.",
      objective: "Finalize timing and scoring logic, benchmarked against Naveen's version and a rival team's build.",
      priority: "medium",
      status: "in_development",
      startDate: daysAgo(22),
      deadline: daysFromNow(12),
      progress: 50,
      category: "Hardware Game",
      technologies: ["Arduino Mega", "Relays"],
      ownerId: owner,
    })
    .returning();

  const [tugOfWar] = await db
    .insert(projects)
    .values({
      name: "Tug of War — REDLINE",
      description: "Real-time multiplayer tug-of-war party game with a drag-strip visual theme, built for local WiFi play with no build step.",
      objective: "Finish visual polish and run a full LAN playtest ahead of the next event.",
      priority: "medium",
      status: "testing",
      startDate: daysAgo(35),
      deadline: daysFromNow(5),
      progress: 70,
      category: "Party Game",
      technologies: ["Python / aiohttp", "WebSocket", "React"],
      ownerId: owner,
    })
    .returning();

  const [torturLab] = await db
    .insert(projects)
    .values({
      name: "ML Model Torture Lab",
      description: "Automated diagnostics app that stress-tests ML models and reports failure modes.",
      objective: "Get async job processing solid and add frontend support for image datasets.",
      priority: "low",
      status: "in_development",
      startDate: daysAgo(28),
      deadline: daysFromNow(40),
      progress: 40,
      category: "Internal Tool",
      technologies: ["FastAPI", "Celery", "PostgreSQL"],
      ownerId: owner,
    })
    .returning();

  const allProjects = [
    laserHarp, laserMapping, photobooth, roboticArm, dennis,
    eventRadar, stickTracker, reactionGame, tugOfWar, torturLab,
  ];

  // Reddy owns/is on every project; Naveen is on the two hardware builds he
  // actually collaborates on.
  await db.insert(projectMembers).values([
    ...allProjects.map((p) => ({ projectId: p.id, userId: reddy.id, roleOnProject: "Owner" })),
    { projectId: reactionGame.id, userId: naveen.id, roleOnProject: "Collaborator" },
  ]);

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------

  await db.insert(tasks).values([
    // Laser Harp
    { projectId: laserHarp.id, title: "Source laser modules via local LaserCube supplier", status: "done", priority: "high", assigneeId: reddy.id },
    { projectId: laserHarp.id, title: "Decide beam-break detection: Kvant KB2D vs DIY webcam CV", status: "in_progress", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(3) },
    { projectId: laserHarp.id, title: "Build 1-beam prototype", status: "todo", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(7) },
    { projectId: laserHarp.id, title: "Map beam interrupt to MIDI note", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(10) },
    { projectId: laserHarp.id, title: "Expand to full 8–12 beam fan layout", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(16) },

    // Laser Mapping
    { projectId: laserMapping.id, title: "Finalize LaserCube Ultra MK2 order", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(5) },
    { projectId: laserMapping.id, title: "Evaluate Pangolin vs Unity control software", status: "todo", priority: "medium", assigneeId: reddy.id },

    // Photobooth
    { projectId: photobooth.id, title: "Set up Pinokio + ComfyUI + InstantID pipeline", status: "in_progress", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(2) },
    { projectId: photobooth.id, title: "Benchmark blend/lighting quality vs Gemini output", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(6) },
    { projectId: photobooth.id, title: "Wire up print output", status: "todo", priority: "low", assigneeId: reddy.id },

    // Robotic Arm
    { projectId: roboticArm.id, title: "Wire servos via direct GPIO", status: "in_progress", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(4) },
    { projectId: roboticArm.id, title: "Test existing servo control code", status: "todo", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(6) },
    { projectId: roboticArm.id, title: "Build iPad-facing control website", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(14) },
    { projectId: roboticArm.id, title: "Photo → line-art conversion pipeline", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(20) },

    // DENNIS
    { projectId: dennis.id, title: "Reliable terminal Q&A loop via Ollama", status: "in_progress", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(5) },
    { projectId: dennis.id, title: "Wire in DuckDuckGo live search", status: "todo", priority: "medium", assigneeId: reddy.id },
    { projectId: dennis.id, title: "Move output to holographic fan display", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(18) },
    { projectId: dennis.id, title: "Build idle/listening/thinking/speaking avatar", status: "todo", priority: "low", assigneeId: reddy.id },

    // Event Radar
    { projectId: eventRadar.id, title: "Recreate eventradar repo after nested-folder issue", status: "done", priority: "medium", assigneeId: reddy.id },
    { projectId: eventRadar.id, title: "BookMyShow scraper via GitHub Actions", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(2) },
    { projectId: eventRadar.id, title: "allevents.in scraper", status: "todo", priority: "medium", assigneeId: reddy.id },
    { projectId: eventRadar.id, title: "Finish GitHub Pages dashboard UI", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(6) },

    // Stick tracker
    { projectId: stickTracker.id, title: "Stabilize bounding boxes on both sticks", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(4) },
    { projectId: stickTracker.id, title: "Tighten box fit to stick shape", status: "todo", priority: "low", assigneeId: reddy.id },
    { projectId: stickTracker.id, title: "Detect stick tip endpoint", status: "todo", priority: "medium", assigneeId: reddy.id },
    { projectId: stickTracker.id, title: "Map tip position to drum pad zones + trigger sounds", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(19) },

    // Reaction game
    { projectId: reactionGame.id, title: "Wire 10-channel relay/LED/button matrix", status: "done", priority: "high", assigneeId: naveen.id },
    { projectId: reactionGame.id, title: "Compare timing code with Naveen's version", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(3) },
    { projectId: reactionGame.id, title: "Benchmark vs rival team's build", status: "todo", priority: "medium", assigneeId: naveen.id },
    { projectId: reactionGame.id, title: "Finalize scoring logic", status: "todo", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(10) },

    // Tug of war
    { projectId: tugOfWar.id, title: "Fix black-screen flash on role change", status: "done", priority: "high", assigneeId: reddy.id },
    { projectId: tugOfWar.id, title: "Rope physics + car animation polish", status: "done", priority: "medium", assigneeId: reddy.id },
    { projectId: tugOfWar.id, title: "Countdown lights sequence", status: "done", priority: "low", assigneeId: reddy.id },
    { projectId: tugOfWar.id, title: "Full LAN playtest", status: "todo", priority: "high", assigneeId: reddy.id, dueDate: daysFromNow(4) },

    // Torture lab
    { projectId: torturLab.id, title: "Async job processing via Celery", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(9) },
    { projectId: torturLab.id, title: "Frontend support for image datasets", status: "in_progress", priority: "medium", assigneeId: reddy.id, dueDate: daysFromNow(14) },
    { projectId: torturLab.id, title: "Diagnostics report generation", status: "todo", priority: "low", assigneeId: reddy.id },
  ]);

  // ---------------------------------------------------------------------
  // Ideas inbox — a couple of unconverted, in-flight ideas
  // ---------------------------------------------------------------------

  await db.insert(ideas).values([
    {
      title: "LiDAR room-scale interaction rig",
      description: "Use a low-cost LiDAR unit for room-scale presence/interaction tracking at events.",
      status: "evaluating",
      priority: "medium",
      category: "Interactive Technology",
      potentialTechnologies: ["LiDAR", "Python", "TouchDesigner"],
      estimatedComplexity: "high",
      creatorId: reddy.id,
    },
    {
      title: "Interactive floor projection",
      description: "Pressure or vision-tracked floor projection for booth activations.",
      status: "inbox",
      priority: "low",
      category: "Interactive Technology",
      potentialTechnologies: ["Projector", "Computer Vision"],
      estimatedComplexity: "medium",
      creatorId: reddy.id,
    },
  ]);

  // ---------------------------------------------------------------------
  // BOM + experiments (Phase 2 tables — seeded now so they're ready)
  // ---------------------------------------------------------------------

  await db.insert(bomItems).values([
    { projectId: laserHarp.id, component: "Laser module (medium-power)", category: "Optics", quantity: 10, unitCost: 800, status: "needed" },
    { projectId: laserHarp.id, component: "ESP32", category: "Electronics", quantity: 1, unitCost: 500, status: "available" },
    { projectId: roboticArm.id, component: "TTGO T-Display ESP32", category: "Electronics", quantity: 1, unitCost: 900, status: "available" },
    { projectId: roboticArm.id, component: "MG996R servo", category: "Actuators", quantity: 6, unitCost: 350, status: "available" },
  ]);

  await db.insert(experiments).values([
    {
      projectId: laserHarp.id,
      name: "Beam-interrupt detection latency test",
      hypothesis: "A webcam-based CV approach can detect beam interruption fast enough for real-time note triggering.",
      setup: "Single laser beam + webcam pointed along the beam path, OpenCV brightness-drop detection.",
      actualResult: "Pending prototype",
    },
    {
      projectId: stickTracker.id,
      name: "Bounding-box jitter reduction",
      hypothesis: "Adding a temporal smoothing filter removes frame-to-frame jitter on the green-marker bounding boxes.",
      setup: "Two green-marked sticks under webcam, HSV threshold + contour detection.",
      actualResult: "Pending",
    },
  ]);

  // ---------------------------------------------------------------------
  // Activity feed seed
  // ---------------------------------------------------------------------

  await db.insert(activities).values([
    { projectId: laserHarp.id, actorId: reddy.id, type: "project_created", message: "Laser Harp project created" },
    { projectId: eventRadar.id, actorId: reddy.id, type: "task_status_changed", message: "Recreated eventradar repo after nested-folder push issue" },
    { projectId: reactionGame.id, actorId: naveen.id, type: "task_status_changed", message: "Wired the 10-channel relay/LED/button matrix" },
    { projectId: tugOfWar.id, actorId: reddy.id, type: "task_status_changed", message: "Fixed black-screen flash on role change" },
  ]);

  console.log("Seed complete.");
  console.log("Login: reddy@rdcc.dev / password123  (admin)");
  console.log("Login: naveen@rdcc.dev / password123  (member)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
