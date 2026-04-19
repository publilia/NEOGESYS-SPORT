import { redirect } from "next/navigation";

// Course detail consolidated: inline modals on /corsi manage edit, iscritti and
// presenze. A richer per-course detail view can be re-introduced later.
export default function CorsoDetailRedirect() {
	redirect("/corsi");
}
