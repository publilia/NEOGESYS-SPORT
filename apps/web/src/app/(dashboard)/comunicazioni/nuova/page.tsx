import { redirect } from "next/navigation";

// Consolidated: "Nuova comunicazione" is now an inline modal on /comunicazioni.
export default function NuovaComunicazioneRedirect() {
	redirect("/comunicazioni");
}
