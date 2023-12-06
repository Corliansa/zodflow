"use client";

import React from "react";
import * as examples from "@/utils/examples";
import { Zodflow } from "@/components/zodflow";

export default function App() {
  return (
    <div className="w-screen h-screen">
      <Zodflow dict={examples} />
    </div>
  );
}
