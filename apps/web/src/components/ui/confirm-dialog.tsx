"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";

interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "danger" | "warning" | "info";
	loading?: boolean;
}

export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title,
	message,
	confirmLabel = "Conferma",
	cancelLabel = "Annulla",
	variant = "danger",
	loading = false,
}: ConfirmDialogProps) {
	const iconColor = variant === "danger" ? "#dc2626" : "#d97706";

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			size="sm"
			footer={
				<>
					<button
						type="button"
						className="btn btn-outline btn-sm"
						onClick={onClose}
						disabled={loading}
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						className={
							variant === "danger"
								? "btn btn-destructive btn-sm"
								: "btn btn-primary btn-sm"
						}
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? "Attendere..." : confirmLabel}
					</button>
				</>
			}
		>
			<div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
				<AlertTriangle style={{ color: iconColor, flexShrink: 0 }} size={28} />
				<p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
			</div>
		</Modal>
	);
}
