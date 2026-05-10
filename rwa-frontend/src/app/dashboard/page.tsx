"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import DashboardContent from "./DashboardContent";

export default function DashboardPage() {
  return(
    <AuthGuard>
        <DashboardContent />
    </AuthGuard>
  )
}