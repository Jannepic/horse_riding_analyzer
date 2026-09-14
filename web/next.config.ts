/** Next.js configuration: Turbopack root pinned, generated agent rule files off. */

import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(),
  },

  agentRules: false,
};

export default nextConfig;
