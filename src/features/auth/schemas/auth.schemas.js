import { z } from "zod";
import { SIGNUP_ROLES } from "@/config/roles";

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  rememberDevice: z.boolean().optional(),
});

const strongPassword = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

export const signupSchema = z
  .object({
    role: z.enum(SIGNUP_ROLES, { message: "Choose your role" }),
    fullName: z.string().trim().min(2, "Enter your full name"),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{8,15}$/, "Enter a valid phone number"),
    licenseNumber: z
      .string()
      .trim()
      .min(4, "Enter your registration / license number")
      .max(30, "License number is too long"),
    department: z.string().min(1, "Choose a department"),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptTerms: z.literal(true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const DEPARTMENTS = [
  "Cardiology",
  "Emergency",
  "General Medicine",
  "ICU",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Radiology",
  "Surgery",
];
