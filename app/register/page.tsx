"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
    const supabase = createClient();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;

  setMessage("");
  setIsLoading(true);

  try {
    const formData = new FormData(form);

    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const birthDay = String(formData.get("birthDay") || "");
const birthMonth = String(formData.get("birthMonth") || "");
const birthYear = String(formData.get("birthYear") || "");

const birthDate = `${birthYear}-${birthMonth.padStart(
  2,
  "0"
)}-${birthDay.padStart(2, "0")}`;

    const birth = new Date(birthDate);
    const isValidDate =
  birth.getFullYear() === Number(birthYear) &&
  birth.getMonth() + 1 === Number(birthMonth) &&
  birth.getDate() === Number(birthDay);

if (!isValidDate) {
  setMessage("Please enter a valid date of birth.");
  return;
}
    const today = new Date();

    if (!birthDate || Number.isNaN(birth.getTime())) {
      setMessage("Please enter a valid date of birth.");
      return;
    }

    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      setMessage("You must be at least 18 years old.");
      return;
    }

    const { error } = await supabase.auth.signUp({

  email,

  password,

  options: {

    emailRedirectTo: `${window.location.origin}/login`,

    data: {

      first_name: firstName,

      last_name: lastName,

      birth_date: birthDate,

    },

  },

});

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Account created. Please check your email to confirm your account."
    );

    form.reset();
  } catch {
    setMessage("Something went wrong. Please try again.");
  } finally {
    setIsLoading(false);
  }
}
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Athlink
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Log in
          </Link>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-2 lg:items-start">
          <div className="pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
              Join Athlink
            </p>

            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Create your sports profile and find your people.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Find sports partners, teams and local activities based on your
              sport, level, location and availability.
            </p>

            <div className="mt-10 space-y-4 text-slate-300">
              <p>✓ Find compatible sports partners</p>
              <p>✓ Join or create local rooms</p>
              <p>✓ Connect safely with your community</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="mt-2 text-sm text-slate-400">
                Start with your basic information.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    First name
                  </label>

                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    placeholder="Your first name"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-lime-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Last name
                  </label>

                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    placeholder="Your last name"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-lime-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-lime-400"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Password
                </label>

                <div className="relative">
  <input
    id="password"
    name="password"
    type={showPassword ? "text" : "password"}
    required
    minLength={8}
    placeholder="At least 8 characters"
    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 pr-20 outline-none transition placeholder:text-slate-600 focus:border-lime-400"
  />

  <button
    type="button"
    onClick={() => setShowPassword((current) => !current)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-lime-400 hover:text-lime-300"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>
              </div>

              <div>
  <label className="mb-2 block text-sm font-medium text-slate-200">
    Date of birth
  </label>

  <div className="grid grid-cols-3 gap-3">
    <select
      name="birthDay"
      required
      defaultValue=""
      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-lime-400"
    >
      <option value="" disabled>
        Day
      </option>

      {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
        <option key={day} value={day}>
          {day}
        </option>
      ))}
    </select>

    <select
      name="birthMonth"
      required
      defaultValue=""
      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-lime-400"
    >
      <option value="" disabled>
        Month
      </option>

      {[
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map((month, index) => (
        <option key={month} value={index + 1}>
          {month}
        </option>
      ))}
    </select>

    <select
      name="birthYear"
      required
      defaultValue=""
      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-lime-400"
    >
      <option value="" disabled>
        Year
      </option>

      {Array.from(
        { length: 83 },
        (_, index) => new Date().getFullYear() - 18 - index
      ).map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>

  <p className="mt-2 text-xs text-slate-500">
    You must be at least 18 years old.
  </p>
</div>

              <div className="space-y-4 border-t border-white/10 pt-5">
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />

                  <span>
                    I confirm that I am at least 18 years old.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />

                  <span>
                    I have read and accept the{" "}
                    <Link
                      href="/terms"
                      className="font-medium text-lime-400 hover:text-lime-300"
                    >
                      Terms of Use
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />

                  <span>
                    I have read the{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-lime-400 hover:text-lime-300"
                    >
                      Privacy Policy
                    </Link>{" "}
                    and understand how my personal data is used.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />

                  <span>
                    I agree to follow the{" "}
                    <Link
                      href="/community-guidelines"
                      className="font-medium text-lime-400 hover:text-lime-300"
                    >
                      Community Guidelines
                    </Link>{" "}
                    and Safety Rules.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-400">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-lime-400"
                  />

                  <span>
                    I would like to receive Athlink news and offers by email.
                  </span>
                </label>
              </div>
{message && (
  <p
    className={`rounded-xl px-4 py-3 text-sm ${
      message.startsWith("Account created")
        ? "bg-lime-400/10 text-lime-300"
        : "bg-red-500/10 text-red-300"
    }`}
  >
    {message}
  </p>
)}
              <button
  type="submit"
  disabled={isLoading}
  className="w-full rounded-xl bg-lime-400 px-5 py-4 font-semibold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
>
  {isLoading ? "Creating account..." : "Create my account"}
</button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-lime-400 hover:text-lime-300"
              >
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
