import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import type { PlayerCardData } from "@/components/PlayerCard";
import { requestId, serverLog } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CurrentProfile = {
  languages: string[] | null;
  looking_for: string[] | null;
};

type DiscoverProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  bio: string | null;
  city_name: string | null;
  country_name: string | null;
  languages: string[] | null;
  looking_for: string[] | null;
};

type DiscoverSport = {
  user_id: string;
  sport_name: string;
  level: string | null;
  is_primary: boolean | null;
};

type OperationName =
  | "authenticate"
  | "current_profile"
  | "current_user_sports"
  | "eligible_profile_ids"
  | "public_profiles"
  | "discover_profile_sports";

const DISCOVER_PROFILE_COLUMNS = `
  id,
  display_name,
  avatar_url,
  birth_date,
  bio,
  city_name,
  country_name,
  languages,
  looking_for
`;

function logFailure(
  correlationId: string,
  userId: string | null,
  operation: OperationName,
  errorCode: string,
  status: number,
) {
  if (process.env.NODE_ENV !== "development") return;

  serverLog("error", "discover_request_failed", {
    requestId: correlationId,
    userId,
    operation,
    supabaseCode: errorCode,
    status,
  });
}

function errorResponse(
  correlationId: string,
  userId: string | null,
  operation: OperationName,
  error: Pick<PostgrestError, "code"> | null,
  code: string,
  message: string,
) {
  logFailure(
    correlationId,
    userId,
    operation,
    error?.code || "UNKNOWN",
    500,
  );

  return NextResponse.json(
    { error: { code, message }, requestId: correlationId },
    { status: 500, headers: { "x-request-id": correlationId } },
  );
}

function eligibleProfileIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      ids.push(item);
      continue;
    }

    if (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string"
    ) {
      ids.push(item.id);
      continue;
    }

    return null;
  }

  return [...new Set(ids)];
}

