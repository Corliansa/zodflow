import { Zodflow } from "@/components/zodflow";
import { getLayoutedElements } from "@/utils/auto-layout";

export const dynamic = "force-dynamic";

export default async function App() {
  const initialData = await (
    await fetch(`http://localhost:${process.env.PORT ?? 3000}/data`)
  ).json();
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialData,
    { direction: "LR" }
  );
  return (
    <div className="w-screen h-screen">
      <Zodflow initialNodes={layoutedNodes} initialEdges={layoutedEdges} />
    </div>
  );
}
