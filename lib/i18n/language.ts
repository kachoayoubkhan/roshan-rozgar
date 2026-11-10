import { z } from "zod";

export const languageSchema = z.enum(["roman", "ur", "en"]);
