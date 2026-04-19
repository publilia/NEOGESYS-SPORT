import { redirect } from "next/navigation";

// Consolidated: "Nuovo Evento" is handled inline via modal on /eventi.
export default function NuovoEventoRedirect() {
	redirect("/eventi");
}
