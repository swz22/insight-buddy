import { z } from "zod";

// Meeting form schemas
export const meetingFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().max(1000, "Description is too long").nullable().optional(),
});

export const createMeetingSchema = meetingFormSchema.extend({
  audio_url: z.string().url("Invalid audio URL"),
  participants: z.array(z.string()).default([]),
  recorded_at: z.string().datetime().optional(),
});

export const updateMeetingSchema = meetingFormSchema.partial();

// Database schemas
export const meetingSummarySchema = z.object({
  overview: z.string(),
  key_points: z.array(z.string()),
  decisions: z.array(z.string()),
  next_steps: z.array(z.string()),
});

export const actionItemSchema = z.object({
  id: z.string(),
  task: z.string(),
  assignee: z.string().nullable(),
  due_date: z.string().datetime().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  completed: z.boolean(),
});

export const meetingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  audio_url: z.string().url().nullable(),
  transcript: z.string().nullable(),
  summary: meetingSummarySchema.nullable(),
  action_items: z.array(actionItemSchema).nullable(),
  participants: z.array(z.string()),
  duration: z.number().int().positive().nullable(),
  recorded_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// API response schemas
export const meetingsListSchema = z.array(meetingSchema);

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  status: z.number(),
  details: z.unknown().optional(),
});

// Type exports
export type MeetingFormData = z.infer<typeof meetingFormSchema>;
export type CreateMeetingData = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingData = z.infer<typeof updateMeetingSchema>;
export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
