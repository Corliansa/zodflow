import * as examples from "@/utils/examples";
import { getInitialData } from "@/utils/zodHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.SCHEMA_PATH) {
    let fallback = false;
    let error = undefined;
    const schemas = await import(process.env.SCHEMA_PATH)
      .then((mod) => mod)
      .catch((e) => {
        console.error(
          `Failed to load schema path: ${process.env.SCHEMA_PATH}, falling back to examples`
        );
        fallback = true;
        error = e;
        return examples;
      });
    return new Response(
      JSON.stringify({
        // @ts-ignore
        ...getInitialData(schemas),
        fallback,
        error,
        schema: process.env.SCHEMA_PATH,
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify(getInitialData(examples)), {
    headers: { "content-type": "application/json" },
  });
}