function calculateAge(birthDate: string | null) {
  if (!birthDate) return undefined;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function calculateMatchPercentage(
  sharedSports: number,
  sharedLanguages: number,
  sharedGoals: number,
) {
  return Math.min(
    45 + sharedSports * 20 + sharedLanguages * 7 + sharedGoals * 8,
    98,
  );
}

function buildPlayers(
  profiles: DiscoverProfile[],
  sports: DiscoverSport[],
  currentProfile: CurrentProfile | null,
  currentSportNames: string[],
): PlayerCardData[] {
  const sportsByUser = new Map<string, DiscoverSport[]>();
  for (const sport of sports) {
    const existing = sportsByUser.get(sport.user_id) ?? [];
    existing.push(sport);
    sportsByUser.set(sport.user_id, existing);
  }

  const mySports = new Set(currentSportNames);
  const myLanguages = new Set(currentProfile?.languages ?? []);
  const myGoals = new Set(currentProfile?.looking_for ?? []);

  return profiles.map((profile) => {
    const playerSports = (sportsByUser.get(profile.id) ?? []).map((sport) => ({
      name: sport.sport_name,
      level: sport.level || "",
      isPrimary: sport.is_primary ?? false,
    }));
    const sharedSports = playerSports.filter((sport) =>
      mySports.has(sport.name),
    );
    const sharedLanguages = (profile.languages ?? []).filter((language) =>
      myLanguages.has(language),
    );
    const sharedGoals = (profile.looking_for ?? []).filter((goal) =>
      myGoals.has(goal),
    );
    const matchReasons: string[] = [];

    if (sharedSports[0]) {
      matchReasons.push(`You both enjoy ${sharedSports[0].name}`);
    }
    if (sharedLanguages[0]) {
      matchReasons.push(`You both speak ${sharedLanguages[0]}`);
    }
    if (sharedGoals[0]) {
      matchReasons.push(`You are both looking for ${sharedGoals[0]}`);
    }
    if (matchReasons.length === 0) {
      matchReasons.push("You may still be a good sports match");
    }

    return {
      id: profile.id,
      displayName: profile.display_name || "Unknown",
      profileImageUrl: profile.avatar_url || undefined,
      age: calculateAge(profile.birth_date),
      city: profile.city_name || "",
      country: profile.country_name || "",
      distanceKm: undefined,
      bio: profile.bio || "",
      sports: playerSports,
      languages: profile.languages || [],
      lookingFor: profile.looking_for || [],
      availabilityLabel: "",
      matchPercentage: calculateMatchPercentage(
        sharedSports.length,
        sharedLanguages.length,
        sharedGoals.length,
      ),
      matchReasons,
      verified: false,
    };
  });
}

export async function GET(request: Request) {
  const correlationId = requestId(request);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logFailure(
      correlationId,
      null,
      "authenticate",
      authError?.code || "UNAUTHENTICATED",
      401,
    );
    return NextResponse.json(
      {
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Sign in to discover athletes.",
        },
        requestId: correlationId,
      },
      { status: 401, headers: { "x-request-id": correlationId } },
    );
  }

  const [currentProfileResult, currentSportsResult, eligibilityResult, profilesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("languages, looking_for")
        .eq("id", user.id)
        .maybeSingle<CurrentProfile>(),
      supabase
        .from("user_sports")
        .select("sport_name")
        .eq("user_id", user.id),
      supabase.rpc("list_eligible_connection_profile_ids"),
      supabase
        .from("profiles")
        .select(DISCOVER_PROFILE_COLUMNS)
        .eq("profile_visibility", "public")
        .neq("id", user.id),
    ]);

  if (currentProfileResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "current_profile",
      currentProfileResult.error,
      "CURRENT_PROFILE_UNAVAILABLE",
      "Your matching preferences could not be loaded. Please try again.",
    );
  }
  if (currentSportsResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "current_user_sports",
      currentSportsResult.error,
      "CURRENT_SPORTS_UNAVAILABLE",
      "Your sports could not be loaded. Please try again.",
    );
  }
  if (profilesResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "public_profiles",
      profilesResult.error,
      "PUBLIC_PROFILES_UNAVAILABLE",
      "Athletes could not be loaded. Please try again.",
    );
  }

  let eligibleIds: string[] | null;
  let eligibilitySource: "rpc" | "public_profiles";

  if (eligibilityResult.error?.code === "PGRST202") {
    eligibilitySource = "public_profiles";
    eligibleIds = profilesResult.data.map((profile) => profile.id);

    if (process.env.NODE_ENV === "development") {
      serverLog("warn", "discover_rpc_unavailable", {
        requestId: correlationId,
        userId: user.id,
        operation: "eligible_profile_ids",
        supabaseCode: eligibilityResult.error.code,
        status: 200,
      });
    }
  } else if (eligibilityResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "eligible_profile_ids",
      eligibilityResult.error,
      "ELIGIBILITY_UNAVAILABLE",
      "Eligible athletes could not be loaded. Please try again.",
    );
  } else {
    eligibilitySource = "rpc";
    eligibleIds = eligibleProfileIds(eligibilityResult.data);
  }

  if (!eligibleIds) {
    return errorResponse(
      correlationId,
      user.id,
      "eligible_profile_ids",
      null,
      "ELIGIBILITY_RESPONSE_INVALID",
      "Eligible athletes returned an unsupported response. Please try again.",
    );
  }

  const eligibleIdSet = new Set(eligibleIds);
  const visibleProfiles = profilesResult.data.filter((profile) =>
    eligibleIdSet.has(profile.id),
  );
  const visibleProfileIds = visibleProfiles.map((profile) => profile.id);
  let sports: DiscoverSport[] = [];

  if (visibleProfileIds.length > 0) {
    const sportsResult = await supabase
      .from("user_sports")
      .select("user_id, sport_name, level, is_primary")
      .in("user_id", visibleProfileIds);

    if (sportsResult.error) {
      return errorResponse(
        correlationId,
        user.id,
        "discover_profile_sports",
        sportsResult.error,
        "ATHLETE_SPORTS_UNAVAILABLE",
        "Athlete sports could not be loaded. Please try again.",
      );
    }

    sports = sportsResult.data;
  }

  const players = buildPlayers(
    visibleProfiles,
    sports,
    currentProfileResult.data,
    currentSportsResult.data.map((sport) => sport.sport_name),
  );

  return NextResponse.json(
    {
      discover: {
        players,
        resultCount: players.length,
        eligibilitySource,
      },
      requestId: correlationId,
    },
    { headers: { "x-request-id": correlationId } },
  );
}
