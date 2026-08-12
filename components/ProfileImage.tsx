"use client";

import { useState } from "react";
import { profile } from "@/lib/data";

/**
 * Shows the user's photo from /public/profile.jpg. If that file hasn't been
 * added yet, it gracefully falls back to a navy "MM" monogram so the hero never
 * renders a broken image.
 */
export default function ProfileImage({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-navy-600 to-navy-800 text-6xl font-bold text-white ${className}`}
        aria-label={profile.name}
      >
        MM
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.photo}
      alt={profile.name}
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
