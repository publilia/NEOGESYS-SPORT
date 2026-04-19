"use client";

import type {
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

interface FieldProps {
	label: string;
	hint?: string;
	error?: string;
	required?: boolean;
	children: ReactNode;
	span?: 1 | 2;
}

export function Field({ label, hint, error, required, children, span = 1 }: FieldProps) {
	return (
		<div style={{ gridColumn: span === 2 ? "span 2" : "span 1" }}>
			<label
				style={{
					display: "block",
					fontSize: "0.8125rem",
					fontWeight: 500,
					marginBottom: "0.375rem",
				}}
			>
				{label}
				{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
			</label>
			{children}
			{hint && !error && (
				<p
					style={{
						margin: "0.25rem 0 0",
						fontSize: "0.75rem",
						color: "hsl(var(--muted-foreground))",
					}}
				>
					{hint}
				</p>
			)}
			{error && (
				<p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#dc2626" }}>{error}</p>
			)}
		</div>
	);
}

export function FormGrid({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "1fr 1fr",
				gap: "1rem",
			}}
		>
			{children}
		</div>
	);
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className="input"
			{...props}
			style={{
				minHeight: "5rem",
				fontFamily: "inherit",
				resize: "vertical",
				...props.style,
			}}
		/>
	);
}

export function Select({ children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select className="select" {...rest}>
			{children}
		</select>
	);
}
