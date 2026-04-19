import { redirect } from "next/navigation";

// Route consolidated: the "Nuovo Socio" flow is now an inline modal on /soci.
export default function NuovoSocioRedirect() {
	redirect("/soci");
}
