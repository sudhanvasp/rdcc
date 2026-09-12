import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  uniqueIndex,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const complexityEnum = pgEnum("complexity", ["low", "medium", "high"]);
export const ideaStatusEnum = pgEnum("idea_status", [
  "inbox",
  "evaluating",
  "approved",
  "rejected",
  "converted",
  "archived",
]);
export const projectDivisionEnum = pgEnum("project_division", ["client", "rnd"]);
export const projectStatusEnum = pgEnum("project_status", [
  "idea",
  "planning",
  "in_development",
  "testing",
  "blocked",
  "review",
  "completed",
  "archived",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
]);
export const bomStatusEnum = pgEnum("bom_status", [
  "available",
  "needed",
  "ordered",
  "arrived",
]);
export const linkTypeEnum = pgEnum("link_type", [
  "google_sheet",
  "google_drive",
  "github",
  "figma",
  "youtube",
  "other",
]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "won", "lost"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly", "one_time"]);
export const digestStatusEnum = pgEnum("digest_status", ["pending", "sent", "dismissed"]);
export const aiChannelEnum = pgEnum("ai_channel", ["web", "whatsapp"]);
export const aiRoleEnum = pgEnum("ai_role", ["user", "assistant", "system"]);
export const integrationTypeEnum = pgEnum("integration_type", [
  "whatsapp",
  "google_drive",
  "google_sheets",
  "slack",
  "github",
  "email",
  "calendar",
]);

// ---------------------------------------------------------------------------
// Workspace & Identity
// ---------------------------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull().default("R&D Command Center"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  logoUrl: text("logo_url"),
  lastWeeklyReportSentAt: timestamp("last_weekly_report_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  status: userStatusEnum("status").notNull().default("active"),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  avatarColor: text("avatar_color").notNull().default("#2F6FED"),
  availability: integer("availability").notNull().default(100),
  lastDigestSentAt: timestamp("last_digest_sent_at"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export const ideas = pgTable("ideas", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  status: ideaStatusEnum("status").notNull().default("inbox"),
  priority: priorityEnum("priority").notNull().default("medium"),
  category: text("category"),
  potentialTechnologies: text("potential_technologies")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  estimatedComplexity: complexityEnum("estimated_complexity")
    .notNull()
    .default("medium"),
  estimatedCost: doublePrecision("estimated_cost"),
  estimatedDurationDays: integer("estimated_duration_days"),
  notes: text("notes"),
  aiAnalysis: jsonb("ai_analysis"),
  source: text("source").notNull().default("web"),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id),
  assigneeId: text("assignee_id").references(() => users.id),
  convertedProjectId: text("converted_project_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = pgTable("projects", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: projectStatusEnum("status").notNull().default("planning"),
    division: projectDivisionEnum("division").notNull().default("rnd"),
  startDate: timestamp("start_date"),
  deadline: timestamp("deadline"),
  progress: integer("progress").notNull().default(0),
  budget: doublePrecision("budget"),
  client: text("client"),
  category: text("category"),
  technologies: text("technologies").array().notNull().default(sql`'{}'::text[]`),
  blockedReason: text("blocked_reason"),
  blockedSince: timestamp("blocked_since"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  ideaId: text("idea_id").references(() => ideas.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    roleOnProject: text("role_on_project"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_member_unique").on(t.projectId, t.userId)]
);

export const tags = pgTable("tags", {
  id: id(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#8A8F98"),
});

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] })]
);

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const tasks = pgTable("tasks", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => users.id),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("todo"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  estimateDays: doublePrecision("estimate_days"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  order: integer("order").notNull().default(0),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnId: text("depends_on_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("task_dependency_unique").on(t.taskId, t.dependsOnId)]
);

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------

export const comments = pgTable("comments", {
  id: id(),
  body: text("body").notNull(),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activities = pgTable(
  "activities",
  {
    id: id(),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").references(() => users.id),
    type: text("type").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_project_idx").on(t.projectId)]
);

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  isRead: boolean("is_read").notNull().default(false),
  relatedProjectId: text("related_project_id"),
  relatedTaskId: text("related_task_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// BOM & Inventory
// ---------------------------------------------------------------------------

export const bomItems = pgTable("bom_items", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  component: text("component").notNull(),
  category: text("category"),
  quantity: integer("quantity").notNull().default(1),
  unitCost: doublePrecision("unit_cost"),
  supplier: text("supplier"),
  partNumber: text("part_number"),
  status: bomStatusEnum("status").notNull().default("needed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  unitCost: doublePrecision("unit_cost"),
  supplier: text("supplier"),
  partNumber: text("part_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export const experiments = pgTable("experiments", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hypothesis: text("hypothesis"),
  objective: text("objective"),
  setup: text("setup"),
  variables: text("variables"),
  expectedResult: text("expected_result"),
  actualResult: text("actual_result"),
  conclusion: text("conclusion"),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Files, Notes, Links
// ---------------------------------------------------------------------------

export const files = pgTable("files", {
  id: id(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  ideaId: text("idea_id").references(() => ideas.id, { onDelete: "cascade" }),
  experimentId: text("experiment_id").references(() => experiments.id, {
    onDelete: "cascade",
  }),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: id(),
  title: text("title"),
  category: text("category"),
  body: text("body").notNull(),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  ideaId: text("idea_id").references(() => ideas.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const links = pgTable("links", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  type: linkTypeEnum("type").notNull().default("other"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  channel: aiChannelEnum("channel").notNull().default("web"),
  contextProjectId: text("context_project_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: id(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: aiRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Integrations & WhatsApp conversation state
// ---------------------------------------------------------------------------

export const integrations = pgTable("integrations", {
  id: id(),
  type: integrationTypeEnum("type").notNull().unique(),
  config: jsonb("config"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappConversationState = pgTable(
  "whatsapp_conversation_state",
  {
    id: id(),
    phoneNumber: text("phone_number").notNull(),
    userId: text("user_id").references(() => users.id),
    currentFlow: text("current_flow"),
    currentQuestion: text("current_question"),
    temporaryData: jsonb("temporary_data"),
    projectId: text("project_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [index("wa_phone_idx").on(t.phoneNumber)]
);

// ---------------------------------------------------------------------------
// Project versioning (V0.1, V0.2, V1.0...) — a lightweight changelog per
// project, per spec section 19.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Calendar events — lightweight standalone entries (not tied to a task or
// project) that anyone can quick-add by clicking a day on the Calendar.
// ---------------------------------------------------------------------------

export const calendarEvents = pgTable("calendar_events", {
  id: id(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectVersions = pgTable("project_versions", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  changes: text("changes"),
  code: text("code"),
  language: text("language"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// and sent BEFORE any project exists. Completely separate from the shared
// Inventory and from a project's own BOM tab. Can later convert into a
// real Project (which copies the line items into that project's BOM).
// ---------------------------------------------------------------------------

export const quotes = pgTable("quotes", {
  id: id(),
  title: text("title").notNull(),
  clientName: text("client_name"),
  status: quoteStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  convertedProjectId: text("converted_project_id"),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quoteItems = pgTable("quote_items", {
  id: id(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  partName: text("part_name").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  unitCost: doublePrecision("unit_cost").notNull().default(0),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Software/subscription spend tracking \u2014 pure manual entry, no external
// service or cost involved. Just a record of what you've already bought.
// ---------------------------------------------------------------------------

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  cost: doublePrecision("cost").notNull().default(0),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  renewalDate: timestamp("renewal_date"),
  vendor: text("vendor"),
  notes: text("notes"),
  purchasedById: text("purchased_by_id").references(() => users.id),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// of any project (e.g. gear for a demo day: RP5, cables, laptop...).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Pending digests — prepared but held for admin review before sending, per
// your request: nothing goes out automatically without a human clicking Send.
// ---------------------------------------------------------------------------

export const pendingDigests = pgTable("pending_digests", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  summary: text("summary").notNull(),
  status: digestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

// Event packing checklists — "pack before / return after" lists, independent
// of any project (e.g. gear for a demo day: RP5, cables, laptop...).
export const checklists = pgTable("checklists", {
  id: id(),
  title: text("title").notNull(),
  eventDate: timestamp("event_date"),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const checklistItems = pgTable("checklist_items", {
  id: id(),
  checklistId: text("checklist_id")
    .notNull()
    .references(() => checklists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  packed: boolean("packed").notNull().default(false),
  returned: boolean("returned").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const usersRelations = relations(users, ({ many }) => ({
  ideasCreated: many(ideas, { relationName: "idea_creator" }),
  projectsOwned: many(projects, { relationName: "project_owner" }),
  projectMemberships: many(projectMembers),
  tasksAssigned: many(tasks, { relationName: "task_assignee" }),
}));

export const ideasRelations = relations(ideas, ({ one }) => ({
  creator: one(users, {
    fields: [ideas.creatorId],
    references: [users.id],
    relationName: "idea_creator",
  }),
  assignee: one(users, {
    fields: [ideas.assigneeId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "project_owner",
  }),
  members: many(projectMembers),
  tasks: many(tasks),
  bomItems: many(bomItems),
  experiments: many(experiments),
  activities: many(activities),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "task_assignee",
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
  actor: one(users, {
    fields: [activities.actorId],
    references: [users.id],
  }),
}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
  project: one(projects, {
    fields: [bomItems.projectId],
    references: [projects.id],
  }),
}));
