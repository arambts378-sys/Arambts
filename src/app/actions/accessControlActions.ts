"use server";

import { accessControlService } from "@/services/accessControl";
import { revalidatePath } from "next/cache";

export async function createAccessZoneAction(eventId: string, data: any) {
  const result = await accessControlService.createAccessZone(eventId, data);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
  return result;
}

export async function deactivateZoneAction(zoneId: string, eventId: string) {
  await accessControlService.deactivateAccessZone(zoneId);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
}

export async function createRuleAction(zoneId: string, eventId: string, type: string, value: any) {
  await accessControlService.createAccessRule(zoneId, type, value);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
}

export async function assignAttendeeAction(zoneId: string, eventId: string, registrationId: string) {
  await accessControlService.assignAttendeeToZone(zoneId, registrationId);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
}
