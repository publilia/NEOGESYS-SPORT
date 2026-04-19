"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
	sm: "480px",
	md: "640px",
	lg: "900px",
	xl: "1200px",
};

export function Modal({
	open,
	onClose,
	title,
	subtitle,
	children,
	footer,
	size = "md",
}: ModalProps) {
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", handler);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="modal-backdrop"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabIndex={-1}
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.5)",
				zIndex: 50,
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
				padding: "4rem 1rem 1rem",
				overflowY: "auto",
			}}
		>
			<div
				className="card"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="document"
				style={{
					width: "100%",
					maxWidth: sizeMap[size],
					background: "hsl(var(--card))",
					boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
					margin: "auto",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: "1rem",
						padding: "1.25rem 1.5rem",
						borderBottom: "1px solid hsl(var(--border))",
					}}
				>
					<div>
						<h2 id="modal-title" style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
							{title}
						</h2>
						{subtitle && (
							<p
								style={{
									fontSize: "0.875rem",
									color: "hsl(var(--muted-foreground))",
									margin: "0.25rem 0 0",
								}}
							>
								{subtitle}
							</p>
						)}
					</div>
					<button type="button" className="table-action" onClick={onClose} aria-label="Chiudi">
						<X className="icon" />
					</button>
				</div>
				<div style={{ padding: "1.5rem" }}>{children}</div>
				{footer && (
					<div
						style={{
							padding: "1rem 1.5rem",
							borderTop: "1px solid hsl(var(--border))",
							display: "flex",
							justifyContent: "flex-end",
							gap: "0.5rem",
						}}
					>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
