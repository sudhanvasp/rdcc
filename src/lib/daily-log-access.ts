// Who can see and change a Daily Log update.
//   public  -> everyone on the team can see it
//   private -> only the person who wrote it (not even an admin), and it is
//              left out of reports
export type LogVisibility = "public" | "private";
type Entry = { userId: string; visibility: LogVisibility };

export const canViewEntry = (entry: Entry, viewerId: string): boolean =>
  entry.visibility === "public" || entry.userId === viewerId;

// People can delete their own updates. An admin can also remove anyone's
// public update; nobody can touch someone else's private one.
export const canDeleteEntry = (entry: Entry, viewer: { id: string; role: string }): boolean =>
  entry.userId === viewer.id || (viewer.role === "admin" && entry.visibility === "public");

export const canChangeVisibility = (entry: Entry, viewerId: string): boolean => entry.userId === viewerId;