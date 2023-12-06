"use client";

import { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnConnect,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import * as nodeTypes from "./custom-nodes";
import Dagre, { Label } from "@dagrejs/dagre";
import { Dictionary, getInitialData } from "@/utils/zodHelpers";

import "reactflow/dist/style.css";

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: { direction: "TB" | "LR" }
) => {
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) => g.setNode(node.id, node as Label));

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id);
      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

export const Zodflow: React.FC<{
  dict: Dictionary;
}> = ({ dict }) => {
  const { nodes: initialNodes, edges: initialEdges } = getInitialData(dict);
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges,
    {
      direction: "LR",
    }
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      <Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
};
