import { redirect } from "next/navigation";

import { Landing } from "@/app/landing";
import { currentUser } from "@/server/auth";

/**
 * Raíz del sitio.
 *
 * Para quien ya entró, la raíz es su panel. Para quien no, es la página
 * pública: antes aquí vivía el formulario de acceso, que dejaba a un visitante
 * nuevo sin ninguna explicación de qué es VIGÍA. El acceso vive ahora en
 * /ingresar, que es donde se espera encontrarlo.
 */
export default async function Home() {
  if (await currentUser()) redirect("/panel");
  return <Landing />;
}
