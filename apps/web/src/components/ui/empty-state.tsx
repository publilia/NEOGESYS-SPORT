"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "4rem 2rem",
				textAlign: "center",
			}}
		>
			{Icon && (
				<Icon size={48} style={{ color: "hsl(var(--muted-foreground))", marginBottom: "1rem" }} />
			)}
			<h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{title}</h3>
			{description && (
				<p
					style={{
						fontSize: "0.875rem",
						color: "hsl(var(--muted-foreground))",
						margin: "0.5rem 0 1rem",
						maxWidth: "32rem",
					}}
				>
					{description}
				</p>
			)}
			{action}
		</div>
	);
}
