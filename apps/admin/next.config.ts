import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	transpilePackages: ["@neogesys/ui", "@neogesys/schemas"],
	experimental: {
		optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
	},
};

export default nextConfig;
