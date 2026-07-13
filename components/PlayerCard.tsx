import Link from "next/link";

export type PlayerCardData = {
  id: string;
  displayName: string;
  age?: number;
  city?: string;
  distanceKm?: number;
  bio?: string;

  sports: {
    name: string;
    level?: string;
    isPrimary?: boolean;
  }[];

  languages: string[];
  lookingFor: string[];

  availabilityLabel?: string;
  matchPercentage?: number;
  matchReasons?: string[];

  profileImageUrl?: string;
  verified?: boolean;
};

type PlayerCardProps = {
  player: PlayerCardData;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getSportIcon(sportName: string) {
  const normalizedName = sportName.toLowerCase();

  if (
    normalizedName.includes("football") ||
    normalizedName.includes("soccer")
  ) {
    return "⚽";
  }

  if (normalizedName.includes("basketball")) {
    return "🏀";
  }

  if (normalizedName.includes("tennis")) {
    return "🎾";
  }

  if (
    normalizedName.includes("badminton") ||
    normalizedName.includes("padel")
  ) {
    return "🏸";
  }

  if (
    normalizedName.includes("running") ||
    normalizedName.includes("jogging")
  ) {
    return "🏃";
  }

  if (
    normalizedName.includes("gym") ||
    normalizedName.includes("fitness") ||
    normalizedName.includes("weight")
  ) {
    return "🏋️";
  }

  if (normalizedName.includes("swimming")) {
    return "🏊";
  }

  if (
    normalizedName.includes("cycling") ||
    normalizedName.includes("biking")
  ) {
    return "🚴";
  }

  if (
    normalizedName.includes("hiking") ||
    normalizedName.includes("trekking")
  ) {
    return "🥾";
  }

  if (normalizedName.includes("yoga")) {
    return "🧘";
  }

  if (normalizedName.includes("boxing")) {
    return "🥊";
  }

  if (normalizedName.includes("dance")) {
    return "💃";
  }

  return "🏅";
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const primarySport =
    player.sports.find((sport) => sport.isPrimary) ?? player.sports[0];

  const visibleSports = player.sports.slice(0, 3);
  const remainingSportsCount = Math.max(player.sports.length - 3, 0);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-lime-400/40 hover:shadow-2xl hover:shadow-lime-400/5">
      {/* Profile image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
        {player.profileImageUrl ? (
          <img
            src={player.profileImageUrl}
            alt={`${player.displayName} profile`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-lime-400 text-4xl font-bold text-slate-950 shadow-xl shadow-lime-400/10">
              {getInitials(player.displayName)}
            </div>
          </div>
        )}

        {/* Match badge */}
        {typeof player.matchPercentage === "number" && (
          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 backdrop-blur">
            <p className="text-xs text-slate-400">Great match</p>

            <p className="mt-0.5 text-sm font-semibold text-lime-400">
              ✦ {player.matchPercentage}% compatible
            </p>
          </div>
        )}

        {/* Availability */}
        {player.availabilityLabel && (
          <div className="absolute bottom-4 left-4 rounded-full border border-lime-400/20 bg-slate-950/90 px-3 py-2 text-xs font-medium text-lime-300 backdrop-blur">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-lime-400" />
            {player.availabilityLabel}
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Name and location */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {player.displayName}
              {typeof player.age === "number" ? `, ${player.age}` : ""}
            </h2>

            {player.verified && (
              <span
                title="Verified profile"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-slate-950"
              >
                ✓
              </span>
            )}
          </div>

          {(player.city || typeof player.distanceKm === "number") && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              {player.city && <span>📍 {player.city}</span>}

              {player.city && typeof player.distanceKm === "number" && (
                <span className="text-slate-600">•</span>
              )}

              {typeof player.distanceKm === "number" && (
                <span>{player.distanceKm} km away</span>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {player.bio && (
          <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-400">
            {player.bio}
          </p>
        )}

        {/* Sports */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sports
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleSports.map((sport) => (
              <span
                key={sport.name}
                className={`rounded-full border px-3 py-2 text-sm ${
                  sport.isPrimary
                    ? "border-lime-400/40 bg-lime-400/10 text-lime-300"
                    : "border-white/10 bg-slate-950 text-slate-300"
                }`}
              >
                <span className="mr-2">
                  {getSportIcon(sport.name)}
                </span>

                {sport.name}
              </span>
            ))}

            {remainingSportsCount > 0 && (
              <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                +{remainingSportsCount}
              </span>
            )}
          </div>

          {primarySport?.level && (
            <p className="mt-3 text-sm text-slate-400">
              {primarySport.name} level:{" "}
              <span className="font-medium text-slate-200">
                {primarySport.level}
              </span>
            </p>
          )}
        </div>

        {/* Match reasons */}
        {player.matchReasons && player.matchReasons.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Why this match?
            </p>

            <div className="mt-3 space-y-2">
              {player.matchReasons.slice(0, 3).map((reason) => (
                <p
                  key={reason}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className="mt-0.5 text-lime-400">✓</span>
                  <span>{reason}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {player.languages.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Languages
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {player.languages.slice(0, 4).map((language) => (
                <span
                  key={language}
                  className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Looking for */}
        {player.lookingFor.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Open to
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {player.lookingFor.slice(0, 3).map((option) => (
                <span
                  key={option}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        <Link
          href={`/players/${player.id}`}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-lime-300"
        >
          View profile
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}