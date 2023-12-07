import { Zodflow } from "@/components/zodflow";
import { getLayoutedElements } from "@/utils/auto-layout";
import { getInitialData } from "@/utils/zodHelpers";

export default async function App() {
  const schemas = process.env.NEXT_PUBLIC_SCHEMA_PATH
    ? await import(process.env.NEXT_PUBLIC_SCHEMA_PATH)
    : await import("@/utils/examples");
  const { nodes, edges } = getInitialData(schemas);
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    nodes,
    edges,
    { direction: "LR" }
  );
  return (
    <div className="w-screen h-screen">
      <Zodflow initialNodes={layoutedNodes} initialEdges={layoutedEdges} />
    </div>
  );
}
