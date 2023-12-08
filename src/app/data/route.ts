import * as examples from "@/utils/examples";
import { getInitialData } from "@/utils/zodHelpers";
import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

export async function GET() {
  const schemaPath = process.env.SCHEMA_PATH;
  const exampleData = getInitialData(examples);
  if (schemaPath) {
    let fallback = false;
    let error = undefined;
    const schemas = await fs
      .readFile(schemaPath, { encoding: "utf-8" })
      .then((result) => JSON.parse(result))
      .catch((e) => {
        console.error(e);
        console.error(
          `Failed to load schema path: ${schemaPath}, falling back to examples`
        );
        fallback = true;
        error = e;
        return exampleData;
      });
    return new Response(
      JSON.stringify({
        ...schemas,
        fallback,
        error,
        schema: schemaPath,
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify(exampleData), {
    headers: { "content-type": "application/json" },
  });
}
