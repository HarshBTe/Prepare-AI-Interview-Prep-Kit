import { interviewKitSchema } from "./kitSchema";
import type { InterviewKit } from "../../types/kit";

export function validateInterviewKit(
  kit: unknown
): InterviewKit {
  return interviewKitSchema.parse(kit) as InterviewKit;
}